#!/bin/bash

# Test script to verify symptoms and diagnosis are saved and loaded in encounter form
# This script will:
# 1. Create a medical record with symptoms and diagnosis
# 2. Verify it's saved in the database
# 3. Check if the API returns the data correctly

API_URL="${API_URL:-http://41.89.173.8/api}"
PATIENT_ID="${PATIENT_ID:-104}"
DOCTOR_ID="${DOCTOR_ID:-1}"
TODAY=$(date +%Y-%m-%d)

echo "=== Testing Encounter Form Prepopulation ==="
echo "API URL: $API_URL"
echo "Patient ID: $PATIENT_ID"
echo "Doctor ID: $DOCTOR_ID"
echo "Date: $TODAY"
echo ""

# Step 1: Get auth token (set HMIS_TEST_USER / HMIS_TEST_PASSWORD — not stored in repo)
if [ -z "${HMIS_TEST_USER:-}" ] || [ -z "${HMIS_TEST_PASSWORD:-}" ]; then
  echo "Set HMIS_TEST_USER and HMIS_TEST_PASSWORD to run this script." >&2
  exit 1
fi
echo "Step 1: Getting authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${HMIS_TEST_USER}\",\"password\":\"${HMIS_TEST_PASSWORD}\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get authentication token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Authentication successful"
echo ""

# Step 2: Create a medical record with symptoms and diagnosis
echo "Step 2: Creating medical record with test data..."
MEDICAL_RECORD_DATA=$(cat <<EOF
{
  "patientId": $PATIENT_ID,
  "doctorId": $DOCTOR_ID,
  "visitDate": "$TODAY",
  "visitType": "Outpatient",
  "department": "General",
  "chiefComplaint": "Test Chief Complaint - Headache and fever",
  "symptoms": "Test Symptoms - Fever, Headache, Nausea, Fatigue",
  "historyOfPresentIllness": "Test History - Patient reports symptoms started 2 days ago. Initially mild headache, now severe with fever. Associated with nausea. Better with rest, worse with activity.",
  "physicalExamination": "Test Physical Exam - Temp: 38.5°C, BP: 120/80, HR: 88 bpm. General appearance: ill-looking. No other abnormalities noted.",
  "diagnosis": "Test Diagnosis - R51 Headache, R50.9 Fever unspecified",
  "treatment": "Test Treatment Plan - Paracetamol 500mg TDS x 3 days. Rest and hydration. Review if no improvement.",
  "notes": "Test Notes - Patient advised to return if symptoms worsen"
}
EOF
)

CREATE_RESPONSE=$(curl -s -X POST "$API_URL/medical-records" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$MEDICAL_RECORD_DATA")

RECORD_ID=$(echo "$CREATE_RESPONSE" | grep -o '"recordId":[0-9]*' | cut -d':' -f2)

if [ -z "$RECORD_ID" ]; then
  echo "❌ Failed to create medical record"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

echo "✅ Medical record created with ID: $RECORD_ID"
echo ""

# Step 3: Verify data was saved correctly in database
echo "Step 3: Verifying data in database..."
DB_CHECK=$(ssh -i ~/.ssh/id_asusme fhir@41.89.173.8 "docker exec kiplombe_mysql mysql -uroot -pkiplombe_root_pass_2024 kiplombe_hmis -e \"SELECT recordId, chiefComplaint, symptoms, historyOfPresentIllness, physicalExamination, diagnosis, treatment FROM medical_records WHERE recordId = $RECORD_ID;\" 2>/dev/null")

echo "$DB_CHECK"
echo ""

# Step 4: Retrieve the record via API
echo "Step 4: Retrieving record via API..."
GET_RESPONSE=$(curl -s -X GET "$API_URL/medical-records/$RECORD_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "API Response:"
echo "$GET_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$GET_RESPONSE"
echo ""

# Step 5: Check if all fields are present
echo "Step 5: Verifying all fields are present..."
if echo "$GET_RESPONSE" | grep -q "chiefComplaint"; then
  echo "✅ chiefComplaint found"
else
  echo "❌ chiefComplaint missing"
fi

if echo "$GET_RESPONSE" | grep -q "symptoms"; then
  echo "✅ symptoms found"
else
  echo "❌ symptoms missing"
fi

if echo "$GET_RESPONSE" | grep -q "historyOfPresentIllness"; then
  echo "✅ historyOfPresentIllness found"
else
  echo "❌ historyOfPresentIllness missing"
fi

if echo "$GET_RESPONSE" | grep -q "physicalExamination"; then
  echo "✅ physicalExamination found"
else
  echo "❌ physicalExamination missing"
fi

if echo "$GET_RESPONSE" | grep -q "diagnosis"; then
  echo "✅ diagnosis found"
else
  echo "❌ diagnosis missing"
fi

if echo "$GET_RESPONSE" | grep -q "treatment"; then
  echo "✅ treatment found"
else
  echo "❌ treatment missing"
fi

echo ""
echo "=== Test Complete ==="
echo "Record ID: $RECORD_ID"
echo "To test in the UI:"
echo "1. Open the Patient Encounter form"
echo "2. Select patient ID: $PATIENT_ID"
echo "3. Check if the Symptoms & History and Diagnosis & Treatment Plan fields are prepopulated"
