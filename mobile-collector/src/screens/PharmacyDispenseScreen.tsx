import React, { useCallback, useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { AuthContext } from '../navigation/AppNavigator';
import { THEME } from '../config/api';
import apiService, { ReadyToDispenseItem } from '../services/api';
import { extractApiError } from '../utils/apiErrorUtils';
import {
  getClinicalSnapshot,
  getClinicalSnapshotTimestamp,
} from '../services/offlineStore';
import { refreshClinicalSnapshot } from '../services/syncService';

const PharmacyDispenseScreen: React.FC = () => {
  const auth = useContext(AuthContext);
  const [rows, setRows] = useState<ReadyToDispenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const [snapshotTs, setSnapshotTs] = useState<string | null>(null);

  const loadFromCache = async (): Promise<boolean> => {
    const snapshot = await getClinicalSnapshot();
    const ts = await getClinicalSnapshotTimestamp();
    setSnapshotTs(ts);
    const cached = snapshot?.readyToDispense || [];
    if (cached.length) {
      setRows(
        cached.map((item) => ({
          itemId: item.itemId,
          prescriptionId: item.prescriptionId,
          prescriptionNumber: item.prescriptionNumber,
          medicationName: item.medicationName,
          prescribedQuantity: item.prescribedQuantity,
          dosage: item.dosage,
          frequency: item.frequency,
          patientId: item.patientId,
          patientFirstName: item.patientFirstName,
          patientLastName: item.patientLastName,
          patientNumber: item.patientNumber,
          drugInventoryId: item.drugInventoryId,
        }))
      );
      return true;
    }
    return false;
  };

  const load = async () => {
    try {
      const data = await apiService.listReadyForDispensing();
      setRows(data);
      setOffline(false);
      await refreshClinicalSnapshot('pharmacy');
      setSnapshotTs(await getClinicalSnapshotTimestamp());
    } catch {
      const cached = await loadFromCache();
      setOffline(true);
      if (!cached) setRows([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load()
        .catch((e) => Alert.alert('Pharmacy', extractApiError(e)))
        .finally(() => setLoading(false));
    }, [])
  );

  const dispense = async (item: ReadyToDispenseItem) => {
    if (offline) {
      Alert.alert(
        'Offline',
        'Dispensing requires HMIS connectivity so stock and payment status stay accurate. Pull to refresh when the network is back.'
      );
      return;
    }
    const qty = Number(item.prescribedQuantity || 1);
    Alert.alert(
      'Dispense medication',
      `${item.medicationName}\nQuantity: ${qty}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dispense',
          onPress: () => {
            void (async () => {
              setBusyId(item.itemId);
              try {
                await apiService.dispensePrescriptionItem({
                  prescriptionItemId: item.itemId,
                  quantityDispensed: qty,
                  drugInventoryId: item.drugInventoryId,
                });
                await load();
                Alert.alert('Dispensed', `${item.medicationName} recorded.`);
              } catch (e) {
                Alert.alert('Dispense failed', extractApiError(e));
              } finally {
                setBusyId(null);
              }
            })();
          },
        },
      ]
    );
  };

  const subtitle = offline
    ? `Offline view — cached ${snapshotTs ? new Date(snapshotTs).toLocaleTimeString() : 'list'}`
    : 'Paid prescriptions ready for pickup';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Dispense" subtitle={subtitle} onLogout={() => void auth?.logout()} />
      {offline ? (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>
            HMIS unreachable — showing last cached dispense list (read-only)
          </Text>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.itemId)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load()
                  .catch((e) => Alert.alert('Pharmacy', extractApiError(e)))
                  .finally(() => setRefreshing(false));
              }}
            />
          }
          contentContainerStyle={rows.length ? styles.list : styles.emptyWrap}
          ListEmptyComponent={<Text style={styles.empty}>No paid items waiting to dispense.</Text>}
          renderItem={({ item }) => {
            const name = [item.patientFirstName, item.patientLastName].filter(Boolean).join(' ');
            return (
              <View style={styles.card}>
                <Text style={styles.med}>{item.medicationName}</Text>
                <Text style={styles.meta}>
                  {name || 'Patient'}
                  {item.patientNumber ? ` · ${item.patientNumber}` : ''}
                </Text>
                <Text style={styles.meta}>
                  Qty {item.prescribedQuantity || 1}
                  {item.dosage ? ` · ${item.dosage}` : ''}
                  {item.frequency ? ` · ${item.frequency}` : ''}
                </Text>
                {item.prescriptionNumber ? (
                  <Text style={styles.meta}>Rx {item.prescriptionNumber}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.actionBtn, offline && styles.actionBtnDisabled]}
                  disabled={busyId === item.itemId}
                  onPress={() => void dispense(item)}
                >
                  {busyId === item.itemId ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.actionText}>{offline ? 'View only (offline)' : 'Dispense'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  offlineBar: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 8 },
  offlineText: { fontSize: 12, color: THEME.warning, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 24 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  empty: { textAlign: 'center', color: THEME.textMuted },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  med: { fontSize: 16, fontWeight: '700', color: THEME.text },
  meta: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  actionBtn: {
    marginTop: 10,
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnDisabled: { backgroundColor: '#9E9E9E' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default PharmacyDispenseScreen;
