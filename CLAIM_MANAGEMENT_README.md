# Insurance Claim Management System with Requirements Checklist

## Overview

This system provides a comprehensive claim management process that ensures all requirements for insurance claims (especially SHA claims) are addressed before submission. The system includes:

1. **Database Schema** for claim requirements/checklists
2. **API Routes** for managing claims and requirements
3. **Frontend Components** for viewing and managing claim requirements
4. **Validation** to prevent claim submission until all required items are completed

## Database Schema

### Tables Created

1. **`claim_requirement_templates`** - Stores provider-specific requirement templates
   - Links to insurance providers
   - Can be provider-specific or general (for all providers)

2. **`claim_requirements`** - Individual requirements within a template
   - Requirement types: document, information, verification, authorization, other
   - Can be marked as required or optional
   - Has display order for organization

3. **`claim_requirement_completions`** - Tracks completion status for each requirement per claim
   - Links requirements to specific claims
   - Stores completion status, documents, notes, and verification

4. **`insurance_claims`** - Enhanced with `requirementsMet` column
   - Tracks whether all required requirements are completed

## Setup Instructions

### 1. Run Database Migrations

```bash
# Run the schema migration
mysql -u your_user -p your_database < api/database/22_claim_requirements_schema.sql

# Run the SHA sample requirements (adjust provider ID if needed)
mysql -u your_user -p your_database < api/database/23_sha_claim_requirements_sample.sql
```

### 2. Customize Requirements

Edit `api/database/23_sha_claim_requirements_sample.sql` to match your actual SHA claim requirements. The current file includes example requirements such as:

- Completed Claim Form
- Medical Report
- Laboratory Results
- Prescription Records
- Invoice/Bill
- Receipts
- Patient Identification
- Member Details
- Service Dates
- Diagnosis Codes
- Procedure Codes
- Authorization Verification
- Coverage Verification
- Provider Credentials

### 3. Add Requirements for Other Providers

To add requirements for other insurance providers:

1. Get the provider ID from the `insurance_providers` table
2. Create a new template in `claim_requirement_templates`
3. Add requirements to `claim_requirements` linked to that template

Example SQL:

```sql
-- Get provider ID
SET @provider_id = (SELECT providerId FROM insurance_providers WHERE providerCode = 'AAR' LIMIT 1);

-- Create template
INSERT INTO claim_requirement_templates (providerId, templateName, description, isActive, isRequired)
VALUES (@provider_id, 'AAR Claim Requirements', 'Requirements for AAR claims', TRUE, TRUE);

SET @template_id = LAST_INSERT_ID();

-- Add requirements
INSERT INTO claim_requirements (templateId, requirementCode, requirementName, description, requirementType, isRequired, displayOrder)
VALUES
(@template_id, 'AAR-001', 'Claim Form', 'Completed AAR claim form', 'document', TRUE, 1),
(@template_id, 'AAR-002', 'Medical Report', 'Detailed medical report', 'document', TRUE, 2);
```

## API Endpoints

### Claims

- `GET /api/insurance/claims` - Get all claims (with filters: status, providerId, patientId, search)
- `GET /api/insurance/claims/:id` - Get claim details with requirements
- `POST /api/insurance/claims` - Create new claim (automatically initializes requirements)
- `PUT /api/insurance/claims/:id` - Update claim (validates requirements before submission)

### Claim Requirements

- `GET /api/insurance/claims/:id/requirements` - Get requirements for a claim
- `PUT /api/insurance/claims/:id/requirements/:requirementId` - Update requirement completion status

### Provider Requirements

- `GET /api/insurance/providers/:id/requirements` - Get requirement template for a provider

## Frontend Components

### 1. Claim Details Dialog (`components/claim-details-dialog.tsx`)

A comprehensive dialog that shows:
- Claim information (amount, date, invoice, policy)
- Requirements checklist with completion status
- Progress indicator showing completion percentage
- Ability to mark requirements as complete/incomplete
- Submit button (only enabled when all required items are complete)

### 2. Insurance Claims Table (`components/insurance-claims-table.tsx`)

Updated table that:
- Fetches real claim data from API
- Shows requirements completion status
- Provides "View Details & Requirements" action
- Integrates with Claim Details Dialog

## Usage Workflow

### Creating a Claim

1. When a claim is created via `POST /api/insurance/claims`:
   - The system automatically identifies the provider
   - Finds the requirement template for that provider
   - Initializes all requirements as incomplete
   - Links requirements to the claim

### Completing Requirements

1. Open the claim details dialog
2. Review the requirements checklist
3. Mark each requirement as complete as you gather/verify the information
4. The system tracks:
   - Completion status
   - Completion date
   - Who completed it
   - Associated documents (if uploaded)
   - Notes

### Submitting a Claim

1. All **required** requirements must be completed
2. The system validates this before allowing submission
3. Once submitted, the claim status changes to "submitted"
4. Requirements can still be updated, but submission cannot be undone

## Features

### ✅ Requirement Validation

- Prevents claim submission if required requirements are incomplete
- Shows clear indicators for required vs optional items
- Progress tracking with percentage completion

### ✅ Provider-Specific Requirements

- Each provider can have their own set of requirements
- Requirements can be shared across providers (set providerId to NULL)
- Easy to add/modify requirements per provider

### ✅ Requirement Types

- **Document**: Physical documents that need to be uploaded/verified
- **Information**: Data that needs to be collected/entered
- **Verification**: Items that need verification (e.g., coverage, authorization)
- **Authorization**: Pre-authorization numbers or approvals
- **Other**: Custom requirement types

### ✅ Completion Tracking

- Tracks who completed each requirement
- Records completion date/time
- Stores associated documents and notes
- Supports verification workflow

## Customization

### Adding New Requirement Types

1. Update the `requirementType` ENUM in the schema if needed
2. Add icons/logic in `claim-details-dialog.tsx` for the new type

### Modifying Requirements

Requirements can be:
- Added via SQL INSERT statements
- Modified via SQL UPDATE statements
- Deactivated (not deleted) by setting `isActive = FALSE`
- Reordered by changing `displayOrder`

### Adding Document Upload

Currently, the system tracks document paths. To add actual file upload:

1. Implement file upload endpoint
2. Store uploaded files
3. Update `documentPath` when marking requirements complete
4. Add file viewer/download in the claim details dialog

## Troubleshooting

### Requirements Not Showing

- Check that a requirement template exists for the provider
- Verify the template is active (`isActive = 1`)
- Ensure requirements are linked to the template
- Check that requirements are active

### Cannot Submit Claim

- Verify all required requirements are marked as complete
- Check the requirements summary in the claim details
- Look for any validation errors in the API response

### Requirements Not Initializing

- Ensure the provider has a requirement template
- Check that the template has active requirements
- Verify the claim creation process completed successfully

## Future Enhancements

- [ ] Document upload functionality
- [ ] Requirement verification workflow
- [ ] Email notifications for incomplete requirements
- [ ] Bulk requirement updates
- [ ] Requirement templates management UI
- [ ] Export requirements checklist as PDF
- [ ] Integration with document management system









