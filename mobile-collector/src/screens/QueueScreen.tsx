import React, { useCallback, useContext, useMemo, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { AuthContext } from '../navigation/AppNavigator';
import { THEME } from '../config/api';
import apiService, { QueueEntry } from '../services/api';
import { ServicePoint } from '../config/roleTabs';
import { extractApiError } from '../utils/apiErrorUtils';
import {
  getClinicalSnapshot,
  getClinicalSnapshotTimestamp,
  getPendingConsultations,
} from '../services/offlineStore';
import { refreshClinicalSnapshot } from '../services/syncService';

interface Props {
  servicePoint: ServicePoint;
  title: string;
}

const STATUS_LABEL: Record<string, string> = {
  waiting: 'Waiting',
  called: 'Called',
  serving: 'Serving',
  completed: 'Done',
  cancelled: 'Cancelled',
};

function nextStatus(current: string, servicePoint: ServicePoint): string | null {
  if (servicePoint === 'cashier') {
    if (current === 'waiting' || current === 'called' || current === 'serving') return 'completed';
    return null;
  }
  if (current === 'waiting') return 'called';
  if (current === 'called') return 'serving';
  if (current === 'serving') return 'completed';
  return null;
}

const QueueScreen: React.FC<Props> = ({ servicePoint, title }) => {
  const auth = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const [rows, setRows] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const [snapshotTs, setSnapshotTs] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const loadFromCache = async () => {
    const snapshot = await getClinicalSnapshot();
    const ts = await getClinicalSnapshotTimestamp();
    setSnapshotTs(ts);
    if (snapshot?.queue?.length) {
      setRows(
        snapshot.queue.map((q) => ({
          queueId: q.queueId,
          patientId: q.patientId,
          ticketNumber: q.ticketNumber,
          servicePoint: q.servicePoint,
          status: q.status,
          priority: q.priority,
          arrivalTime: q.arrivalTime,
          patientFirstName: q.patientFirstName,
          patientLastName: q.patientLastName,
          patientPhone: q.patientPhone,
          patientNumber: q.patientNumber,
          hasPendingBills: Boolean(q.hasPendingBills),
        }))
      );
      return true;
    }
    return false;
  };

  const load = async () => {
    const pending = await getPendingConsultations();
    setPendingCount(pending.filter((p) => p.syncStatus !== 'synced').length);
    try {
      const data = await apiService.listQueue({ servicePoint });
      setRows(data);
      setOffline(false);
      await refreshClinicalSnapshot(servicePoint);
      const ts = await getClinicalSnapshotTimestamp();
      setSnapshotTs(ts);
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
        .catch((e) => Alert.alert('Queue', extractApiError(e)))
        .finally(() => setLoading(false));
    }, [servicePoint])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      Alert.alert('Queue', extractApiError(e));
    } finally {
      setRefreshing(false);
    }
  };

  const openConsultation = (entry: QueueEntry) => {
    const name = [entry.patientFirstName, entry.patientLastName].filter(Boolean).join(' ') || 'Patient';
    navigation.navigate('Consultation', {
      queueId: entry.queueId,
      patientId: entry.patientId,
      patientName: name,
      patientNumber: entry.patientNumber,
      ticketNumber: entry.ticketNumber,
    });
  };

  const advance = async (entry: QueueEntry) => {
    const current = String(entry.status || 'waiting');
    const next = nextStatus(current, servicePoint);
    if (!next) return;

    if (servicePoint === 'consultation' && next === 'serving') {
      setBusyId(entry.queueId);
      try {
        if (!offline) {
          await apiService.updateQueueStatus(entry.queueId, 'serving');
        }
        openConsultation(entry);
        await load();
      } catch (e) {
        if (offline) {
          openConsultation(entry);
        } else {
          Alert.alert('Update failed', extractApiError(e));
        }
      } finally {
        setBusyId(null);
      }
      return;
    }

    if (servicePoint === 'consultation' && current === 'serving') {
      openConsultation(entry);
      return;
    }

    setBusyId(entry.queueId);
    try {
      if (servicePoint === 'cashier' && next === 'completed') {
        await apiService.completeCashierQueue(entry.patientId);
      } else {
        await apiService.updateQueueStatus(entry.queueId, next);
      }
      await load();
    } catch (e) {
      Alert.alert('Update failed', extractApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const order = ['serving', 'called', 'waiting', 'completed', 'cancelled'];
        const ai = order.indexOf(String(a.status));
        const bi = order.indexOf(String(b.status));
        if (ai !== bi) return ai - bi;
        return String(a.arrivalTime || '').localeCompare(String(b.arrivalTime || ''));
      }),
    [rows]
  );

  const subtitle = offline
    ? `Offline — cached ${snapshotTs ? new Date(snapshotTs).toLocaleTimeString() : 'data'}`
    : `${servicePoint} queue${pendingCount ? ` · ${pendingCount} pending sync` : ''}`;

  return (
    <View style={styles.container}>
      <ScreenHeader title={title} subtitle={subtitle} onLogout={() => void auth?.logout()} />
      {offline ? (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>HMIS unreachable — showing last cached queue</Text>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.queueId)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
          contentContainerStyle={sorted.length ? styles.list : styles.emptyWrap}
          ListEmptyComponent={
            <Text style={styles.empty}>No patients in this queue.</Text>
          }
          renderItem={({ item }) => {
            const name = [item.patientFirstName, item.patientLastName].filter(Boolean).join(' ') || 'Patient';
            const status = String(item.status || 'waiting');
            const action = nextStatus(status, servicePoint);
            const isConsultation = servicePoint === 'consultation';
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{name}</Text>
                    <Text style={styles.meta}>
                      {item.patientNumber || '—'}
                      {item.ticketNumber ? ` · Ticket ${item.ticketNumber}` : ''}
                    </Text>
                    {item.patientPhone ? <Text style={styles.meta}>{item.patientPhone}</Text> : null}
                  </View>
                  <View style={[styles.badge, status === 'serving' && styles.badgeActive]}>
                    <Text style={styles.badgeText}>{STATUS_LABEL[status] || status}</Text>
                  </View>
                </View>
                {servicePoint === 'cashier' && item.hasPendingBills ? (
                  <Text style={styles.warn}>Pending bills</Text>
                ) : null}
                {isConsultation && status === 'serving' ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openConsultation(item)}>
                    <Text style={styles.actionText}>Continue consultation</Text>
                  </TouchableOpacity>
                ) : null}
                {action && status !== 'completed' && status !== 'cancelled' ? (
                  <TouchableOpacity
                    style={[styles.actionBtn, isConsultation && action === 'serving' && styles.actionBtnAccent]}
                    disabled={busyId === item.queueId}
                    onPress={() => void advance(item)}
                  >
                    {busyId === item.queueId ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.actionText}>
                        {servicePoint === 'cashier'
                          ? 'Complete if paid'
                          : action === 'called'
                            ? 'Call patient'
                            : action === 'serving'
                              ? 'Start serving'
                              : 'Complete'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: THEME.text },
  meta: { fontSize: 12, color: THEME.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeActive: { backgroundColor: '#C8E6C9' },
  badgeText: { fontSize: 11, fontWeight: '700', color: THEME.primaryDark },
  warn: { marginTop: 8, fontSize: 12, color: THEME.warning, fontWeight: '600' },
  actionBtn: {
    marginTop: 10,
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnAccent: { backgroundColor: THEME.accent },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default QueueScreen;
