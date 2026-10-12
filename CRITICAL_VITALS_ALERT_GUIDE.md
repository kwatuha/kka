# Critical Vitals Alert System

## Overview

The Critical Vitals Alert system automatically detects when a patient has extreme clinical values that require urgent medical attention. When such values are detected, a prominent popup window appears to alert doctors immediately.

## How It Works

### 1. Configuration (Clinical Configuration)

Administrators configure critical value ranges in:
- **Location**: Administration → Clinical Configuration
- **Component**: `components/administration/critical-vitals-configuration.tsx`
- **Database Table**: `critical_vital_ranges`

### 2. Detection

When a doctor opens the **Patient Encounter Form**:
- The system loads the patient's most recent vital signs (`todayVitals`)
- It compares these values against the configured critical ranges
- If any value falls outside the critical range, an alert is triggered

### 3. Alert Display

The alert appears as a **modal popup** that:
- Shows immediately when critical values are detected
- Cannot be dismissed without acknowledgment
- Displays all critical/urgent values with details
- Shows patient name for context
- Requires doctor to acknowledge before continuing

## Critical Value Ranges

The system checks these vital parameters:

- **Systolic Blood Pressure** (mmHg)
- **Diastolic Blood Pressure** (mmHg)
- **Heart Rate** (bpm)
- **Respiratory Rate** (bpm)
- **Temperature** (°C)
- **Oxygen Saturation (SpO2)** (%)
- **Glasgow Coma Scale (GCS)** (3-15)
- **Blood Glucose** (mg/dL or mmol/L)

## Alert Severity Levels

### Critical (Red Alert)
- Values that are **extremely** outside normal range
- Indicates life-threatening condition
- Requires immediate medical intervention

### Urgent (Orange Alert)
- Values outside normal range but less extreme
- Still requires prompt attention
- May indicate developing critical condition

## Setting Up Critical Ranges

### Example Critical Ranges

1. **Heart Rate**
   - Critical Low: < 40 bpm (severe bradycardia)
   - Critical High: > 150 bpm (severe tachycardia)

2. **Blood Pressure**
   - Systolic Critical Low: < 90 mmHg (hypotension)
   - Systolic Critical High: > 180 mmHg (hypertensive crisis)
   - Diastolic Critical High: > 120 mmHg

3. **Temperature**
   - Critical High: > 40°C (hyperthermia)
   - Critical Low: < 35°C (hypothermia)

4. **Oxygen Saturation**
   - Critical Low: < 90% (severe hypoxemia)

5. **Respiratory Rate**
   - Critical Low: < 10 bpm (respiratory depression)
   - Critical High: > 30 bpm (severe tachypnea)

6. **Glasgow Coma Scale**
   - Critical Low: < 8 (severe brain injury)

## Where It Appears

The alert appears in:
- **Patient Encounter Form** - When doctor opens encounter for a patient with critical vitals
- **Shown to Doctors** - Only visible to users with doctor/clinical roles

## Component Details

### CriticalVitalsAlert Component
- **Location**: `components/critical-vitals-alert.tsx`
- **Props**:
  - `vitals`: Patient's vital signs object
  - `patientName`: Patient's name (optional)
  - `open`: Boolean to control dialog visibility
  - `onOpenChange`: Callback when dialog state changes

### Integration
- **Integrated in**: `components/patient-encounter-form.tsx`
- **Triggers**: Automatically when `todayVitals` are loaded and contain critical values

## Testing the Alert

### Method 1: Configure Critical Ranges
1. Go to Administration → Clinical Configuration
2. Add a critical range (e.g., Heart Rate < 50 bpm)
3. Open Patient Encounter Form for a patient with heart rate < 50
4. Alert should appear automatically

### Method 2: Test with Sample Data
1. Create a patient with extreme vital signs
2. Record vitals with values outside normal range
3. Open encounter form for that patient
4. Alert should trigger

## Customization

### Adjusting Severity Thresholds

In `components/critical-vitals-alert.tsx`, line ~120:

```typescript
const severity: 'critical' | 'urgent' = 
  (isCriticalLow && range.criticalLowValue && value < range.criticalLowValue * 0.8) ||
  (isCriticalHigh && range.criticalHighValue && value > range.criticalHighValue * 1.2)
    ? 'critical'
    : 'urgent'
```

Adjust the multipliers (0.8 and 1.2) to change when values are considered "critical" vs "urgent".

### Adding New Vital Parameters

1. Add parameter to `critical_vital_ranges` table
2. Update `checkCriticalVitals()` function in `critical-vitals-alert.tsx`
3. Add case in the switch statement for the new parameter
4. Add display name in `getParameterDisplayName()` function

## API Endpoints

- `GET /api/triage/critical-vital-ranges` - Get all critical ranges
- `POST /api/triage/critical-vital-ranges` - Create new range
- `PUT /api/triage/critical-vital-ranges/:id` - Update range
- `DELETE /api/triage/critical-vital-ranges/:id` - Delete range

## Database Schema

```sql
CREATE TABLE critical_vital_ranges (
    criticalVitalId INT PRIMARY KEY AUTO_INCREMENT,
    vitalParameter VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    criticalLowValue DECIMAL(10, 2) NULL,
    criticalHighValue DECIMAL(10, 2) NULL,
    description TEXT,
    isActive BOOLEAN DEFAULT TRUE,
    ...
)
```

## Best Practices

1. **Set Realistic Ranges**: Use evidence-based medical guidelines
2. **Regular Review**: Review and update ranges based on clinical outcomes
3. **Documentation**: Add descriptions explaining why ranges are critical
4. **Training**: Ensure doctors understand the alert system
5. **False Positives**: Adjust ranges if too many false alerts occur

## Troubleshooting

### Alert Not Showing

1. **Check if ranges are configured:**
   ```sql
   SELECT * FROM critical_vital_ranges WHERE isActive = 1;
   ```

2. **Check if patient has vitals:**
   - Verify `todayVitals` is loaded in encounter form
   - Check browser console for errors

3. **Check API connection:**
   - Verify `/api/triage/critical-vital-ranges` endpoint works
   - Check network tab in browser DevTools

### Alert Showing Too Often

- Review critical ranges - may be too strict
- Adjust severity thresholds
- Consider patient population (pediatric vs adult ranges)

### Alert Not Showing When It Should

- Verify critical ranges are active (`isActive = 1`)
- Check that vital values are being recorded correctly
- Verify the parameter names match (case-sensitive)





