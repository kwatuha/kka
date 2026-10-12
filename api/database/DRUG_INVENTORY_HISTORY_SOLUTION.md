# Drug Inventory History Solution

## Problem Statement

When managing drug inventory:
- When 100 tablets are ordered for Drug A, you can see the quantity
- As dispensing happens, quantity decreases, but there's no complete history of:
  - When the 100 tablets were received
  - Each individual dispensation (e.g., -5 tablets, -10 tablets, etc.)
  - Running balance at any point in time
  - When the batch ran out (quantity = 0)
  - Complete audit trail of all stock movements

## Solution Overview

We've implemented a **transaction-based inventory tracking system** that records **every single stock movement** in a dedicated `drug_inventory_transactions` table. This provides:

1. **Complete Transaction History**: Every receipt, dispensation, adjustment, etc. is recorded
2. **Running Balance Tracking**: Each transaction records balance before/after for easy queries
3. **Batch Lifecycle Tracking**: Status field tracks batch lifecycle (active, exhausted, expired, etc.)
4. **Historical Stock Levels**: Can query stock levels at any point in time
5. **Complete Audit Trail**: All movements are linked to users, reference IDs, and timestamps

## Database Schema

### New Table: `drug_inventory_transactions`

This table tracks ALL stock movements:

```sql
- transactionId: Unique transaction ID
- drugInventoryId: Links to the batch
- transactionType: RECEIPT, DISPENSATION, ADJUSTMENT, TRANSFER, EXPIRY, DAMAGE, RETURN, CORRECTION
- transactionDate: Date of transaction
- quantityChange: Positive for receipts, negative for dispensations
- quantityBefore: Quantity before this transaction
- quantityAfter: Quantity after this transaction
- balanceAfter: Running balance after transaction
- unitPrice: Unit price at time of transaction (for cost tracking)
- totalValue: Total value of transaction
- referenceType: Type of reference (e.g., 'dispensation', 'purchase_order')
- referenceId: ID of related record (dispensationId, purchaseOrderId, etc.)
- referenceNumber: Human-readable reference (e.g., 'DISP-123', 'PO-456')
- performedBy: User who performed the transaction
- notes: Additional notes
```

### Enhanced `drug_inventory` Table

Added fields:
- `status`: ENUM('active', 'exhausted', 'expired', 'damaged', 'returned') - Tracks batch lifecycle
- `originalQuantity`: Initial quantity received (for history tracking)
- `dateExhausted`: Date when batch ran out (quantity reached 0)

## How It Works

### 1. When Stock is Received (Receipt)

Example: Receive 100 tablets for Drug A, Batch BT-2023-045

**Before:**
- Only recorded in `drug_inventory` table

**After:**
- Recorded in `drug_inventory` table with `originalQuantity = 100`
- **Transaction recorded** in `drug_inventory_transactions`:
  - `transactionType`: 'RECEIPT'
  - `quantityChange`: 100
  - `quantityBefore`: 0
  - `quantityAfter`: 100
  - `balanceAfter`: 100

### 2. When Stock is Dispensed

Example: Dispense 5 tablets to Patient X

**Before:**
- Only updated quantity in `drug_inventory` table (from 100 to 95)

**After:**
- Updated quantity in `drug_inventory` table (from 100 to 95)
- **Transaction recorded** in `drug_inventory_transactions`:
  - `transactionType`: 'DISPENSATION'
  - `quantityChange`: -5 (negative)
  - `quantityBefore`: 100
  - `quantityAfter`: 95
  - `balanceAfter`: 95
  - `referenceType`: 'dispensation'
  - `referenceId`: <dispensationId>
  - `referenceNumber`: 'DISP-123'

### 3. When Batch Runs Out

Example: Last 10 tablets are dispensed, quantity reaches 0

**Before:**
- Quantity updated to 0, but no clear indication of "exhausted" status

**After:**
- Quantity updated to 0
- **Status updated** to 'exhausted'
- **dateExhausted** set to current date
- **Transaction recorded** with:
  - `quantityAfter`: 0
  - `balanceAfter`: 0

### 4. Historical Queries

You can now query:
- **All transactions for a batch**: See every receipt and dispensation
- **Stock levels over time**: See inventory levels at any point in time
- **Batch summary**: See complete lifecycle (original quantity, current quantity, status, dates)
- **Medication history**: See all batches and transactions for a medication

## API Endpoints

### 1. Get Batch Transaction History

```
GET /api/pharmacy/drug-inventory/:id/transactions
```

Returns complete transaction history for a specific batch, including:
- All receipts, dispensations, adjustments
- Batch summary (original quantity, current quantity, status)
- Transaction summaries (total received, total dispensed, etc.)

### 2. Get Batch Transaction History by Batch Number

```
GET /api/pharmacy/drug-inventory/batch/:batchNumber/transactions
```

Same as above but queries by batch number instead of ID.

### 3. Get Medication History (All Batches)

