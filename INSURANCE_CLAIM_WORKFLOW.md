# Insurance Claim Management Workflow

## Complete Workflow: Patient Registration → Treatment → Billing → Claim Submission

This document describes the complete workflow for managing insurance patients from registration through claim submission.

## 1. Patient Registration with Insurance

### Step 1: Register Patient with Insurance Type

When registering a patient:
- Select **Patient Type**: "Insurance"
- Select **Insurance Company** from dropdown
- Enter **Insurance Number** (member/policy number)

### Step 2: Create Insurance Policy (Automatic or Manual)

**Option A: Automatic Policy Creation (Recommended)**
When a patient is registered with insurance, the system can automatically create a `patient_insurance` policy record linking the patient to the insurance provider.

**Option B: Manual Policy Creation**
If automatic creation is not enabled, manually create the policy:
1. Go to Insurance Management → Policies
2. Create new policy for the patient
3. Link to the insurance provider selected during registration
4. Enter policy details (policy number, member ID, coverage dates)

### Implementation Note
The system currently requires manual creation of `patient_insurance` policies. To enable automatic creation, modify the patient registration endpoint to create a policy when `patientType === 'insurance'`.

## 2. Patient Visit & Treatment

### Step 1: Patient Encounter
- Patient arrives for treatment
- Doctor creates encounter record
- Services are provided (consultations, lab tests, procedures, medications)

### Step 2: Services Billing
- Services are automatically billed or manually added to invoice
- Invoice is created with all services provided
- For insurance patients, invoice status is typically "pending" until claim is processed

## 3. Invoice Creation & Insurance Detection

### Automatic Detection
When an invoice is created:
1. System checks patient's `patientType`
2. If `patientType === 'insurance'`:
   - System looks for active `patient_insurance` policy
   - If found, invoice response includes `insuranceInfo` with:
     - Provider details
     - Policy information
     - Ability to create claim
   - If not found, shows warning to create policy first

### Invoice Response Structure
```json
{
  "invoiceId": 123,
  "invoiceNumber": "INV-20240101-0001",
  "totalAmount": 15000,
  "insuranceInfo": {
    "hasInsurance": true,
    "canCreateClaim": true,
    "patientInsurance": {
      "patientInsuranceId": 45,
      "providerName": "SHA",
      "providerCode": "SHA",
      "policyNumber": "POL-123456",
      "memberId": "MEM-789"
    },
    "existingClaim": null
  }
}
```

## 4. Claim Creation Workflow

### Step 1: View Invoice Insurance Information
- Navigate to Patient Profile → Billing tab
- Each invoice shows insurance claim status
- Click "Create Insurance Claim" button if no claim exists

### Step 2: Create Claim from Invoice
1. System validates:
   - Patient has active insurance policy
   - No existing claim for this invoice
   - Invoice is valid
2. Claim is created with:
   - Auto-generated claim number (e.g., `CLM-202401-0001`)
   - Status: "draft"
   - Linked to invoice and patient insurance policy
3. Requirements are automatically initialized:
   - System finds requirement template for the insurance provider
   - Creates requirement completion records (all marked incomplete)
   - Links requirements to the claim

### Step 3: Complete Requirements
1. Open claim details dialog
2. Review requirements checklist
3. Mark each requirement as complete:
   - Upload documents (if applicable)
   - Add notes
   - Verify information
4. System tracks:
   - Completion status
   - Who completed it
   - When it was completed
   - Associated documents

### Step 4: Submit Claim
1. System validates all **required** requirements are complete
2. If validation passes:
   - Claim status changes to "submitted"
   - Submission date is recorded
   - Claim cannot be edited (requirements can still be updated)
3. If validation fails:
   - Shows list of incomplete required items
   - Prevents submission until all required items are complete

## 5. Claim Tracking

### Claim Statuses
- **draft**: Claim created but not submitted
- **submitted**: Claim submitted to insurance provider
- **under_review**: Insurance provider is reviewing
- **approved**: Claim approved for payment
- **partially_approved**: Partial approval
- **rejected**: Claim rejected
- **paid**: Payment received from insurance

### Tracking Features
- View claim details with requirements status
- See completion percentage
- Track which requirements are complete/incomplete
- View claim history and status updates

## 6. Integration Points

### API Endpoints

#### Invoice Insurance Info
```
GET /api/billing/invoices/:id/insurance-info
```
Returns insurance information for an invoice's patient, including:
- Whether patient has insurance
- Active insurance policy details
- Whether claim can be created
- Existing claim information (if any)

