import axios, { AxiosError, AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_FALLBACK_URL, STORAGE_KEYS, APP_VERSION } from '../config/api';
import { parseJwtUser } from '../utils/jwtUtils';
import {
  DataCollectionSubmission,
  DataCollectionTemplate,
  VisitSubjectType,
} from '../types/dataCollection';
import { ClinicalSnapshot, PrescriptionItemDraft } from '../types/clinical';

export interface AuthUser {
  id: number;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roleName?: string;
}

export interface QueueEntry {
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
  hasPendingBills?: boolean;
}

export interface ReadyToDispenseItem {
  itemId: number;
  prescriptionId: number;
  prescriptionNumber?: string;
  medicationName: string;
  prescribedQuantity?: number;
  dosage?: string;
  frequency?: string;
  patientId?: number;
  patientFirstName?: string;
  patientLastName?: string;
  patientNumber?: string;
  drugInventoryId?: number;
}

export interface PatientSummary {
  patientId: number;
  patientNumber?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  gender?: string;
}

export interface DashboardStats {
  totalPatients?: number;
  todayAppointments?: number;
  activeQueue?: number;
  totalEmployees?: number;
  totalDepartments?: number;
  monthlyRevenue?: number;
  pendingInvoices?: number;
  lowStockItems?: number;
  inpatients?: number;
  icuPatients?: number;
  maternityPatients?: number;
}

