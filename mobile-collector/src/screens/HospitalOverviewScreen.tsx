import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { AuthContext } from '../navigation/AppNavigator';
import { THEME } from '../config/api';
import apiService, { DashboardStats, QueueEntry } from '../services/api';
import { extractApiError } from '../utils/apiErrorUtils';

const SERVICE_LABELS: Record<string, string> = {
  registration: 'Registration',
  triage: 'Triage',
  consultation: 'Consultation',
  cashier: 'Cashier',
  pharmacy: 'Pharmacy',
  laboratory: 'Laboratory',
  radiology: 'Radiology',
  billing: 'Billing',
};

function formatMoney(n: number) {
  if (!Number.isFinite(n)) return '—';
  return `KES ${Math.round(n).toLocaleString()}`;
}

const HospitalOverviewScreen: React.FC = () => {
  const auth = useContext(AuthContext);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [statsData, queueData, activityData] = await Promise.all([
      apiService.getDashboardStats(),
      apiService.listQueue({}),
      apiService.getRecentActivities(5),
    ]);
    setStats(statsData);
    setQueues(queueData);
    setRecentPatients(activityData?.patients || []);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load()
        .catch((e) => Alert.alert('Overview', extractApiError(e)))
        .finally(() => setLoading(false));
    }, [])
  );

  const queueByPoint = useMemo(() => {
    const map = new Map<string, number>();
    for (const q of queues) {
      const key = String(q.servicePoint || 'other');
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [queues]);

  const statCards = stats
    ? [
        { label: 'Patients', value: String(stats.totalPatients ?? 0) },
        { label: 'In queue now', value: String(stats.activeQueue ?? queues.length) },
        { label: "Today's appts", value: String(stats.todayAppointments ?? 0) },
        { label: 'Inpatients', value: String(stats.inpatients ?? 0) },
        { label: 'ICU', value: String(stats.icuPatients ?? 0) },
        { label: 'Maternity', value: String(stats.maternityPatients ?? 0) },
        { label: 'Pending bills', value: String(stats.pendingInvoices ?? 0) },
        { label: 'Low stock', value: String(stats.lowStockItems ?? 0) },
        { label: 'Revenue (month)', value: formatMoney(Number(stats.monthlyRevenue ?? 0)) },
      ]
    : [];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Hospital snapshot"
        subtitle="Live overview across departments"
        onLogout={() => void auth?.logout()}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load()
                  .catch((e) => Alert.alert('Overview', extractApiError(e)))
                  .finally(() => setRefreshing(false));
              }}
            />
          }
        >
          <Text style={styles.sectionTitle}>Key metrics</Text>
          <View style={styles.grid}>
            {statCards.map((card) => (
              <View key={card.label} style={styles.statCard}>
                <Text style={styles.statValue}>{card.value}</Text>
                <Text style={styles.statLabel}>{card.label}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Queues by service point</Text>
          {queueByPoint.length === 0 ? (
            <Text style={styles.muted}>No active queue entries right now.</Text>
          ) : (
            queueByPoint.map(([point, count]) => (
              <View key={point} style={styles.queueRow}>
                <Text style={styles.queueLabel}>{SERVICE_LABELS[point] || point}</Text>
                <View style={styles.queueBadge}>
                  <Text style={styles.queueCount}>{count}</Text>
                </View>
              </View>
            ))
          )}

          <Text style={styles.sectionTitle}>Recent registrations</Text>
          {recentPatients.length === 0 ? (
            <Text style={styles.muted}>No recent patients.</Text>
          ) : (
            recentPatients.map((p) => (
              <View key={String(p.patientId)} style={styles.recentRow}>
                <Text style={styles.recentName}>
                  {[p.firstName, p.lastName].filter(Boolean).join(' ') || 'Patient'}
                </Text>
                <Text style={styles.muted}>{p.patientNumber || ''}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.text,
    marginTop: 8,
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%',
    backgroundColor: THEME.card,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  statValue: { fontSize: 20, fontWeight: '800', color: THEME.primaryDark },
  statLabel: { fontSize: 12, color: THEME.textMuted, marginTop: 4 },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  queueLabel: { fontSize: 14, fontWeight: '600', color: THEME.text },
  queueBadge: {
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    alignItems: 'center',
  },
  queueCount: { color: '#fff', fontWeight: '700', fontSize: 13 },
  recentRow: {
    backgroundColor: THEME.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  recentName: { fontSize: 14, fontWeight: '600', color: THEME.text },
  muted: { fontSize: 13, color: THEME.textMuted, marginBottom: 8 },
});

export default HospitalOverviewScreen;
