require('./config/load-env');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import route groups
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const queueRoutes = require('./routes/queueRoutes');
const billingRoutes = require('./routes/billingRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const externalChemistRoutes = require('./routes/externalChemistRoutes');
const laboratoryRoutes = require('./routes/laboratoryRoutes');
const radiologyRoutes = require('./routes/radiologyRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const patientAllergiesRoutes = require('./routes/patientAllergiesRoutes');
const patientNcdRoutes = require('./routes/patientNcdRoutes');
const patientFamilyHistoryRoutes = require('./routes/patientFamilyHistoryRoutes');
const patientDocumentsRoutes = require('./routes/patientDocumentsRoutes');
const clinicalServicesRoutes = require('./routes/clinicalServicesRoutes');
const doctorsRoutes = require('./routes/doctorsRoutes');
const inpatientRoutes = require('./routes/inpatientRoutes');
const maternityRoutes = require('./routes/maternityRoutes');
const mchRoutes = require('./routes/mchRoutes');
const clinicalServiceOrderRoutes = require('./routes/clinicalServiceOrderRoutes');
const icuRoutes = require('./routes/icuRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const mortuaryRoutes = require('./routes/mortuaryRoutes');
const triageRoutes = require('./routes/triageRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const servicePointRoutes = require('./routes/servicePointRoutes');
const medicalRecordsRoutes = require('./routes/medicalRecordsRoutes');
const nursingRoutes = require('./routes/nursingRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const vendorProductsRoutes = require('./routes/vendorProductsRoutes');
const vendorContractsRoutes = require('./routes/vendorContractsRoutes');
const vendorDocumentsRoutes = require('./routes/vendorDocumentsRoutes');
const vendorIssuesRoutes = require('./routes/vendorIssuesRoutes');
const inventoryTransactionRoutes = require('./routes/inventoryTransactionRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const employeeLeaveRoutes = require('./routes/employeeLeaveRoutes');
const employeePayrollRoutes = require('./routes/employeePayrollRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const employeePromotionRoutes = require('./routes/employeePromotionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const fhirRoutes = require('./routes/fhirRoutes');
const hieRoutes = require('./routes/hieRoutes');
const phase4Routes = require('./routes/phase4Routes');
const ihrRoutes = require('./routes/ihrRoutes');
const cqmRoutes = require('./routes/cqmRoutes');
const evidenceRoutes = require('./routes/evidenceRoutes');
const standardsRoutes = require('./routes/standardsRoutes');
const dataExchangeRoutes = require('./routes/dataExchangeRoutes');
const roleRoutes = require('./routes/roleRoutes');
const privilegeRoutes = require('./routes/privilegeRoutes');
const roleMenuRoutes = require('./routes/roleMenuRoutes');
const payableRoutes = require('./routes/payableRoutes');
const receivableRoutes = require('./routes/receivableRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const cashRoutes = require('./routes/cashRoutes');
const assetRoutes = require('./routes/assetRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const revenueShareRoutes = require('./routes/revenueShareRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const diagnosesRoutes = require('./routes/diagnosesRoutes');
const proceduresRoutes = require('./routes/proceduresRoutes');
const ambulanceRoutes = require('./routes/ambulanceRoutes');
const waiverRoutes = require('./routes/waiverRoutes');
const mohReportsRoutes = require('./routes/mohReportsRoutes');
const dataCollectionRoutes = require('./routes/dataCollectionRoutes');
const mobileAppRoutes = require('./routes/mobileAppRoutes');
const mobileClinicalRoutes = require('./routes/mobileClinicalRoutes');
const telemedicineRoutes = require('./routes/telemedicineRoutes');
const publicAppointmentRoutes = require('./routes/publicAppointmentRoutes');
const kenyaWardsRoutes = require('./routes/kenyaWardsRoutes');
const nbtmsRoutes = require('./routes/nbtmsRoutes');

const { attachUserIfPresent, requireAuthUnlessPublic, shouldEnforceAuth } = require('./middleware/apiAuth');
const { auditMutations } = require('./middleware/auditMutations');
const securitySettingsRoutes = require('./routes/securitySettingsRoutes');
const breakGlassRoutes = require('./routes/breakGlassRoutes');
const patientProblemsRoutes = require('./routes/patientProblemsRoutes');
const cdsRoutes = require('./routes/cdsRoutes');
const auditRoutes = require('./routes/auditRoutes');

const { PRODUCT_NAME } = require('./lib/productBrand');
const appName = PRODUCT_NAME;
const port = process.env.PORT || 3001;
const app = express();

// CORS configuration
// In production, allow requests from the server IP on common ports
const { allPublicOrigins, primaryPublicOrigin } = require('./lib/publicAppUrl');

const getAllowedOrigins = () => {
  const extras = allPublicOrigins()
  if (process.env.NODE_ENV === 'production') {
    const origins = []
    const primary = primaryPublicOrigin()
    const serverIP =
      primary.replace(/^https?:\/\//, '').split(':')[0] ||
      process.env.FRONTEND_URL?.replace(/^https?:\/\//, '').split(':')[0] ||
      '41.89.173.8'
    // Allow requests from the server IP on ports 80, 8081, and any port specified in FRONTEND_URL
    origins.push(`http://${serverIP}`)
    origins.push(`http://${serverIP}:80`)
    origins.push(`http://${serverIP}:8081`)
    origins.push(...extras)
    return [...new Set(origins)]
  }
  // In development, allow any localhost port (cannot use '*' with credentials: true)
  return ['__ALLOW_ANY_LOCALHOST_PORT__', ...extras]
}

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    if (
      process.env.NODE_ENV !== 'production' &&
      allowedOrigins.includes('__ALLOW_ANY_LOCALHOST_PORT__') &&
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Branch-Id'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

const jsonBodyLimit = process.env.JSON_BODY_LIMIT || '10mb';
app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonBodyLimit }));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Uploaded files — require JWT unless SERVE_UPLOADS_PUBLIC=1 (see protectedUploads.js)
const protectedUploads = require('./middleware/protectedUploads');
app.use('/uploads', protectedUploads, express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        message: `Welcome to ${appName} API`,
        version: '1.0.0',
        status: 'running'
    });
});

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);
app.use('/api/public/appointments', publicAppointmentRoutes);

// Attach JWT user when present; enforce auth for non-public routes in production
// (or when REQUIRE_API_AUTH=1). Escape hatch: DISABLE_API_AUTH=1
app.use('/api', attachUserIfPresent);
app.use('/api', requireAuthUnlessPublic);
app.use('/api', auditMutations);

console.log(
  `[auth] API auth enforcement: ${shouldEnforceAuth() ? 'ON' : 'OFF'} ` +
    `(NODE_ENV=${process.env.NODE_ENV || 'undefined'}, REQUIRE_API_AUTH=${process.env.REQUIRE_API_AUTH || ''}, DISABLE_API_AUTH=${process.env.DISABLE_API_AUTH || ''})`
);

// API routes
app.use('/api/users', userRoutes);
app.use('/api/security', securitySettingsRoutes);
app.use('/api/security', breakGlassRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/clinical/cds', cdsRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/integrations', fhirRoutes);
app.use('/api/integrations', hieRoutes);
app.use('/api/integrations', phase4Routes);
app.use('/api/integrations/ihr', ihrRoutes);
app.use('/api/reporting/cqm', cqmRoutes);
app.use('/api/integrations', evidenceRoutes);
app.use('/api/integrations', standardsRoutes);
app.use('/api/integrations', dataExchangeRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/geography/kenya-wards', kenyaWardsRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/service-points', servicePointRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/payables', payableRoutes);
app.use('/api/receivables', receivableRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/revenue-share', revenueShareRoutes);
// IMPORTANT: More specific routes must come before generic routes
app.use('/api/inventory/transactions', inventoryTransactionRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/pharmacy', externalChemistRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/laboratory', laboratoryRoutes);
app.use('/api/radiology', radiologyRoutes);
app.use('/api/inpatient', inpatientRoutes);
app.use('/api/maternity', maternityRoutes);
app.use('/api/mch', mchRoutes);
app.use('/api/clinical-service-orders', clinicalServiceOrderRoutes);
app.use('/api/icu', icuRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/mortuary', mortuaryRoutes);
app.use('/api/nbtms', nbtmsRoutes);
app.use('/api/triage', triageRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/nursing', nursingRoutes);
app.use('/api/telemedicine', telemedicineRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/roles', roleMenuRoutes); // Role menu/tab configuration routes
app.use('/api/privileges', privilegeRoutes);
// Employee sub-routes must come before main employee routes
app.use('/api/payroll', payrollRoutes);
app.use('/api/employees', employeeLeaveRoutes);
app.use('/api/employees', employeePayrollRoutes);
app.use('/api/employees', employeePromotionRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/patients', patientAllergiesRoutes);
app.use('/api/patients', patientNcdRoutes);
app.use('/api/patients', patientProblemsRoutes);
app.use('/api/patients', patientFamilyHistoryRoutes);
app.use('/api/patients', patientDocumentsRoutes);
app.use('/api/clinical-services', clinicalServicesRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/medical-records', medicalRecordsRoutes);
app.use('/api/diagnoses', diagnosesRoutes);
app.use('/api/procedures', proceduresRoutes);
app.use('/api/ambulance', ambulanceRoutes);
app.use('/api/waivers', waiverRoutes);
app.use('/api/moh-reports', mohReportsRoutes);
app.use('/api/data-collection', dataCollectionRoutes);
app.use('/api/mobile-app', mobileAppRoutes);
app.use('/api/mobile', mobileClinicalRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/procurement/purchase-orders', purchaseOrderRoutes);
// Vendor sub-routes must be mounted with more specific paths BEFORE main vendor routes to avoid route conflicts
// These routes use /:vendorId/products pattern, so they need to be checked before /:id pattern
app.use('/api/procurement/vendors', vendorProductsRoutes);
app.use('/api/procurement/vendors', vendorContractsRoutes);
app.use('/api/procurement/vendors', vendorDocumentsRoutes);
app.use('/api/procurement/vendors', vendorIssuesRoutes);
// Main vendor routes (/:id, /:id/ratings) - must come after sub-routes
app.use('/api/procurement/vendors', vendorRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

app.listen(port, () => {
    console.log(`${appName} API server running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    try {
        const { startOutboxPublisher } = require('./lib/outboxPublisher');
        startOutboxPublisher();
    } catch (err) {
        console.warn('[outbox] publisher not started:', err.message || err);
    }

    // Advanta SMS health check (non-blocking)
    try {
        const { isAdvantaConfigured, getAdvantaBalance } = require('./lib/advantaSms');
        if (isAdvantaConfigured()) {
            getAdvantaBalance()
                .then((bal) => {
                    console.log('[advantaSms] configured; balance response:', JSON.stringify(bal));
                })
                .catch((err) => {
                    console.warn('[advantaSms] configured but balance check failed:', err.message || err);
                });
        } else {
            console.log('[advantaSms] not configured (set ADVANTA_API_KEY, ADVANTA_PARTNER_ID, ADVANTA_SHORT_CODE)');
        }
    } catch (err) {
        console.warn('[advantaSms] startup check skipped:', err.message || err);
    }

    try {
        const { isDailyConfigured, getDailyDomain } = require('./lib/dailyVideo');
        if (isDailyConfigured()) {
            getDailyDomain()
                .then((dom) => {
                    console.log('[dailyVideo] configured; domain:', dom?.domain_name || dom?.name || JSON.stringify(dom).slice(0, 120));
                })
                .catch((err) => {
                    console.warn('[dailyVideo] configured but domain check failed:', err.message || err);
                });
        } else {
            console.log('[dailyVideo] not configured (set DAILY_API_KEY for default telemedicine rooms)');
        }
    } catch (err) {
        console.warn('[dailyVideo] startup check skipped:', err.message || err);
    }
    try {
        const { isMpesaConfigured, getCallbackUrl, resolveMpesaProvider, getMpesaProviderInfo } = require('./lib/mpesaStk');
        if (isMpesaConfigured()) {
            const cb = getCallbackUrl();
            console.log('[mpesaStk] configured; provider:', resolveMpesaProvider(), 'callback:', cb || '(set MPESA_CALLBACK_URL)');
        } else {
            const info = getMpesaProviderInfo();
            console.log(
                '[mpesaStk] not configured — set Daraja MPESA_DARAJA_CONSUMER_KEY/SECRET/PASSKEY/SHORTCODE or Cloudsasa CLOUD_SASA_* (daraja partial:',
                info.daraja,
                ')'
            );
        }
    } catch (err) {
        console.warn('[mpesaStk] startup check skipped:', err.message || err);
    }
});

module.exports = app;

