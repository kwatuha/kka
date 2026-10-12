export type FieldAppProfile =
  | 'admin'
  | 'chemist'
  | 'doctor'
  | 'pharmacy'
  | 'cashier'
  | 'registration'
  | 'field';

export type TabKind =
  | 'overview'
  | 'queue'
  | 'dispense'
  | 'register'
  | 'chemist'
  | 'templates'
  | 'assets'
  | 'submissions';

export type ServicePoint = 'consultation' | 'cashier' | 'registration' | 'pharmacy' | 'triage';

export interface TabDef {
  id: string;
  label: string;
  title: string;
  kind: TabKind;
  servicePoint?: ServicePoint;
}

export function normalizeRoleName(roleName?: string): string {
  return String(roleName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function resolveFieldAppProfile(roleName?: string): FieldAppProfile {
  const role = normalizeRoleName(roleName);
  if (!role) return 'field';
  if (role === 'admin' || role === 'administrator' || role.includes('administrator')) return 'admin';
  if (role.includes('chemist') || role.includes('external_pharmacy')) return 'chemist';
  if (role === 'doctor' || role.includes('doctor')) return 'doctor';
  if (
    role === 'pharmacy' ||
    role === 'pharmacist' ||
    role.includes('dispensing_pharmacy') ||
    role.includes('dispensing')
  ) {
    return 'pharmacy';
  }
  if (role === 'cashier' || role.includes('cashier')) return 'cashier';
  if (role === 'registration' || role === 'receptionist' || role.includes('registration')) {
    return 'registration';
  }
  return 'field';
}

export function getTabsForProfile(profile: FieldAppProfile): TabDef[] {
  switch (profile) {
    case 'admin':
      return [
        { id: 'Overview', label: 'Overview', title: 'Hospital snapshot', kind: 'overview' },
        { id: 'Checklists', label: 'Forms', title: 'Checklists', kind: 'templates' },
        { id: 'Submissions', label: 'Activity', title: 'Field activity', kind: 'submissions' },
      ];
    case 'doctor':
      return [
        { id: 'DoctorQueue', label: 'Queue', title: 'Consultation', kind: 'queue', servicePoint: 'consultation' },
        { id: 'Checklists', label: 'Forms', title: 'Checklists', kind: 'templates' },
        { id: 'Submissions', label: 'Visits', title: 'Visits', kind: 'submissions' },
      ];
    case 'pharmacy':
      return [
        { id: 'PharmacyDispense', label: 'Dispense', title: 'Dispense', kind: 'dispense' },
        { id: 'PharmacyQueue', label: 'Queue', title: 'Pharmacy queue', kind: 'queue', servicePoint: 'pharmacy' },
      ];
    case 'cashier':
      return [
        { id: 'CashierQueue', label: 'Queue', title: 'Cashier', kind: 'queue', servicePoint: 'cashier' },
      ];
    case 'registration':
      return [
        { id: 'RegisterPatient', label: 'Register', title: 'Register patient', kind: 'register' },
        {
          id: 'RegistrationQueue',
          label: 'Queue',
          title: 'Registration queue',
          kind: 'queue',
          servicePoint: 'registration',
        },
      ];
    case 'chemist':
      return [
        { id: 'Chemist', label: 'Chemist', title: 'Chemist', kind: 'chemist' },
        { id: 'Checklists', label: 'Forms', title: 'Checklists', kind: 'templates' },
        { id: 'Submissions', label: 'Visits', title: 'Visits', kind: 'submissions' },
      ];
    default:
      return [
        { id: 'Checklists', label: 'Forms', title: 'Checklists', kind: 'templates' },
        { id: 'Assets', label: 'Assets', title: 'Assets', kind: 'assets' },
        { id: 'Submissions', label: 'Visits', title: 'Visits', kind: 'submissions' },
      ];
  }
}

export function profileLabel(profile: FieldAppProfile): string {
  switch (profile) {
    case 'admin':
      return 'Administrator overview';
    case 'doctor':
      return 'Doctor workspace';
    case 'pharmacy':
      return 'Pharmacy workspace';
    case 'cashier':
      return 'Cashier workspace';
    case 'registration':
      return 'Registration workspace';
    case 'chemist':
      return 'Chemist workspace';
    default:
      return 'Field workspace';
  }
}
