# ICD-10 Diagnoses Sample Data

## Overview

The ICD-10 diagnoses are stored in your **local database** (not an external API), which means:
- ✅ **Works offline** - No internet connection required once data is loaded
- ✅ **Fast searches** - All searches happen locally
- ✅ **Full control** - You can add, edit, or remove diagnoses as needed

## Loading Sample Data

### Option 1: Load Sample ICD-10 Data (Recommended for Testing)

The file `18_icd10_diagnoses_sample.sql` contains common ICD-10 codes that are frequently used in general practice.

To load it:

```bash
# Using MySQL command line
mysql -u your_username -p your_database_name < api/database/sample_data/18_icd10_diagnoses_sample.sql

# Or using MySQL Workbench / phpMyAdmin
# Just open and execute the SQL file
```

### Option 2: Import Full ICD-10 Catalog

For a complete ICD-10 catalog (thousands of codes), you can:
1. Download the official ICD-10 catalog from WHO or your country's health authority
2. Convert it to SQL format
3. Import into the `diagnoses` table

The table structure supports:
- `icd10Code` - The ICD-10 code (e.g., "I10", "E11.9")
- `diagnosisName` - Full diagnosis name
- `category` - Category/group (e.g., "Cardiovascular", "Respiratory")
- `description` - Additional description
- `isActive` - Whether the diagnosis is active (1) or inactive (0)

## Search Examples

Once data is loaded, you can search by:

1. **ICD-10 Code**: 
   - `I10` → Essential hypertension
   - `E11.9` → Type 2 diabetes mellitus
   - `J18.9` → Pneumonia

2. **Diagnosis Name**:
   - `hypertension` → Finds all hypertension-related diagnoses
   - `diabetes` → Finds diabetes diagnoses
   - `pneumonia` → Finds pneumonia

3. **Category**:
   - `Cardiovascular` → All cardiovascular diagnoses
   - `Respiratory` → All respiratory diagnoses
   - `Infectious` → All infectious diseases

4. **Partial Matches**:
   - `hyper` → Finds hypertension, hyperglycemia, etc.
   - `cardio` → Finds cardiovascular-related diagnoses

## Adding Diagnoses via API

You can also add diagnoses programmatically via the API:

```bash
POST /api/diagnoses
{
  "icd10Code": "I10",
  "diagnosisName": "Essential (primary) hypertension",
  "category": "Cardiovascular",
  "description": "High blood pressure"
}
```

## Common ICD-10 Codes Included in Sample

The sample data includes common codes for:
- Cardiovascular diseases (hypertension, heart failure, etc.)
- Respiratory diseases (pneumonia, asthma, COPD, etc.)
- Endocrine disorders (diabetes, hyperlipidemia, etc.)
- Infectious diseases (pneumonia, UTI, etc.)
- Mental health (depression, anxiety, etc.)
- Musculoskeletal (back pain, knee pain, etc.)
- And many more...

## Troubleshooting

**Q: I see "Start typing to search for ICD-10 diagnoses..." but no results appear**

A: The diagnoses table is likely empty. Load the sample data using Option 1 above.

**Q: Can I add my own custom diagnoses?**

A: Yes! You can add diagnoses via the API or directly in the database. They don't need to have ICD-10 codes - you can use custom codes or leave it null.

**Q: Does this require internet connection?**

A: No! All data is stored locally in your database. Once loaded, it works completely offline.

