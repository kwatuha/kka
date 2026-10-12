# MOH Reports ICD-10 Coverage Analysis

## Overview
This document analyzes which ICD-10 diagnoses are required for MOH (Ministry of Health) reports and whether they are included in the sample data.

## MOH Reports and Required Diagnoses

### MOH 705 - Morbidity Report
Tracks common diseases and conditions. Searches for:

1. **Malaria** ✅
   - Codes: B50.9, B51.9, B52.9, B53.0, B54
   - Status: **COVERED**

2. **Respiratory Infections** ✅
   - Searches for: "Respiratory", "Cough", "Pneumonia"
   - Codes: J00, J06.9, J11.1, J18.9, J20.9, J12.9, J13, J15.9, J40, J96.00
   - Status: **COVERED**

3. **Diarrheal Diseases** ✅
   - Searches for: "Diarrhea", "Diarrhoea"
   - Codes: A09.9, A04.9, A08.4, R19.7
   - Status: **COVERED**

4. **Skin Diseases** ✅
   - Searches for: "Skin", "Dermatitis", "Rash"
   - Codes: L20.9, L23.9, L50.9, L70.9, L03.90, L08.9, L40.9, L89.309
   - Status: **COVERED**

5. **Eye Diseases** ✅
   - Searches for: "Eye", "Conjunctivitis", "Vision"
   - Codes: H10.9, H52.13, H52.223, H53.9, H25.9, H40.9
   - Status: **COVERED**

6. **Injuries** ✅
   - Searches for: "Injury", "Trauma", "Fracture", "Wound"
   - Codes: S00.9, S09.9, S19.9, S29.9, S39.9, S49.9, S59.9, S69.9, S72.90XA, S79.9, S89.9, S99.9, T07, T14.0, T14.8, T79.9
   - Status: **COVERED** (after update)

7. **Tuberculosis** ✅
   - Searches for: "Tuberculosis", "TB"
   - Code: A15.9
   - Status: **COVERED**

### MOH 731+ - Key Populations Report
Tracks HIV, TB, and STI services. Searches for:

1. **HIV** ✅
   - Code: B20
   - Status: **COVERED**

2. **Tuberculosis** ✅
   - Code: A15.9
   - Status: **COVERED**

3. **STIs (Sexually Transmitted Infections)** ✅
   - Searches for: "STI", "Sexually Transmitted", "Gonorrhea", "Syphilis", "Chlamydia"
   - Codes: A50.9, A51.9, A52.9, A53.9, A54.9, A55, A56.0, A56.8, A57, A58, A59.0, A63.0, A64
   - Status: **COVERED** (after update)

## Summary

### ✅ All MOH Report Diagnoses Are Now Covered

After the latest update, all diagnoses required for MOH reports are included in the ICD-10 sample data:

- **MOH 705**: Malaria, Respiratory, Diarrhea, Skin, Eye, Injuries, TB ✅
- **MOH 731+**: HIV, TB, STIs ✅

### How to Use

1. **Load the updated ICD-10 data**:
   ```bash
   mysql -u root -p transelgon < api/database/sample_data/18_icd10_diagnoses_sample.sql
   ```

2. **When creating medical records/encounters**, select diagnoses from the ICD-10 catalog using the Diagnosis search field.

3. **MOH reports will automatically count** diagnoses that match the search patterns above.

### Important Notes

- The MOH reports use **text pattern matching** (LIKE queries) on the `diagnosis` field in `medical_records`
- For accurate reporting, use **ICD-10 codes** from the diagnoses catalog when creating medical records
- The system will match diagnoses by name, so "Malaria" will be counted even if entered as text
- However, using ICD-10 codes ensures consistency and accuracy

### Recommendations

1. **Always use ICD-10 codes** when creating diagnoses in medical records
2. **Link diagnoses to the diagnoses catalog** using `diagnosisId` when possible
3. **Store both ICD-10 code and name** in medical records for reporting accuracy
4. **Regularly update** the ICD-10 catalog with new codes as needed
