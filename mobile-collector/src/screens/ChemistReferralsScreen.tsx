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
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { AuthContext } from '../navigation/AppNavigator';
import { APP_DISPLAY_NAME, THEME } from '../config/api';
import apiService from '../services/api';
import {
  findPendingChemistAction,
  getCachedChemistDrugs,
  getCachedReferrals,
  getPendingChemistActions,
  makeLocalId,
  patchCachedReferralItem,
  savePendingChemistAction,
  setCachedReferrals,
} from '../services/offlineStore';
import { syncPendingChemistActions } from '../services/syncService';
import { extractApiError, shouldQueueOffline } from '../utils/apiErrorUtils';
import { PendingChemistItemAction } from '../types/dataCollection';

const ChemistReferralsScreen: React.FC = () => {
  const auth = useContext(AuthContext);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [pendingByItem, setPendingByItem] = useState<Record<string, PendingChemistItemAction>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [chemistScope, setChemistScope] = useState<any>(null);

  const refreshPendingMap = async () => {
    const pending = await getPendingChemistActions();
    const map: Record<string, PendingChemistItemAction> = {};
    for (const p of pending) {
      map[String(p.referralItemId)] = p;
    }
    setPendingByItem(map);
  };

  const load = async () => {
    const cached = await getCachedReferrals();
    if (cached.length) setReferrals(cached);
    await refreshPendingMap();
    try {
      try {
        const me = await apiService.getChemistMe();
        setChemistScope(me);
      } catch {
        setChemistScope(null);
      }
      const rows = await apiService.listExternalReferrals(
        search.trim() ? { search: search.trim() } : {}
      );
      setReferrals(rows);
      await setCachedReferrals(rows);
    } catch {
      // offline: keep cache
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [])
  );

  const queueOrDispense = async (
    referral: any,
    item: any,
    status: 'picked_up' | 'not_available',
    quantityPicked?: number
  ) => {
    const itemId = Number(item.referralItemId);
    const existing = await findPendingChemistAction(itemId);
    if (existing?.syncStatus === 'pending') {
      Alert.alert('Already queued', 'This item is waiting to sync. Pull to refresh when online.');
      return;
    }

    const remaining = Math.max(
      0,
      Number(item.quantityPrescribed || item.quantityReferred || item.quantity || 0) -
        Number(item.quantityPicked || 0)
    );
    const qty =
      status === 'picked_up'
        ? quantityPicked != null
          ? quantityPicked
          : remaining > 0
            ? remaining
            : 1
        : undefined;

    if (status === 'picked_up') {
      const drugs = await getCachedChemistDrugs();
      if (drugs.length) {
        const medId = item.medicationId != null ? Number(item.medicationId) : null;
        const name = String(item.medicationName || '').toLowerCase().trim();
        const match = drugs.find((d) => {
          if (medId && Number(d.medicationId) === medId) return true;
          return String(d.medicationName || '').toLowerCase().trim() === name;
        });
        if (match && Number(match.quantityAvailable) < Number(qty)) {
          Alert.alert(
            'Insufficient stock (cached)',
            `Cached availability is ${match.quantityAvailable}. Sync when online for a live check, or mark Not available.`
          );
          return;
        }
      }
    }

    const key = `${referral.referralId}-${item.referralItemId}`;
    setBusyKey(key);
    const clientActionId = makeLocalId();
    const notes =
      status === 'picked_up'
        ? `Dispensed via ${APP_DISPLAY_NAME}`
        : `Marked not available via ${APP_DISPLAY_NAME}`;

    const optimisticPatch =
      status === 'picked_up'
        ? {
            status: 'picked_up',
            quantityPicked: Number(item.quantityPicked || 0) + Number(qty || 0),
            _pendingSync: true,
          }
        : { status, _pendingSync: true };

    try {
      await apiService.updateReferralItem(
        referral.referralId,
        item.referralItemId,
        {
          status,
          quantityPicked: qty,
          chemistNotes: notes,
          clientActionId,
        },
        clientActionId
      );
      Alert.alert(
        status === 'picked_up' ? 'Dispensed' : 'Updated',
        `${item.medicationName || item.testName || 'Item'} recorded.`
      );
      await load();
    } catch (err: unknown) {
      if (shouldQueueOffline(err)) {
        await savePendingChemistAction({
          localId: clientActionId,
          referralId: Number(referral.referralId),
          referralItemId: itemId,
          status,
          quantityPicked: qty,
          chemistNotes: `${notes} (offline)`,
          clientActionId,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending',
        });
        const next = await patchCachedReferralItem(
          Number(referral.referralId),
          itemId,
          optimisticPatch
        );
        setReferrals(next);
        await refreshPendingMap();
        Alert.alert('Queued offline', 'Pending sync — will upload when you reconnect or pull to refresh.');
      } else {
        Alert.alert('Action failed', extractApiError(err));
        await refreshPendingMap();
      }
    } finally {
      setBusyKey(null);
    }
  };

  const dispenseItem = (referral: any, item: any) =>
    void queueOrDispense(referral, item, 'picked_up');

  const markNotAvailable = (referral: any, item: any) =>
    void queueOrDispense(referral, item, 'not_available');

  const acknowledgeReferral = async (referral: any) => {
    const key = `ack-${referral.referralId}`;
    setBusyKey(key);
    try {
      await apiService.updateReferralStatus(Number(referral.referralId), 'acknowledged');
      Alert.alert('Acknowledged', 'Referral marked acknowledged.');
      await load();
    } catch (err: unknown) {
      if (shouldQueueOffline(err)) {
        const openItems = (referral.items || []).filter(
          (it: any) =>
            !['picked_up', 'completed', 'not_available', 'cancelled'].includes(String(it.status || ''))
        );
        if (!openItems.length) {
          Alert.alert('Nothing to acknowledge', 'All items are already closed.');
          return;
        }
        for (const it of openItems) {
          const itemId = Number(it.referralItemId);
          const existing = await findPendingChemistAction(itemId);
          if (existing?.syncStatus === 'pending') continue;
          const clientActionId = makeLocalId();
          await savePendingChemistAction({
            localId: clientActionId,
            referralId: Number(referral.referralId),
            referralItemId: itemId,
            status: 'ready_for_pickup',
            chemistNotes: `Acknowledged via ${APP_DISPLAY_NAME} (offline)`,
            clientActionId,
            createdAt: new Date().toISOString(),
            syncStatus: 'pending',
          });
          await patchCachedReferralItem(Number(referral.referralId), itemId, {
            status: 'ready_for_pickup',
            _pendingSync: true,
          });
        }
        const cached = await getCachedReferrals();
        setReferrals(cached);
        await refreshPendingMap();
        Alert.alert('Queued offline', 'Acknowledge will sync when you reconnect.');
      } else {
        Alert.alert('Acknowledge failed', extractApiError(err));
      }
    } finally {
      setBusyKey(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const sync = await syncPendingChemistActions();
      if (sync.synced > 0) Alert.alert('Synced', `${sync.synced} action(s) uploaded.`);
      if (sync.failed > 0) {
        Alert.alert(
          'Some actions failed',
          sync.errors.slice(0, 3).join('\n') +
            '\n\nFailed items stay marked so you can resolve stock or duplicate dispense issues.'
        );
      }
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return referrals;
    const q = search.trim().toLowerCase();
    return referrals.filter((r) => {
      const blob = [
        r.referralNumber,
        r.pickupCode,
        r.patientFirstName,
        r.patientLastName,
        r.patientNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [referrals, search]);

  const pendingCount = Object.keys(pendingByItem).length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Chemist"
        subtitle={
          chemistScope?.chemistName
            ? chemistScope.chemistName
            : 'External referrals · offline-capable dispense'
        }
        onLogout={() => auth?.logout()}
      />
      {pendingCount > 0 ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {pendingCount} dispense action{pendingCount === 1 ? '' : 's'} waiting to sync
          </Text>
        </View>
      ) : null}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search name, pickup code, referral…"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => void load()}
          returnKeyType="search"
        />
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={THEME.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.referralId)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No referrals. Sign in as a chemist user, or sync when online.
            </Text>
          }
          renderItem={({ item: referral }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>
                    {referral.patientFirstName || ''} {referral.patientLastName || ''}
                  </Text>
                  <Text style={styles.meta}>
                    {referral.referralNumber}
                    {referral.pickupCode ? ` · code ${referral.pickupCode}` : ''}
                  </Text>
                  <Text style={styles.status}>{String(referral.status || '').replace(/_/g, ' ')}</Text>
                </View>
                {String(referral.status) === 'referred' ? (
                  <TouchableOpacity
                    style={styles.ackBtn}
                    disabled={busyKey === `ack-${referral.referralId}`}
                    onPress={() => void acknowledgeReferral(referral)}
                  >
                    <Text style={styles.ackText}>Ack</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {(referral.items || []).map((it: any) => {
                const key = `${referral.referralId}-${it.referralItemId}`;
                const pending = pendingByItem[String(it.referralItemId)];
                const done =
                  ['picked_up', 'completed'].includes(String(it.status || '')) ||
                  (pending?.syncStatus === 'pending' && pending.status === 'picked_up') ||
                  it._pendingSync;
                const failed = pending?.syncStatus === 'failed';
                return (
                  <View key={key} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>
                        {it.medicationName || it.testName || it.itemName || `Item #${it.referralItemId}`}
                      </Text>
                      <Text style={styles.meta}>
                        Qty {it.quantityPicked || 0}/
                        {it.quantityPrescribed || it.quantityReferred || it.quantity || '?'} ·{' '}
                        {it.status}
                      </Text>
                      {pending?.syncStatus === 'pending' ? (
                        <Text style={styles.pendingLabel}>Pending sync</Text>
                      ) : null}
                      {failed ? (
                        <Text style={styles.failedLabel}>
                          Sync failed: {pending?.lastError || 'See refresh errors'}
                        </Text>
                      ) : null}
                    </View>
                    {!done && !failed ? (
                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.dispenseBtn}
                          disabled={busyKey === key}
                          onPress={() => dispenseItem(referral, it)}
                        >
                          {busyKey === key ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.dispenseText}>Dispense</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.naBtn}
                          disabled={busyKey === key}
                          onPress={() => markNotAvailable(referral, it)}
                        >
                          <Text style={styles.naText}>N/A</Text>
                        </TouchableOpacity>
                      </View>
                    ) : failed ? (
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => dispenseItem(referral, it)}
                      >
                        <Text style={styles.dispenseText}>Retry</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.done}>
                        {pending?.syncStatus === 'pending' ? 'Pending' : 'Done'}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FFF8E1',
    borderColor: THEME.warning,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerText: { color: THEME.warning, fontWeight: '600', fontSize: 13 },
  searchWrap: { paddingHorizontal: 16, paddingTop: 10 },
  search: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  list: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: THEME.textMuted, marginTop: 40, paddingHorizontal: 20 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  title: { fontSize: 16, fontWeight: '700', color: THEME.text },
  meta: { marginTop: 2, fontSize: 12, color: THEME.textMuted },
  status: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: THEME.accent,
    textTransform: 'capitalize',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    gap: 8,
  },
  itemName: { fontSize: 14, fontWeight: '600', color: THEME.text },
  itemActions: { gap: 6, alignItems: 'stretch' },
  dispenseBtn: {
    backgroundColor: THEME.success,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 88,
    alignItems: 'center',
  },
  naBtn: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  naText: { color: THEME.textMuted, fontWeight: '600', fontSize: 11 },
  ackBtn: {
    backgroundColor: THEME.accent,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  ackText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  retryBtn: {
    backgroundColor: THEME.warning,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  dispenseText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  done: { color: THEME.success, fontWeight: '700', fontSize: 12 },
  pendingLabel: { marginTop: 4, fontSize: 11, fontWeight: '600', color: THEME.warning },
  failedLabel: { marginTop: 4, fontSize: 11, fontWeight: '600', color: THEME.danger },
});

export default ChemistReferralsScreen;
