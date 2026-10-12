import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { AuthContext } from '../navigation/AppNavigator';
import { THEME } from '../config/api';
import apiService from '../services/api';
import {
  getClinicalSnapshot,
  getConsultationDraft,
  savePendingConsultation,
  setConsultationDraft,
} from '../services/offlineStore';
import { makeLocalId } from '../services/syncService';
import { extractApiError, shouldQueueOffline } from '../utils/apiErrorUtils';
import {
  ClinicalMedication,
  OUTCOME_OPTIONS,
  PrescriptionItemDraft,
} from '../types/clinical';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const ConsultationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const auth = useContext(AuthContext);

  const queueId = Number(route.params?.queueId) || undefined;
  const patientId = Number(route.params?.patientId);
  const patientName = String(route.params?.patientName || 'Patient');
  const patientNumber = route.params?.patientNumber as string | undefined;
  const ticketNumber = route.params?.ticketNumber as string | undefined;

  const [visitDate, setVisitDate] = useState(todayIso());
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('');
  const [physicalExamination, setPhysicalExamination] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [outcome, setOutcome] = useState<string>(OUTCOME_OPTIONS[1]);
  const [notes, setNotes] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItemDraft[]>([]);
  const [medications, setMedications] = useState<ClinicalMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showMedPicker, setShowMedPicker] = useState(false);
  const [medSearch, setMedSearch] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [snapshotAge, setSnapshotAge] = useState<string | null>(null);

  const doctorId = auth?.user?.id;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const snapshot = await getClinicalSnapshot();
      if (snapshot) {
        setMedications(snapshot.medications || []);
        setSnapshotAge(snapshot.generatedAt || null);
      }
      const draft = await getConsultationDraft();
      if (draft && draft.patientId === patientId) {
        setVisitDate(draft.visitDate || todayIso());
        setChiefComplaint(draft.chiefComplaint || '');
        setSymptoms(draft.symptoms || '');
        setHistoryOfPresentIllness(draft.historyOfPresentIllness || '');
        setPhysicalExamination(draft.physicalExamination || '');
        setDiagnosis(draft.diagnosis || '');
        setTreatment(draft.treatment || '');
        setOutcome(draft.outcome || OUTCOME_OPTIONS[1]);
        setNotes(draft.notes || '');
        setPrescriptionItems(draft.prescriptionItems || []);
      }
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const t = setTimeout(() => {
      void setConsultationDraft({
        queueId,
        patientId,
        patientName,
        patientNumber,
        visitDate,
        chiefComplaint,
        symptoms,
        historyOfPresentIllness,
        physicalExamination,
        diagnosis,
        treatment,
        outcome,
        notes,
        prescriptionItems,
        updatedAt: new Date().toISOString(),
      });
    }, 500);
    return () => clearTimeout(t);
  }, [
    queueId,
    patientId,
    patientName,
    patientNumber,
    visitDate,
    chiefComplaint,
    symptoms,
    historyOfPresentIllness,
    physicalExamination,
    diagnosis,
    treatment,
    outcome,
    notes,
    prescriptionItems,
  ]);

  const filteredMeds = useMemo(() => {
    const q = medSearch.trim().toLowerCase();
    if (!q) return medications.slice(0, 40);
    return medications
      .filter(
        (m) =>
          m.name?.toLowerCase().includes(q) ||
          m.genericName?.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [medications, medSearch]);

  const addMedication = (med: ClinicalMedication) => {
    setPrescriptionItems((prev) => [
      ...prev,
      {
        medicationId: med.medicationId,
        medicationName: med.name,
        dosage: med.strength || '',
        frequency: 'twice daily',
        duration: '5 days',
        quantity: 1,
      },
    ]);
    setShowMedPicker(false);
    setMedSearch('');
  };

  const removeMedication = (index: number) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const save = async (completeQueue: boolean) => {
    if (!patientId) {
      Alert.alert('Missing patient', 'Cannot save without a patient.');
      return;
    }
    if (!chiefComplaint.trim() && !diagnosis.trim()) {
      Alert.alert('Required', 'Enter at least a chief complaint or diagnosis.');
      return;
    }
    if (prescriptionItems.length && !diagnosis.trim()) {
      Alert.alert('Diagnosis required', 'Add a diagnosis before prescribing medications.');
      return;
    }

    setSubmitting(true);
    const clientActionId = makeLocalId();
    const payload = {
      clientActionId,
      queueId,
      patientId,
      doctorId,
      visitDate,
      chiefComplaint: chiefComplaint.trim() || undefined,
      symptoms: symptoms.trim() || undefined,
      historyOfPresentIllness: historyOfPresentIllness.trim() || undefined,
      physicalExamination: physicalExamination.trim() || undefined,
      diagnosis: diagnosis.trim() || undefined,
      treatment: treatment.trim() || undefined,
      outcome: outcome || undefined,
      notes: notes.trim() || undefined,
      completeQueue,
      prescriptionItems: prescriptionItems.length ? prescriptionItems : undefined,
    };

    try {
      if (queueId && !completeQueue) {
        await apiService.updateQueueStatus(queueId, 'serving');
      }
      const result = await apiService.syncConsultation(payload);
      await setConsultationDraft(null);
      Alert.alert(
        completeQueue ? 'Consultation complete' : 'Consultation saved',
        result.duplicate
          ? 'Already synced from a previous attempt.'
          : `Medical record #${result.recordId} saved.${completeQueue ? ' Patient marked complete in queue.' : ''}`
      );
      navigation.goBack();
    } catch (err: unknown) {
      if (shouldQueueOffline(err)) {
        setOfflineMode(true);
        await savePendingConsultation({
          localId: clientActionId,
          clientActionId,
          queueId,
          patientId,
          doctorId,
          patientName,
          visitDate,
          chiefComplaint: payload.chiefComplaint,
          symptoms: payload.symptoms,
          historyOfPresentIllness: payload.historyOfPresentIllness,
          physicalExamination: payload.physicalExamination,
          diagnosis: payload.diagnosis,
          treatment: payload.treatment,
          outcome: payload.outcome,
          notes: payload.notes,
          prescriptionItems,
          completeQueue,
          syncStatus: 'pending',
          createdAt: new Date().toISOString(),
        });
        await setConsultationDraft(null);
        Alert.alert(
          'Saved offline',
          'HMIS is unreachable. Consultation queued and will sync when connectivity returns.'
        );
        navigation.goBack();
      } else {
        Alert.alert('Save failed', extractApiError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Consultation"
        subtitle={patientName}
        onBack={() => navigation.goBack()}
        onLogout={() => void auth?.logout()}
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>{patientName}</Text>
          <Text style={styles.bannerMeta}>
            {patientNumber || '—'}
            {ticketNumber ? ` · Ticket ${ticketNumber}` : ''}
          </Text>
          {snapshotAge ? (
            <Text style={styles.bannerHint}>
              Offline cache from {new Date(snapshotAge).toLocaleString()}
            </Text>
          ) : (
            <Text style={styles.bannerHint}>No offline cache — save requires connection</Text>
          )}
          {offlineMode ? (
            <Text style={styles.offlineTag}>Working offline — changes will sync later</Text>
          ) : null}
        </View>

        <Field label="Visit date" value={visitDate} onChangeText={setVisitDate} />
        <Field label="Chief complaint *" value={chiefComplaint} onChangeText={setChiefComplaint} multiline />
        <Field label="Symptoms" value={symptoms} onChangeText={setSymptoms} multiline />
        <Field label="History of present illness" value={historyOfPresentIllness} onChangeText={setHistoryOfPresentIllness} multiline />
        <Field label="Physical examination" value={physicalExamination} onChangeText={setPhysicalExamination} multiline />
        <Field label="Diagnosis" value={diagnosis} onChangeText={setDiagnosis} multiline />
        <Field label="Treatment plan" value={treatment} onChangeText={setTreatment} multiline />
        <Field label="Notes" value={notes} onChangeText={setNotes} multiline />

        <Text style={styles.sectionLabel}>Outcome</Text>
        <View style={styles.chips}>
          {OUTCOME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.chip, outcome === opt && styles.chipActive]}
              onPress={() => setOutcome(opt)}
            >
              <Text style={[styles.chipText, outcome === opt && styles.chipTextActive]}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Prescriptions</Text>
        {prescriptionItems.map((item, idx) => (
          <View key={`${item.medicationId}-${idx}`} style={styles.rxRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rxName}>{item.medicationName || `Med #${item.medicationId}`}</Text>
              <Text style={styles.rxMeta}>
                {item.dosage} · {item.frequency} · {item.duration} · Qty {item.quantity}
              </Text>
            </View>
            <TouchableOpacity onPress={() => removeMedication(idx)}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowMedPicker(true)}>
          <Text style={styles.secondaryBtnText}>+ Add medication</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.primaryBtn}
          disabled={submitting}
          onPress={() => void save(false)}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Save consultation</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, styles.completeBtn]}
          disabled={submitting}
          onPress={() => void save(true)}
        >
          <Text style={styles.primaryBtnText}>Save & complete queue</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showMedPicker} animationType="slide" onRequestClose={() => setShowMedPicker(false)}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Select medication</Text>
          <TextInput
            style={styles.search}
            placeholder="Search medications..."
            value={medSearch}
            onChangeText={setMedSearch}
          />
          <FlatList
            data={filteredMeds}
            keyExtractor={(item) => String(item.medicationId)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.medRow} onPress={() => addMedication(item)}>
                <Text style={styles.medName}>{item.name}</Text>
                {item.strength ? <Text style={styles.medMeta}>{item.strength}</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No medications in offline cache.</Text>}
          />
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowMedPicker(false)}>
            <Text style={styles.secondaryBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

function Field({
  label,
  value,
  onChangeText,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 12, paddingBottom: 32 },
  banner: {
    backgroundColor: THEME.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  bannerTitle: { fontSize: 18, fontWeight: '700', color: THEME.text },
  bannerMeta: { fontSize: 13, color: THEME.textMuted, marginTop: 4 },
  bannerHint: { fontSize: 11, color: THEME.textMuted, marginTop: 6 },
  offlineTag: { marginTop: 6, fontSize: 12, color: THEME.warning, fontWeight: '600' },
  field: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: THEME.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: THEME.text,
  },
  inputMulti: { minHeight: 72 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: THEME.text, marginVertical: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: THEME.card,
  },
  chipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  chipText: { fontSize: 11, color: THEME.text },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  rxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.card,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  rxName: { fontSize: 14, fontWeight: '600', color: THEME.text },
  rxMeta: { fontSize: 11, color: THEME.textMuted, marginTop: 2 },
  removeText: { color: THEME.danger, fontWeight: '600', fontSize: 12 },
  primaryBtn: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  completeBtn: { backgroundColor: THEME.accent },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: THEME.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryBtnText: { color: THEME.primary, fontWeight: '700' },
  modal: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: THEME.background },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  search: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  medRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  medName: { fontSize: 15, fontWeight: '600' },
  medMeta: { fontSize: 12, color: THEME.textMuted },
  empty: { textAlign: 'center', color: THEME.textMuted, marginTop: 24 },
});

export default ConsultationScreen;
