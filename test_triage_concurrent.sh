#!/bin/bash

# Test script to verify triage number generation doesn't create duplicates
# This simulates concurrent requests

API_URL="http://41.89.173.8/api/triage"
PATIENT_ID=${1:-1}  # Default to patient ID 1
USER_ID=${2:-1}     # Default to user ID 1
NUM_REQUESTS=${3:-10}  # Number of concurrent requests to make

echo "=== Testing Concurrent Triage Creation ==="
echo "API URL: $API_URL"
echo "Patient ID: $PATIENT_ID"
echo "User ID: $USER_ID"
echo "Number of concurrent requests: $NUM_REQUESTS"
echo ""

# Create a temporary directory for results
TMP_DIR=$(mktemp -d)
echo "Results directory: $TMP_DIR"
echo ""

# Function to create a triage
create_triage() {
    local request_num=$1
    local timestamp=$(date +%s%N)
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test_token" \
        -d "{
            \"patientId\": $PATIENT_ID,
            \"chiefComplaint\": \"Test concurrent triage request $request_num - $timestamp\",
            \"priority\": \"Non-urgent\",
            \"triagedBy\": $USER_ID,
            \"assignedToDoctorId\": null,
            \"assignedToDepartment\": \"General\",
            \"servicePoint\": \"consultation\",
            \"notes\": \"Concurrent test request $request_num\"
        }" 2>&1)
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    echo "$body" > "$TMP_DIR/response_$request_num.json"
    echo "$http_code" > "$TMP_DIR/http_code_$request_num.txt"
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        triage_number=$(echo "$body" | grep -o '"triageNumber":"[^"]*"' | cut -d'"' -f4)
        echo "Request $request_num: SUCCESS - Triage Number: $triage_number"
        echo "$triage_number" >> "$TMP_DIR/successful_numbers.txt"
        return 0
    else
        error_msg=$(echo "$body" | grep -o '"error":"[^"]*"' | cut -d'"' -f4 || echo "$body")
        echo "Request $request_num: FAILED (HTTP $http_code) - $error_msg"
        echo "$request_num|$http_code|$error_msg" >> "$TMP_DIR/failed_requests.txt"
        return 1
    fi
}

# Export function and variables for parallel execution
export -f create_triage
export API_URL PATIENT_ID USER_ID TMP_DIR

echo "=== Starting $NUM_REQUESTS concurrent requests ==="
start_time=$(date +%s)

# Run requests in parallel
seq 1 $NUM_REQUESTS | xargs -P $NUM_REQUESTS -I {} bash -c 'create_triage {}'

end_time=$(date +%s)
duration=$((end_time - start_time))

echo ""
echo "=== Test completed in ${duration} seconds ==="
echo ""

# Analyze results
success_count=$(wc -l < "$TMP_DIR/successful_numbers.txt" 2>/dev/null || echo "0")
failed_count=$(wc -l < "$TMP_DIR/failed_requests.txt" 2>/dev/null || echo "0")

echo "=== Results Summary ==="
echo "Successful requests: $success_count"
echo "Failed requests: $failed_count"
echo ""

if [ -f "$TMP_DIR/successful_numbers.txt" ]; then
    echo "=== Generated Triage Numbers ==="
    sort "$TMP_DIR/successful_numbers.txt" | nl
    echo ""
    
    # Check for duplicates
    duplicates=$(sort "$TMP_DIR/successful_numbers.txt" | uniq -d)
    if [ -z "$duplicates" ]; then
        echo "✅ SUCCESS: No duplicate triage numbers found!"
    else
        echo "❌ FAILURE: Found duplicate triage numbers:"
        echo "$duplicates"
    fi
    
    # Count unique numbers
    unique_count=$(sort -u "$TMP_DIR/successful_numbers.txt" | wc -l)
    echo "Unique triage numbers: $unique_count"
    echo "Total successful requests: $success_count"
    
    if [ "$unique_count" -eq "$success_count" ]; then
        echo "✅ All triage numbers are unique!"
    else
        echo "❌ Some triage numbers are duplicates!"
    fi
else
    echo "⚠️  No successful requests to analyze"
fi

echo ""
if [ -f "$TMP_DIR/failed_requests.txt" ]; then
    echo "=== Failed Requests ==="
    cat "$TMP_DIR/failed_requests.txt"
    echo ""
fi

# Cleanup
rm -rf "$TMP_DIR"

echo "=== Test Complete ==="

