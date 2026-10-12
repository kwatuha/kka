export interface ClinicalSnapshot {
  version: number;
  generatedAt: string;
  date: string;
  servicePoint: string;
  queue: ClinicalQueueEntry[];
  pendingInvoices: ClinicalPendingInvoice[];
  medications: ClinicalMedication[];
  drugStock: ClinicalDrugStock[];
  testTypes: ClinicalTestType[];
  todayRecords: ClinicalTodayRecord[];
  readyToDispense?: ReadyToDispenseCacheItem[];
  todayPayments?: ClinicalPayment[];
  edgeCachedAt?: string;
  source?: string;
}

export interface ReadyToDispenseCacheItem {
  itemId: number;
  prescriptionId: number;
  medicationId?: number;
  medicationName: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  prescribedQuantity?: number;
  instructions?: string;
  prescriptionNumber?: string;
  patientId?: number;
  patientFirstName?: string;
  patientLastName?: string;
  patientNumber?: string;
  drugInventoryId?: number;
}

export interface ClinicalPayment {
  paymentId: number;
  invoiceId?: number;
  amount?: number;
  paymentMethod?: string;
  paymentDate?: string;
  referenceNumber?: string;
}

export interface ClinicalQueueEntry {
  queueId: number;
  patientId: number;
  ticketNumber?: string;
  servicePoint?: string;
  status?: string;
  priority?: string;
  arrivalTime?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientPhone?: string;
  patientNumber?: string;
  hasPendingBills?: boolean | number;
}

export interface ClinicalPendingInvoice {
  invoiceId: number;
  invoiceNumber?: string;
  patientId: number;
  status?: string;
  balance?: number;
  totalAmount?: number;
  notes?: string;
}

export interface ClinicalMedication {
  medicationId: number;
  name: string;
  genericName?: string;
  dosageForm?: string;
  strength?: string;
  category?: string;
}

export interface ClinicalDrugStock {
  drugInventoryId: number;
  medicationId: number;
  quantity: number;
  sellPrice?: number;
  medicationName?: string;
  strength?: string;
  dosageForm?: string;
}

export interface ClinicalTestType {
  testTypeId: number;
  testName: string;
  testCode?: string;
  category?: string;
  cost?: number;
}

export interface ClinicalTodayRecord {
  recordId: number;
  patientId: number;
  visitDate?: string;
  diagnosis?: string;
  chiefComplaint?: string;
  doctorId?: number;
}

export interface PrescriptionItemDraft {
  medicationId: number;
  medicationName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
}

export interface ConsultationDraft {
  queueId?: number;
  patientId: number;
  patientName?: string;
  patientNumber?: string;
  visitDate: string;
  chiefComplaint: string;
  symptoms: string;
  historyOfPresentIllness: string;
  physicalExamination: string;
  diagnosis: string;
  treatment: string;
  outcome: string;
  notes: string;
  prescriptionItems: PrescriptionItemDraft[];
  updatedAt: string;
}

export interface PendingConsultation {
  localId: string;
  clientActionId: string;
  queueId?: number;
  patientId: number;
  doctorId?: number;
  patientName?: string;
  visitDate: string;
  chiefComplaint?: string;
  symptoms?: string;
  historyOfPresentIllness?: string;
  physicalExamination?: string;
  diagnosis?: string;
  treatment?: string;
  outcome?: string;
  notes?: string;
  prescriptionItems?: PrescriptionItemDraft[];
  completeQueue?: boolean;
  syncStatus: 'pending' | 'failed' | 'synced';
  lastError?: string;
  createdAt: string;
}

export const OUTCOME_OPTIONS = [
  'Discharged - Recovered',
  'Discharged - Improved',
  'Discharged - Stable',
  'Death',
  'Follow-up Scheduled',
  'Admitted',
  'Referred',
  'Other',
] as const;
