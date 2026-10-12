# Patient 3 Comprehensive Sample Data

This script (`17_patient_3_comprehensive_data.sql`) creates comprehensive sample data for Patient 3 (Mary Mwangangi) to match the quality and detail of the hardcoded UI examples.

## What's Included

The script populates the following data for Patient 3:

### ✅ Medical Records
- 4 consultation records with diagnoses, treatments, and prescriptions
- Dates: January 2023, February 2023, March 2023, April 2023

### ✅ Vital Signs
- 4 vital sign recordings
- Includes BP, heart rate, temperature, SpO2, weight, height

### ✅ Allergies
- 2 active allergies (Penicillin - severe, Peanuts - moderate)

### ✅ Prescriptions & Medications
- 5 prescriptions (3 active, 2 past)
- Active: Lisinopril, Aspirin, Atorvastatin (pending)
- Past: Metformin (discontinued), Amoxicillin (completed)

### ✅ Laboratory Tests
- 5 lab test orders (3 completed, 2 pending)
- Completed: CBC, Lipid Panel, Metabolic Panel, Urinalysis, Liver Function Tests
- Detailed result values for all completed tests

### ✅ Appointments
- 5 appointments (2 upcoming, 3 past)
- Upcoming: Cardiology follow-up, Ophthalmology exam
- Past: Cardiology, Internal Medicine, Neurology

### ✅ Invoices & Billing
- 4 invoices (3 paid, 1 pending)
- Detailed invoice items with service charges
- Payment records for paid invoices

### ⚠️ Medical Documents
- Note: Documents table doesn't exist yet
- Documents can be added when the table is created

### ✅ Insurance
- SHA insurance coverage information

## Running the Script

```bash
docker exec -i kiplombe_mysql mysql -u kiplombe_user -pkiplombe_password kiplombe_hmis < api/database/sample_data/17_patient_3_comprehensive_data.sql
```

## Notes

- The script uses `INSERT IGNORE` to avoid duplicate key errors
- Doctor users are created if they don't exist
- Service charges are created if they don't exist
- All dates are set relative to current date for realistic demo data

## Next Steps

After running this script, the patient details page at `/patients/3` should display:
- Comprehensive medical overview with all the data above
- Active allergies with severity indicators
- Latest vital signs
- Recent medical records
- Current and past medications
- Lab results with detailed values
- Upcoming and past appointments
- Billing history

