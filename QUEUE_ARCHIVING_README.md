# Queue Archiving and History System

## Overview

This system implements a performance-optimized queue management solution that:
- Keeps the active queue table small and fast
- Preserves complete history of served patients
- Automatically archives completed queue entries
- Tracks service metrics (wait time, service time, total time)

## Database Structure

### Active Queue Table (`queue_entries`)
- Contains only active queue entries (waiting, called, serving)
- Completed and cancelled entries are automatically excluded from queries
- Optimized with composite indexes for fast filtering

### History Table (`queue_history`)
- Stores all completed/cancelled queue entries
- Includes calculated service metrics
- Indexed for efficient historical queries
- Never deleted (permanent record)

## How It Works

### 1. Automatic Archiving on Payment
When a patient pays all their invoices in the cashier queue:
1. Payment is processed
2. System checks if all invoices are paid
3. If all paid:
   - Queue entry status is set to "completed"
   - Entry is automatically archived to `queue_history`
   - Entry is removed from active `queue_entries` table
   - Service metrics are calculated and stored

### 2. Service Metrics Calculation
The system automatically calculates:
- **Wait Time**: Time from arrival to being called (in minutes)
- **Service Time**: Time from start of service to completion (in minutes)
- **Total Time**: Time from arrival to completion (in minutes)

### 3. Manual Archiving
You can also manually archive entries:
- Single entry: `POST /api/queue/:id/archive`
- Batch archive all completed: `POST /api/queue/archive-completed`

## API Endpoints

### Queue History
```javascript
// Get queue history
GET /api/queue/history?servicePoint=cashier&startDate=2024-01-01&endDate=2024-01-31

// Archive a specific queue entry
POST /api/queue/:id/archive

// Archive all completed entries
POST /api/queue/archive-completed
```

### Active Queue (excludes completed by default)
```javascript
// Get active queue (completed entries excluded by default)
GET /api/queue?servicePoint=cashier

// Include completed entries in results
GET /api/queue?servicePoint=cashier&includeCompleted=true
```

## Performance Benefits

1. **Smaller Active Table**: Only active entries remain, reducing query time
2. **Optimized Indexes**: Composite indexes on (status, servicePoint) for fast filtering
3. **Separate History Queries**: Historical data queried separately, not slowing active operations
4. **Automatic Cleanup**: No manual maintenance needed

## Setup

1. Run the migration:
```sql
source api/database/14_queue_history_schema.sql;
```

2. Add indexes (if not already present):
```sql
ALTER TABLE queue_entries ADD INDEX idx_status_servicepoint (status, servicePoint);
ALTER TABLE queue_entries ADD INDEX idx_arrival_date (arrivalTime);
```

## Usage in Frontend

The queue page automatically excludes completed entries. To view history:

```typescript
import { queueApi } from '@/lib/api'

// Get queue history
const history = await queueApi.getHistory({
  servicePoint: 'cashier',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
})
```

## Maintenance

- **Automatic**: Completed entries are archived immediately when all invoices are paid
- **Manual**: Run batch archive periodically if needed:
  ```bash
  POST /api/queue/archive-completed
  ```

## Benefits

✅ **Performance**: Active queue queries are fast (small table)
✅ **History**: Complete audit trail of all served patients
✅ **Metrics**: Automatic calculation of service times
✅ **No Data Loss**: All queue entries preserved in history
✅ **Automatic**: No manual intervention required