#### Create Claim from Invoice
```
POST /api/billing/invoices/:id/create-claim
Body: {
  authorizationId?: number,
  notes?: string
}
```
Creates a new insurance claim from an invoice.

#### Claim Management
```
GET /api/insurance/claims/:id
PUT /api/insurance/claims/:id/requirements/:requirementId
GET /api/insurance/claims/:id/requirements
```

### Frontend Components

#### InvoiceInsuranceClaim Component
- Shows insurance status for an invoice
- Displays "Create Claim" button if applicable
- Shows existing claim status
- Opens claim details dialog

#### ClaimDetailsDialog Component
- Shows claim information
- Displays requirements checklist
- Allows marking requirements complete
- Enables claim submission

## 7. Missing Workflow: Auto-Create Insurance Policy

### Current Gap
When a patient is registered with `patientType = 'insurance'`, the system does not automatically create a `patient_insurance` policy record. This must be done manually.

### Solution: Add Auto-Creation

Modify `api/routes/patientRoutes.js` in the patient creation endpoint:

```javascript
// After patient is created, if patientType is 'insurance'
if (patientData.patientType === 'insurance' && patientData.insuranceCompanyId) {
    // Check if policy already exists
    const [existingPolicy] = await connection.execute(
        'SELECT patientInsuranceId FROM patient_insurance WHERE patientId = ? AND providerId = ?',
        [patientId, patientData.insuranceCompanyId]
    );

    if (existingPolicy.length === 0) {
        // Create insurance policy
        await connection.execute(
            `INSERT INTO patient_insurance (
                patientId, providerId, policyNumber, memberId,
                coverageStartDate, isActive
            ) VALUES (?, ?, ?, ?, CURDATE(), 1)`,
            [
                patientId,
                patientData.insuranceCompanyId,
                patientData.insuranceNumber || `POL-${patientId}`,
                patientData.insuranceNumber || null,
            ]
        );
    }
}
```

## 8. Complete User Flow

### Scenario: New Insurance Patient Visit

1. **Registration** (if new patient)
   - Register patient with insurance type
   - Select insurance company
   - Enter insurance number
   - System creates insurance policy (if auto-creation enabled)

2. **Visit & Treatment**
   - Patient arrives for consultation
   - Doctor creates encounter
   - Services provided (lab tests, procedures, medications)
   - Invoice created automatically or manually

3. **Claim Creation**
   - View invoice in Patient Billing
   - See "Create Insurance Claim" button
   - Click to create claim
   - System creates claim with requirements initialized

4. **Complete Requirements**
   - Open claim details
   - Review requirements checklist
   - Mark each requirement as complete
   - Upload documents as needed
   - Add notes where required

5. **Submit Claim**
   - Verify all required items are complete
   - Click "Submit Claim"
   - System validates and submits
   - Claim status changes to "submitted"

6. **Track Claim**
   - Monitor claim status
   - Update requirements if needed
   - Track approval/rejection
   - Record payment when received

## 9. Best Practices

1. **Verify Insurance Before Treatment**
   - Check patient has active policy
   - Verify coverage dates
   - Confirm services are covered

2. **Complete Requirements Promptly**
   - Gather all documents during visit
   - Complete requirements checklist immediately
   - Submit claim as soon as possible

3. **Track Requirements**
   - Use the checklist to ensure nothing is missed
   - Document completion with notes
   - Keep requirements updated

4. **Monitor Claims**
   - Regularly check claim status
   - Follow up on pending claims
   - Update requirements if requested by insurance

## 10. Troubleshooting

### "No active insurance policy found"
- **Cause**: Patient registered as insurance but no policy created
- **Solution**: Create insurance policy manually or enable auto-creation

### "Cannot create claim: Claim already exists"
- **Cause**: Claim already created for this invoice
- **Solution**: View existing claim instead of creating new one

### "Cannot submit claim: Required requirements incomplete"
- **Cause**: Not all required items are marked complete
- **Solution**: Complete all required items in checklist before submitting

### Requirements not showing
- **Cause**: No requirement template for insurance provider
- **Solution**: Create requirement template for the provider (see `23_sha_claim_requirements_sample.sql`)

## 11. Next Steps

1. ✅ Implement auto-creation of insurance policy on patient registration
2. ✅ Add insurance verification step before treatment
3. ✅ Add notification system for claim status updates
4. ✅ Add document upload functionality
5. ✅ Add claim export/print functionality
6. ✅ Add bulk claim operations
7. ✅ Add claim analytics and reporting