class ApiService {
  private client: AxiosInstance;
  private onUnauthorized: (() => void) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 45000,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': 'kakamega-field',
        'X-App-Version': APP_VERSION,
      },
    });

    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const branchId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_BRANCH_ID);
        const servicePointId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SERVICE_POINT_ID);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (branchId) {
          config.headers['X-Branch-Id'] = branchId;
        }
        if (servicePointId) {
          config.headers['X-Service-Point-Id'] = servicePointId;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await AsyncStorage.multiRemove([STORAGE_KEYS.AUTH_TOKEN, STORAGE_KEYS.USER_DATA]);
          this.onUnauthorized?.();
        }
        return Promise.reject(error);
      }
    );
  }

  setUnauthorizedHandler(handler: (() => void) | null) {
    this.onUnauthorized = handler;
  }

  private mapUser(raw: any): AuthUser {
    const id = Number(raw?.id ?? raw?.userId);
    return {
      id: Number.isFinite(id) && id > 0 ? id : 0,
      username: raw?.username,
      email: raw?.email,
      firstName: raw?.firstName,
      lastName: raw?.lastName,
      roleName: raw?.role || raw?.roleName,
    };
  }

  private async persistFacilityContextFromUser(raw: any): Promise<void> {
    const branchId =
      raw?.currentBranch?.branchId ??
      raw?.defaultBranch?.branchId ??
      raw?.branches?.[0]?.branchId ??
      null;
    const servicePointId =
      raw?.currentServicePoint?.servicePointId ??
      raw?.defaultServicePoint?.servicePointId ??
      null;
    if (branchId) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_BRANCH_ID, String(branchId));
    }
    if (servicePointId) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SERVICE_POINT_ID, String(servicePointId));
    }
  }

  async login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const response = await this.client.post('/api/auth/login', { username, password });
    const token = response.data?.token;
    if (!token) throw new Error('No token returned from login');
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    await this.persistFacilityContextFromUser(response.data?.user);
    const user = this.mapUser(response.data?.user);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    // Fire-and-forget usage + update prompt (same as Machakos)
    this.reportAppUsage('app_login').catch(() => {});
    this.promptForAppUpdateIfNeeded().catch(() => {});
    return { token, user };
  }

  async logout(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_DATA,
      STORAGE_KEYS.CURRENT_BRANCH_ID,
      STORAGE_KEYS.CURRENT_SERVICE_POINT_ID,
    ]);
  }

  async resumeSession(): Promise<{ authenticated: boolean; user?: AuthUser }> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    if (!token) return { authenticated: false };
    try {
      const response = await this.client.get('/api/auth/verify');
      const user = this.mapUser(response.data?.user);
      await this.persistFacilityContextFromUser(response.data?.user);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
      return { authenticated: true, user };
    } catch {
      const jwtUser = parseJwtUser(token);
      if (jwtUser) {
        const user = this.mapUser(jwtUser);
        return { authenticated: true, user };
      }
      await this.logout();
      return { authenticated: false };
    }
  }

  async getStoredUser(): Promise<AuthUser | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async listTemplates(params: { category?: string } = {}): Promise<DataCollectionTemplate[]> {
    const response = await this.client.get('/api/data-collection/templates', { params });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getTemplate(id: number): Promise<DataCollectionTemplate> {
    const response = await this.client.get(`/api/data-collection/templates/${id}`);
    return response.data;
  }

  async listMySubmissions(limit = 50): Promise<DataCollectionSubmission[]> {
    const response = await this.client.get('/api/data-collection/submissions', {
      params: { mine: 1, limit },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async createSubmission(body: {
    templateId: number;
    subjectType?: VisitSubjectType;
    subjectId?: number;
    subjectLabel?: string;
    visitDate?: string;
    title?: string;
    answers: Record<string, unknown>;
    latitude?: number;
    longitude?: number;
    accuracyMeters?: number;
  }): Promise<DataCollectionSubmission> {
    const response = await this.client.post('/api/data-collection/submissions', body);
    return response.data;
  }

  async getChemistMe(): Promise<any> {
    const response = await this.client.get('/api/pharmacy/chemist/me');
    return response.data;
  }

  async listExternalReferrals(params: { status?: string; chemistId?: number | string; search?: string } = {}): Promise<any[]> {
    const response = await this.client.get('/api/pharmacy/external-referrals', { params });
    return Array.isArray(response.data) ? response.data : [];
  }

  async updateReferralStatus(referralId: number, status: string, notes?: string): Promise<any> {
    const response = await this.client.patch(`/api/pharmacy/external-referrals/${referralId}/status`, {
      status,
      notes,
    });
    return response.data;
  }

  async updateReferralItem(
    referralId: number,
    referralItemId: number,
    body: {
      status?: string;
      quantityPicked?: number;
      chemistNotes?: string;
      clientActionId?: string;
    },
    idempotencyKey?: string
  ): Promise<any> {
    const response = await this.client.patch(
      `/api/pharmacy/external-referrals/${referralId}/items/${referralItemId}`,
      body,
      {
        headers: idempotencyKey
          ? { 'Idempotency-Key': idempotencyKey }
          : undefined,
      }
    );
    return response.data;
  }

  async listChemistDrugs(chemistId: number | string): Promise<any[]> {
    const response = await this.client.get(`/api/pharmacy/external-chemists/${chemistId}/drugs`);
    return Array.isArray(response.data) ? response.data : [];
  }

  async getCriticalAssets(): Promise<any[]> {
    const response = await this.client.get('/api/assets/critical/list');
    return Array.isArray(response.data) ? response.data : response.data?.assets || [];
  }

  async bulkVerifyAssets(payload: {
    verifiedBy: number;
    verifications: Array<{
      assetId: number;
      isPresent?: boolean;
      notes?: string;
      condition?: string;
    }>;
  }): Promise<any> {
    const response = await this.client.post('/api/assets/critical/bulk-verify', payload);
    return response.data;
  }

  async listQueue(params: { servicePoint?: string; status?: string } = {}): Promise<QueueEntry[]> {
    const response = await this.client.get('/api/queue', { params });
    return Array.isArray(response.data) ? response.data : [];
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const response = await this.client.get('/api/dashboard/stats');
    return response.data || {};
  }

  async getRecentActivities(limit = 5): Promise<{ patients?: any[]; appointments?: any[] }> {
    const response = await this.client.get('/api/dashboard/recent-activities', { params: { limit } });
    return response.data || {};
  }

  async updateQueueStatus(queueId: number, status: string): Promise<QueueEntry> {
    const response = await this.client.put(`/api/queue/${queueId}/status`, { status });
    return response.data;
  }

  async createQueueEntry(body: {
    patientId: number;
    servicePoint: string;
    priority?: string;
    notes?: string;
  }): Promise<QueueEntry> {
    const response = await this.client.post('/api/queue', body);
    return response.data;
  }

  async completeCashierQueue(patientId: number): Promise<any> {
    const response = await this.client.post('/api/queue/cashier/check-and-complete', { patientId });
    return response.data;
  }

  async listReadyForDispensing(patientId?: number): Promise<ReadyToDispenseItem[]> {
    const response = await this.client.get('/api/pharmacy/prescriptions/paid/ready-for-dispensing', {
      params: patientId ? { patientId } : undefined,
    });
    return Array.isArray(response.data) ? response.data : response.data?.items || [];
  }

  async dispensePrescriptionItem(body: {
    prescriptionItemId: number;
    quantityDispensed: number;
    drugInventoryId?: number;
    notes?: string;
  }): Promise<any> {
    const response = await this.client.post('/api/pharmacy/dispensations', body);
    return response.data;
  }

  async searchPatients(search: string, limit = 20): Promise<PatientSummary[]> {
    const response = await this.client.get('/api/patients', { params: { search, limit } });
    return Array.isArray(response.data) ? response.data : [];
  }

  async createPatient(body: {
    firstName: string;
    lastName: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
  }): Promise<PatientSummary> {
    const response = await this.client.post('/api/patients', body);
    return response.data;
  }

  async getMobileAppRelease(): Promise<{ available: boolean; release?: { version?: string } | null }> {
    const response = await this.client.get('/api/mobile-app/release');
    return response.data;
  }

  async reportAppUsage(eventType: 'app_login' | 'app_sync'): Promise<void> {
    try {
      await this.client.post('/api/mobile-app/usage/report', {
        eventType,
        appVersion: APP_VERSION,
      });
    } catch {
      /* non-blocking */
    }
  }

  async promptForAppUpdateIfNeeded(): Promise<void> {
    try {
      const { Alert, Linking } = require('react-native');
      const { isNewerVersion } = require('../utils/versionUtils');
      const data = await this.getMobileAppRelease();
      const latest = data?.release?.version;
      if (!data?.available || !latest || !isNewerVersion(String(latest), APP_VERSION)) return;

      const dismissKey = `@intellinex_field_update_dismissed_${latest}`;
      const dismissed = await AsyncStorage.getItem(dismissKey);
      if (dismissed === '1') return;

      Alert.alert(
        'Update available',
        `${APP_DISPLAY_NAME} ${latest} is available (you have ${APP_VERSION}). Open the download page in HMIS?`,
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {
              AsyncStorage.setItem(dismissKey, '1').catch(() => {});
            },
          },
          {
            text: 'Open download',
            onPress: () => {
              Linking.openURL(`${API_BASE_URL}/hmis/field-app`).catch(() => {});
            },
          },
        ]
      );
    } catch {
      /* ignore */
    }
  }

  /** Fetch clinical snapshot — tries primary API, then optional fallback URL. */
  async getClinicalSnapshot(servicePoint = 'consultation'): Promise<ClinicalSnapshot> {
    const urls = [API_BASE_URL, API_FALLBACK_URL].filter(Boolean);
    let lastError: unknown;
    for (const base of urls) {
      try {
        const response = await axios.get(`${base}/api/mobile/clinical-snapshot`, {
          params: { servicePoint },
          timeout: 45000,
          headers: await this.buildAuthHeaders(),
        });
        return response.data;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  async syncConsultation(body: {
    clientActionId: string;
    queueId?: number;
    patientId: number;
    doctorId?: number;
    visitDate: string;
    chiefComplaint?: string;
    symptoms?: string;
    historyOfPresentIllness?: string;
    physicalExamination?: string;
    diagnosis?: string;
    treatment?: string;
    outcome?: string;
    notes?: string;
    completeQueue?: boolean;
    prescriptionItems?: PrescriptionItemDraft[];
  }): Promise<{ recordId: number; prescriptionId?: number | null; duplicate?: boolean }> {
    const response = await this.client.post('/api/mobile/consultations/sync', body, {
      headers: { 'Idempotency-Key': body.clientActionId },
    });
    return response.data;
  }

  async createMedicalRecord(body: Record<string, unknown>): Promise<any> {
    const response = await this.client.post('/api/medical-records', body);
    return response.data;
  }

  async getPatientMedicalRecords(patientId: number, limit = 10): Promise<any[]> {
    const response = await this.client.get('/api/medical-records', {
      params: { patientId, limit },
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  private async buildAuthHeaders(): Promise<Record<string, string>> {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Client-App': 'kakamega-field',
      'X-App-Version': APP_VERSION,
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  /** Compatibility stubs for checklist widgets carried from Machakos collector. */
  async getUserData(): Promise<AuthUser | null> {
    return this.getStoredUser();
  }

  async fetchMe(): Promise<AuthUser> {
    const session = await this.resumeSession();
    if (!session.user) throw new Error('Not signed in');
    return session.user;
  }

  async getFieldOptions(): Promise<{ options: string[] }> {
    return { options: [] };
  }

  async getGeographySubcounties(): Promise<string[]> {
    return [];
  }

  async getGeographyWards(): Promise<string[]> {
    return [];
  }

  async getGeographySublocations(): Promise<string[]> {
    return [];
  }

  async getGeographyVillages(): Promise<string[]> {
    return [];
  }
}

const apiService = new ApiService();
export default apiService;
