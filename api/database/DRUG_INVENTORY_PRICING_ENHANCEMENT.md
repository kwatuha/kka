# Drug Inventory Pricing Enhancement

## Overview

This enhancement adds comprehensive pricing tracking to the drug inventory transaction history system. It ensures that both **buying prices (unitPrice)** and **selling prices (sellPrice)** are preserved in transaction history, even after batches are exhausted.

## Problem Statement

Previously, the transaction history only tracked `unitPrice` (cost price), but not `sellPrice` (selling price). This was problematic because:

1. **Different batches have different prices**: The same drug can have different buying and selling prices based on when it was purchased
2. **Price information lost when exhausted**: When a batch runs out (quantity = 0), the pricing details were not fully preserved in history
3. **Profit analysis impossible**: Without both prices, it's impossible to calculate profit margins or revenue from dispensations

## Solution

### Database Changes

1. **Added `sellPrice` column** to `drug_inventory_transactions` table
   - Stores the selling price per unit at the time of transaction
   - Preserves pricing even after batch is exhausted

2. **Added `totalSellValue` column** to `drug_inventory_transactions` table
   - Stores total selling value (quantityChange * sellPrice)
   - For RECEIPT: positive value (incoming stock value)
   - For DISPENSATION: negative value (revenue from sale)

3. **Updated Views**:
   - `vw_drug_inventory_history`: Now includes both `unitPrice` and `sellPrice`
   - `vw_batch_summary`: Now includes profit margin calculations

### API Changes

Updated transaction creation in `pharmacyRoutes.js`:

1. **RECEIPT Transactions**:
   - Captures both `unitPrice` (buying price) and `sellPrice` (selling price) from drug_inventory
   - Calculates both `totalValue` (cost) and `totalSellValue` (selling value)

2. **DISPENSATION Transactions**:
   - Captures `unitPrice` (cost price) and `sellPrice` (selling price) from drug_inventory
   - Stores negative values for outgoing stock (cost and revenue)

### UI Changes

Updated `drug-inventory-history-dialog.tsx`:

1. **Added pricing columns** to transaction table:
   - Buy Price (unitPrice)
   - Sell Price (sellPrice)
   - Total Cost (totalValue)
   - Total Revenue (totalSellValue)

2. **Enhanced batch summary**:
   - Shows both buy price and sell price
   - Displays batch number and location

## Migration

Run the migration script:
```bash
docker exec -i kiplombe_mysql mysql -ukiplombe_user -pkiplombe_password kiplombe_hmis < api/database/17_drug_inventory_transactions_sellprice.sql
```

This will:
- Add `sellPrice` and `totalSellValue` columns
- Update views to include pricing information
- Backfill existing transactions with sellPrice from drug_inventory table

## Benefits

1. **Complete Price History**: Both buying and selling prices are preserved forever
2. **Profit Analysis**: Can calculate profit margins per batch or per transaction
3. **Revenue Tracking**: Track total revenue from each batch
4. **Cost Analysis**: Track total cost of inventory received
5. **Audit Trail**: Complete pricing audit trail for compliance

## Example Transaction

### RECEIPT Transaction
- **Quantity**: +100 units
- **Buy Price**: KES 2.40 per unit
- **Sell Price**: KES 5.00 per unit
- **Total Cost**: KES 240.00 (100 × 2.40)
- **Total Sell Value**: KES 500.00 (100 × 5.00)

### DISPENSATION Transaction
- **Quantity**: -5 units
- **Buy Price**: KES 2.40 per unit (cost basis)
- **Sell Price**: KES 5.00 per unit (selling price)
- **Total Cost**: -KES 12.00 (5 × 2.40, negative for outgoing)
- **Total Revenue**: -KES 25.00 (5 × 5.00, negative for outgoing)
- **Profit**: KES 13.00 (25.00 - 12.00)

## Notes

- **Historical Data**: Existing transactions created before this enhancement may have incorrect `unitPrice` values, but `sellPrice` has been backfilled from current drug_inventory records
- **Future Transactions**: All new transactions will correctly capture both prices from the drug_inventory record at the time of transaction
- **Price Changes**: If drug_inventory prices are updated, future transactions will use the new prices, but historical transactions preserve the prices at the time they occurred

## Testing

To test the enhancement:

1. Create a new drug inventory batch with specific buy and sell prices
2. View the transaction history - you should see both prices
3. Dispense from the batch - the dispensation transaction should show both prices
4. Check the batch summary - it should show profit margin calculations

## API Endpoints

All existing endpoints return the new pricing fields:
- `GET /api/pharmacy/drug-inventory/:id/transactions`
- `GET /api/pharmacy/drug-inventory/batch/:batchNumber/transactions`
- `GET /api/pharmacy/drug-inventory/medication/:medicationId/history`