```
GET /api/pharmacy/drug-inventory/medication/:medicationId/history
```

Returns:
- All batches for the medication
- All transactions across all batches
- Summary statistics (total batches, active/exhausted counts, total stock, etc.)

### 4. Get Historical Stock Levels

```
GET /api/pharmacy/drug-inventory/:id/stock-levels
```

Returns stock level snapshots over time, useful for:
- Graphing inventory levels
- Seeing when stock peaked and when it ran out
- Analyzing consumption patterns

## Example Queries

### Example 1: See Complete History of Batch BT-2023-045

```javascript
// Get all transactions for this batch
GET /api/pharmacy/drug-inventory/batch/BT-2023-045/transactions

// Response includes:
{
  "batchNumber": "BT-2023-045",
  "transactions": [
    {
      "transactionType": "RECEIPT",
      "transactionDate": "2023-01-15",
      "quantityChange": 100,
      "quantityBefore": 0,
      "quantityAfter": 100,
      "balanceAfter": 100,
      "referenceNumber": "BT-2023-045",
      "notes": "Initial stock receipt: 100 units"
    },
    {
      "transactionType": "DISPENSATION",
      "transactionDate": "2023-01-20",
      "quantityChange": -5,
      "quantityBefore": 100,
      "quantityAfter": 95,
      "balanceAfter": 95,
      "referenceNumber": "DISP-123",
      "notes": "Dispensed 5 units to patient"
    },
    {
      "transactionType": "DISPENSATION",
      "transactionDate": "2023-01-22",
      "quantityChange": -10,
      "quantityBefore": 95,
      "quantityAfter": 85,
      "balanceAfter": 85,
      "referenceNumber": "DISP-124",
      "notes": "Dispensed 10 units to patient"
    },
    // ... more transactions ...
    {
      "transactionType": "DISPENSATION",
      "transactionDate": "2023-03-10",
      "quantityChange": -5,
      "quantityBefore": 5,
      "quantityAfter": 0,
      "balanceAfter": 0,
      "referenceNumber": "DISP-456",
      "notes": "Dispensed 5 units to patient. Batch exhausted."
    }
  ],
  "totalTransactions": 25
}
```

### Example 2: See Stock Levels Over Time

```javascript
GET /api/pharmacy/drug-inventory/:id/stock-levels?startDate=2023-01-01&endDate=2023-03-31

// Response includes stock level at each transaction point
{
  "batch": { /* batch info */ },
  "stockLevels": [
    { "transactionDate": "2023-01-15", "stockLevel": 100, "transactionType": "RECEIPT" },
    { "transactionDate": "2023-01-20", "stockLevel": 95, "transactionType": "DISPENSATION" },
    { "transactionDate": "2023-01-22", "stockLevel": 85, "transactionType": "DISPENSATION" },
    // ... more snapshots ...
    { "transactionDate": "2023-03-10", "stockLevel": 0, "transactionType": "DISPENSATION" }
  ],
  "summary": {
    "initialStock": 100,
    "finalStock": 0,
    "minStock": 0,
    "maxStock": 100,
    "dataPoints": 25
  }
}
```

## Migration Instructions

1. **Run the migration script**:
   ```bash
   mysql -u username -p database_name < api/database/16_drug_inventory_transactions.sql
   ```

2. **Update existing records** (optional - for historical data):
   - For existing batches, set `originalQuantity = quantity` if not already set
   - Create initial RECEIPT transaction for existing batches (optional, for complete history)

3. **Test the system**:
   - Create a new batch → Verify RECEIPT transaction is recorded
   - Dispense from batch → Verify DISPENSATION transaction is recorded
   - Check transaction history → Verify all transactions are visible
   - Exhaust a batch → Verify status changes to 'exhausted' and dateExhausted is set

## Benefits

1. **Complete Audit Trail**: Every movement is tracked with timestamp, user, and reference
2. **Historical Analysis**: Can see inventory levels at any point in time
3. **Compliance**: Meets regulatory requirements for batch tracking
4. **Transparency**: Clear visibility into how inventory was consumed
5. **Reporting**: Easy to generate reports on consumption, stock levels, etc.
6. **Traceability**: Link every dispensation to the exact batch and transaction

## Future Enhancements

- **Adjustments**: Manual adjustments (corrections, damages, returns) can be recorded
- **Expiry Handling**: Automatic status change to 'expired' when expiry date passes
- **Stock Transfers**: Track stock movements between locations
- **Reconciliation**: Compare physical counts with system records
- **Cost Analysis**: Track costs over time for better pricing decisions

## Notes

- **Records are never deleted**: Even when quantity = 0, the batch record is preserved for audit purposes
- **Status tracking**: Batch status automatically updates (active → exhausted → expired)
- **Backward compatibility**: Existing `drug_inventory_history` table is still updated for compatibility
- **Performance**: Indexed for fast queries on transaction date, batch, and type






