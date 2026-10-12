# Patient Encounter Form - Consultation Queue Integration

## Overview

The Patient Encounter Form has been successfully integrated into the consultation queue workflow. When a doctor calls a patient from the consultation queue, they can immediately start documenting the encounter using the comprehensive encounter form.

## Integration Details

### Location
- **Component**: `components/call-patient-panel.tsx`
- **Service Point**: Consultation queue only
- **Trigger**: When a patient is called or manually via "Start Encounter" button

### Features

1. **Auto-Open on Call**
   - When a doctor calls the next patient in the consultation queue, the encounter form automatically opens
   - Patient ID and Doctor ID are pre-populated
   - Saves time and ensures documentation starts immediately

2. **Manual Access**
   - "Start Encounter" button appears when a patient is being served
   - Available only for consultation service point
   - Can be opened at any time during the consultation

3. **Pre-Populated Data**
   - **Patient ID**: Automatically set from the queue entry
   - **Doctor ID**: Retrieved from authentication context or JWT token
   - **Encounter Date**: Defaults to current date

4. **Workflow Integration**
   - After saving the encounter, a success notification is shown
   - Option to automatically complete the service after encounter is saved (currently commented out)
   - Queue status can be updated after encounter completion

## User Flow

### For Doctors Using Consultation Queue

1. **Navigate to Queue Dashboard**
   - Go to `/queue/service` or Service Point Dashboard
   - Select "Consultation" tab

2. **Call Next Patient**
   - Click "Call Next Patient" button
   - Patient status changes to "in-service"
   - **Encounter form automatically opens** with patient pre-selected

3. **Document Encounter**
   - Review patient summary (allergies, medications, lab results)
   - Document chief complaint, diagnosis, treatment
   - Order lab tests if needed
   - Prescribe medications
   - Review patient history

4. **Save Encounter**
   - Click "Save Encounter"
   - All records created (medical record, prescriptions, lab orders)
   - Success notification displayed
   - Form closes automatically

5. **Complete Service**
   - Click "Complete Service" button
   - Patient status updated to "completed"
   - Next patient can be called

### Alternative Flow (Manual)

1. Call patient from queue
2. Click "Start Encounter" button manually
3. Complete encounter documentation
4. Save and complete service

## Technical Implementation

### Component Structure

```tsx
<CallPatientPanel servicePoint="consultation" staffName="Dr. Name" />
  ├── Patient queue display
  ├── Call next patient button
  ├── Current patient info
  ├── "Start Encounter" button (consultation only)
  └── <PatientEncounterForm />
      ├── initialPatientId={currentPatient.patientId}
      ├── initialDoctorId={currentDoctorId}
      └── onSuccess callback
```

### Key Code Sections

1. **Auto-open on call**:
```tsx
if (servicePoint === "consultation") {
  setEncounterFormOpen(true)
}
```

2. **Conditional button display**:
```tsx
{servicePoint === "consultation" && (
  <Button onClick={() => setEncounterFormOpen(true)}>
    Start Encounter
  </Button>
)}
```

3. **Form integration**:
```tsx
{servicePoint === "consultation" && currentPatient && (
  <PatientEncounterForm
    open={encounterFormOpen}
    onOpenChange={setEncounterFormOpen}
    initialPatientId={currentPatient.patientId}
    initialDoctorId={currentDoctorId}
    onSuccess={() => {
      // Show success notification
    }}
  />
)}
```

## Benefits

1. **Streamlined Workflow**
   - No need to manually search for patient
   - No need to open separate forms
   - All information in one place

2. **Reduced Errors**
   - Patient ID automatically set
   - Doctor ID automatically retrieved
   - Patient allergies visible immediately

3. **Time Savings**
   - Auto-opens on patient call
   - Pre-populated fields
   - Single submission for all records

4. **Better Documentation**
   - Comprehensive encounter form ensures complete documentation
   - All related actions (lab orders, prescriptions) in one place
   - Patient history easily accessible

## Configuration

### Auto-Complete Service After Encounter

To automatically complete the service after encounter is saved, uncomment this line in `call-patient-panel.tsx`:

```tsx
onSuccess={() => {
  toast({
    title: "Encounter Saved",
    description: `Encounter for ${currentPatient.patientName} has been saved successfully.`,
  })
  // Uncomment to auto-complete service:
  handleCompleteService()
}}
```

### Disable Auto-Open

To disable auto-opening the encounter form when calling a patient, remove or comment out:

```tsx
// Auto-open encounter form for consultation service point
if (servicePoint === "consultation") {
  setEncounterFormOpen(true)
}
```

## Future Enhancements

Potential improvements:
- Integration with queue API for real-time updates
- Auto-update queue status when encounter is saved
- Integration with billing/charges
- Print encounter summary option
- Quick actions (common diagnoses, medications)
- Template-based documentation

## Testing

To test the integration:

1. Navigate to `/queue/service`
2. Select "Consultation" tab
3. Ensure there are patients in the queue
4. Click "Call Next Patient"
5. Verify encounter form opens automatically
6. Complete encounter documentation
7. Save encounter
8. Verify success notification
9. Complete service

## Support

- Component: `components/call-patient-panel.tsx`
- Encounter Form: `components/patient-encounter-form.tsx`
- Queue Data: `lib/data/queue-data.ts`
- Queue API: `api/routes/queueRoutes.js`


