# Workflow Implementation Status

## ✅ Completed

### 1. Triage Form Enhancements
- ✅ Added service point selection (Consultation, Laboratory, Radiology, Pharmacy)
- ✅ Added doctor selection dropdown
- ✅ Updated form schema and API to save `assignedToDoctorId`, `assignedToDepartment`, and `servicePoint`
- ✅ Triage API automatically creates cashier queue after triage completion (for consultation fees payment)
- ✅ Queue priority is set based on triage category (emergency/urgent/normal)

### 2. Workflow API Endpoints Created
- ✅ `/api/workflow/triage-to-cashier` - Creates cashier queue after triage
- ✅ `/api/workflow/cashier-to-consultation` - Creates consultation queue after payment
- ✅ `/api/workflow/consultation-to-lab` - Creates laboratory queue after consultation
- ✅ `/api/workflow/prescription-to-cashier` - Creates cashier queue for drug payment
- ✅ `/api/workflow/cashier-to-pharmacy` - Creates pharmacy queue after drug payment
- ✅ `/api/workflow/queue/:id/time-summary` - Get time breakdown for queue entry
- ✅ `/api/workflow/patients/:id/queue-history` - Get all queue entries with time tracking

### 3. Time Tracking
- ✅ Helper function to calculate time differences (wait time, service time, total time)
- ✅ Time summary endpoint calculates:
  - Wait time (arrival to called/started)
  - Service time (start to end)
  - Total time (arrival to end)

### 4. Automatic Queue Creation
- ✅ **Patient Registration API** - Automatically creates cashier queue for registration fees payment
- ✅ **Triage API** - Automatically creates cashier queue after triage completion
- ✅ **Prescription API** - Automatically creates cashier queue after prescription creation (if drugs are in inventory)

### 5. API Client Functions
- ✅ Added `workflowApi` to `lib/api.ts` with all workflow endpoints
- ✅ Functions for all workflow transitions and time tracking

## 🔄 In Progress / Pending

### 6. Payment Integration
- ⏳ **Requires Invoice/Payment API endpoints first**
- ⏳ After registration fees payment → create triage queue (if not already created)
- ⏳ After consultation fees payment → call `cashierToConsultation` workflow endpoint
- ⏳ After drug payment → call `cashierToPharmacy` workflow endpoint

**Note:** The billing routes currently only have GET endpoints for invoices. POST/PUT endpoints for creating/updating invoices and recording payments need to be created before payment workflow integration can be completed.

### 7. Queue Management UI
- ⏳ Update queue management UI to show time tracking
- ⏳ Display wait time, service time for each queue entry
- ⏳ Add workflow buttons/actions for transitions
- ⏳ Show workflow status and next steps

## Workflow Flow Status

1. **Patient Registration** → Cashier Queue (Registration Fees) ✅ **AUTOMATIC**
2. **After Registration Payment** → Triage Queue ⏳ (needs payment integration)
3. **Triage Queue** → Fill Triage Form (with service point/doctor) ✅ **DONE**
4. **After Triage** → Cashier Queue (Consultation Fees) ✅ **AUTOMATIC**
5. **After Consultation Payment** → Consultation Queue ⏳ (needs payment integration)
6. **Consultation Queue** → Doctor Examination ✅ (existing functionality)
7. **After Consultation** → Either:
   - Laboratory Queue (if tests ordered) ✅ (endpoint ready)
   - OR Prescription ✅ (existing functionality)
8. **After Prescription** → Cashier Queue (Drug Payment) ✅ **AUTOMATIC** (if drugs in inventory)
9. **After Drug Payment** → Pharmacy Queue ⏳ (needs payment integration)
10. **Pharmacy Queue** → Patient collects drugs ✅ (existing functionality)

## Implementation Details

### Automatic Queue Creation Logic

#### Patient Registration → Cashier (Registration Fees)
- Location: `api/routes/patientRoutes.js` - POST `/api/patients`
- Triggers: After successful patient registration
- Creates: Cashier queue entry with notes "Registration fees payment"
- Priority: Normal
- Error Handling: Queue creation failure doesn't fail patient registration (logged only)

#### Triage → Cashier (Consultation Fees)
- Location: `api/routes/triageRoutes.js` - POST `/api/triage`
- Triggers: After successful triage record creation
- Creates: Cashier queue entry with notes "Consultation fees payment - Service: {servicePoint}"
- Priority: Based on triage category (red=emergency, yellow=urgent, green=normal)

#### Prescription → Cashier (Drug Payment)
- Location: `api/routes/pharmacyRoutes.js` - POST `/api/pharmacy/prescriptions`
- Triggers: After prescription creation
- Condition: Only creates queue if prescription has items with `quantity > 0` (drugs in inventory)
- Creates: Cashier queue entry with notes "Drug payment - Prescription: {prescNumber}"

### Next Steps (Priority Order)

1. **Create Invoice/Payment API Endpoints** (Required for payment workflow)
   - POST `/api/billing/invoices` - Create invoice
   - PUT `/api/billing/invoices/:id` - Update invoice (including status)
   - POST `/api/billing/invoices/:id/payments` - Record payment
   - Add workflow hooks to payment endpoints:
     - After registration fees payment → create triage queue
     - After consultation fees payment → call `workflowApi.cashierToConsultation()`
     - After drug payment → call `workflowApi.cashierToPharmacy()`

2. **Queue Management UI Enhancements**
   - Display time tracking (wait time, service time)
   - Show workflow status and next steps
   - Add workflow action buttons
   - Visual indicators for queue progression

3. **Testing & Refinement**
   - End-to-end workflow testing
   - Error handling improvements
   - UI/UX refinements
   - Performance optimization

## Files Modified/Created

### Created Files
- `api/routes/workflowRoutes.js` - Workflow API endpoints
- `WORKFLOW_IMPLEMENTATION_STATUS.md` - This file

### Modified Files
- `api/app.js` - Added workflow routes
- `api/routes/patientRoutes.js` - Added automatic queue creation after registration
- `api/routes/triageRoutes.js` - Added automatic queue creation after triage
- `api/routes/pharmacyRoutes.js` - Added automatic queue creation after prescription
- `lib/api.ts` - Added workflowApi client functions
- `components/add-triage-form.tsx` - Added service point and doctor selection

## Summary

The workflow system now has **3 automatic queue creation points**:
1. ✅ Patient Registration → Cashier (Registration Fees)
2. ✅ Triage → Cashier (Consultation Fees)
3. ✅ Prescription → Cashier (Drug Payment)

All workflow API endpoints are ready and functional. The main remaining work is:
- Creating invoice/payment API endpoints
- Integrating payment completion with workflow transitions
- UI enhancements for queue management and workflow visualization
