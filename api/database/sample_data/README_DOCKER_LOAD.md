# Loading ICD-10 Diagnoses Data Using Docker

## Quick Start

To load the ICD-10 diagnoses data into your Docker MySQL container:

```bash
./api/database/sample_data/load_icd10_diagnoses.sh docker
```

This will use the default Docker container (`kiplombe_mysql`) and database (`kiplombe_hmis`).

## Custom Configuration

If your Docker setup uses different names:

```bash
./api/database/sample_data/load_icd10_diagnoses.sh docker [container_name] [database_name] [username] [password]
```

### Example:
```bash
./api/database/sample_data/load_icd10_diagnoses.sh docker kiplombe_mysql kiplombe_hmis kiplombe_user kiplombe_password
```

## Direct MySQL (Non-Docker)

If you're not using Docker, you can still use the script:

```bash
./api/database/sample_data/load_icd10_diagnoses.sh [database_name] [username] [password]
```

## Manual Docker Command

Alternatively, you can run the SQL file directly using Docker:

```bash
docker exec -i kiplombe_mysql mysql -u kiplombe_user -pkiplombe_password kiplombe_hmis < api/database/sample_data/18_icd10_diagnoses_sample.sql
```

## Verification

After loading, verify the data was loaded correctly:

```bash
# Count total diagnoses
docker exec kiplombe_mysql mysql -u kiplombe_user -pkiplombe_password kiplombe_hmis -e "SELECT COUNT(*) as total FROM diagnoses WHERE isActive = 1;"

# Check for specific diagnoses (e.g., Malaria)
docker exec kiplombe_mysql mysql -u kiplombe_user -pkiplombe_password kiplombe_hmis -e "SELECT * FROM diagnoses WHERE diagnosisName LIKE '%Malaria%' AND isActive = 1;"
```

## What's Included

The ICD-10 sample data includes:
- ✅ **188+ diagnoses** covering common medical conditions
- ✅ **All MOH 705 Morbidity Report diagnoses**: Malaria, Respiratory, Diarrhea, Skin, Eye, Injuries, TB
- ✅ **All MOH 731+ Key Populations Report diagnoses**: HIV, TB, STIs (Syphilis, Gonorrhea, Chlamydia, etc.)
- ✅ **Common infectious diseases**: Malaria, Hepatitis, HIV, TB, STIs
- ✅ **Chronic conditions**: Diabetes, Hypertension, Heart disease
- ✅ **Symptoms**: Fever, Cough, Headache, Diarrhea
- ✅ **Injuries**: Fractures, Trauma, Wounds

## Troubleshooting

### Container Not Running
If you get an error that the container is not running:
```bash
docker start kiplombe_mysql
```

### Wrong Container Name
Find your MySQL container name:
```bash
docker ps --filter "name=mysql" --format "{{.Names}}"
```

### Permission Denied
Make sure the script is executable:
```bash
chmod +x api/database/sample_data/load_icd10_diagnoses.sh
```
