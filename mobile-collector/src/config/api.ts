/**
 * AZ CarePlus Mobile — HMIS companion app.
 *
 * Production API (same-origin or public host):
 *   https://kakamega.intellibizafrica.co.ke
 *
 * Android emulator → host machine API:
 *   http://10.0.2.2:3222
 *
 * Physical device on LAN (edit __DEV__ URL below):
 *   http://YOUR_LAN_IP:3222
 */
declare const __DEV__: boolean;

export const APP_ID = 'kakamega-field';
export const APP_DISPLAY_NAME = 'AZ CarePlus Mobile';
export const FACILITY_NAME = 'Your health facility';

export const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:3222'
  : 'https://kakamega.intellibizafrica.co.ke';

/** Optional LAN edge cache (see deploy/mobile-edge-cache). Used when primary HMIS is down. */
export const API_FALLBACK_URL = __DEV__ ? '' : '';

/** How often to refresh clinical snapshot while app is open (ms). */
export const CLINICAL_SYNC_INTERVAL_MS = 5 * 60 * 1000;

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@kakamega_field_auth_token',
  USER_DATA: '@kakamega_field_user_data',
  TEMPLATES_CACHE: '@kakamega_field_templates',
  PENDING_SUBMISSIONS: '@kakamega_field_pending_submissions',
  PENDING_CHEMIST_ACTIONS: '@kakamega_field_pending_chemist',
  PENDING_ASSET_VERIFICATIONS: '@kakamega_field_pending_assets',
  PENDING_CONSULTATIONS: '@kakamega_field_pending_consultations',
  VISIT_DRAFT: '@kakamega_field_visit_draft',
  CONSULTATION_DRAFT: '@kakamega_field_consultation_draft',
  CLINICAL_SNAPSHOT: '@kakamega_field_clinical_snapshot',
  CLINICAL_SNAPSHOT_TS: '@kakamega_field_clinical_snapshot_ts',
  CACHE_TIMESTAMP: '@kakamega_field_cache_ts',
  REFERRALS_CACHE: '@kakamega_field_referrals',
  ASSETS_CACHE: '@kakamega_field_assets',
  CHEMIST_DRUGS_CACHE: '@kakamega_field_chemist_drugs',
  CURRENT_BRANCH_ID: '@kakamega_field_current_branch_id',
  CURRENT_SERVICE_POINT_ID: '@kakamega_field_current_service_point_id',
};

export const APP_VERSION = '1.0.7';

/** Kakamega County green + HMIS blue accent */
export const THEME = {
  primary: '#006B3F',
  primaryDark: '#004D2E',
  accent: '#0F4C75',
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1A1A1A',
  textMuted: '#666666',
  border: '#E0E0E0',
  danger: '#C62828',
  warning: '#F57C00',
  success: '#2E7D32',
};
