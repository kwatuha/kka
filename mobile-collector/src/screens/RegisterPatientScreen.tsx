import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { AuthContext } from '../navigation/AppNavigator';
import { THEME } from '../config/api';
import apiService from '../services/api';
import { extractApiError } from '../utils/apiErrorUtils';

const RegisterPatientScreen: React.FC = () => {
  const auth = useContext(AuthContext);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [addToQueue, setAddToQueue] = useState(true);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setFirstName('');
    setLastName('');
    setPhone('');
    setGender('');
  };

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing fields', 'First name and last name are required.');
      return;
    }
    setSaving(true);
    try {
      const patient = await apiService.createPatient({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        gender: gender.trim() || undefined,
      });
      if (addToQueue && patient.patientId) {
        try {
          await apiService.createQueueEntry({
            patientId: patient.patientId,
            servicePoint: 'registration',
            priority: 'normal',
          });
        } catch (queueErr) {
          Alert.alert(
            'Patient registered',
            `Saved as ${patient.patientNumber || patient.patientId}, but queue add failed: ${extractApiError(queueErr)}`
          );
          reset();
          return;
        }
      }
      Alert.alert(
        'Patient registered',
        `${patient.firstName} ${patient.lastName}\n${patient.patientNumber || ''}${
          addToQueue ? '\nAdded to registration queue.' : ''
        }`
      );
      reset();
    } catch (e) {
      Alert.alert('Registration failed', extractApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Register patient"
        subtitle="Quick registration at the desk"
        onLogout={() => void auth?.logout()}
      />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>First name *</Text>
        <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />

        <Text style={styles.label}>Last name *</Text>
        <TextInput style={styles.input} value={lastName} onChangeText={setLastName} autoCapitalize="words" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.chips}>
          {['Male', 'Female', 'Other'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, gender === g && styles.chipActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.checkRow} onPress={() => setAddToQueue((v) => !v)}>
          <View style={[styles.checkbox, addToQueue && styles.checkboxOn]} />
          <Text style={styles.checkLabel}>Add to registration queue after save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} disabled={saving} onPress={() => void submit()}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Register patient</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.background },
  form: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: THEME.text, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: THEME.card,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: THEME.card,
  },
  chipActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  chipText: { color: THEME.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: THEME.border,
    backgroundColor: THEME.card,
  },
  checkboxOn: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  checkLabel: { flex: 1, color: THEME.text, fontSize: 14 },
  saveBtn: {
    marginTop: 24,
    backgroundColor: THEME.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default RegisterPatientScreen;
