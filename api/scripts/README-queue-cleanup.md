# Queue Cleanup Script

This script automatically completes queue entries that have been in the queue for more than 48 hours.

## Purpose

Queue entries that remain in "waiting", "called", or "serving" status for more than 48 hours are automatically completed to:
- Keep the active queue clean and manageable
- Maintain accurate queue statistics
- Preserve audit trail (entries are completed, not deleted)

## Usage

### Manual Execution

Run the script manually using Docker:

```bash
docker exec kiplombe_api node api/scripts/cleanup-old-queues.js
```

Or if running locally:

```bash
node api/scripts/cleanup-old-queues.js
```

### Scheduled Execution (Cron)

To run this script automatically every day at 2 AM, add to your crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * docker exec kiplombe_api node /app/api/scripts/cleanup-old-queues.js >> /var/log/queue-cleanup.log 2>&1
```

Or if you prefer to run it multiple times per day (e.g., every 12 hours):

```bash
# Runs at 2 AM and 2 PM daily
0 2,14 * * * docker exec kiplombe_api node /app/api/scripts/cleanup-old-queues.js >> /var/log/queue-cleanup.log 2>&1
```

## What the Script Does

1. **Finds old entries**: Identifies queue entries that:
   - Are not already "completed" or "cancelled"
   - Have been in the queue for more than 48 hours (based on `arrivalTime` or `createdAt`)

2. **Completes entries**: For each old entry:
   - Sets status to "completed"
   - Records `endTime` as current timestamp
   - Adds a note indicating auto-completion with age in hours

3. **Provides summary**: Outputs:
   - Total entries found
   - Breakdown by service point
   - Success/error counts

## Example Output

```
[QUEUE CLEANUP] Starting cleanup of queue entries older than 48 hours...
[QUEUE CLEANUP] Found 85 queue entries older than 48 hours
[QUEUE CLEANUP] Summary by service point:
  - pharmacy: 35 entries
  - cashier: 27 entries
  - consultation: 11 entries
  - laboratory: 3 entries
  - triage: 4 entries
  - billing: 2 entries
  - radiology: 1 entry
  - registration: 2 entries
[QUEUE CLEANUP] Completed queue 1234 (P-001) - pharmacy - 52 hours old
...
[QUEUE CLEANUP] Cleanup completed successfully!
[QUEUE CLEANUP] Total entries processed: 85
[QUEUE CLEANUP] Successfully completed: 85
[QUEUE CLEANUP] Errors: 0
```

## Safety Features

- **Transaction-based**: All updates are wrapped in a transaction
- **Rollback on error**: If any error occurs, all changes are rolled back
- **Audit trail**: Entries are completed (not deleted) with notes explaining why
- **Idempotent**: Safe to run multiple times (won't affect already-completed entries)

## Customization

To change the time threshold (e.g., 24 hours instead of 48), edit the script:

```javascript
// Change INTERVAL 48 HOUR to your desired interval
AND arrivalTime < DATE_SUB(NOW(), INTERVAL 24 HOUR)
```

## Notes

- The script only affects entries that are NOT already completed or cancelled
- Entries are marked as "completed" to maintain historical records
- The `endTime` field is set to the current timestamp when auto-completed
- A note is added to explain why the entry was auto-completed
