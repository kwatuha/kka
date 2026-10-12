# Drug Inventory System Redesign

## Current Problems

1. **Multiple rows per drug**: One `drug_inventory` record per batch makes it hard to see total stock
2. **Missing patient information**: Transaction history doesn't show which patient received drugs
3. **Exhausted batches clutter inventory**: Empty batches still show in inventory list
4. **No independent history view**: History only accessible from individual batch details
5. **Batch details mixed with inventory**: Batch info (prices, expiry) stored in inventory table

## Proposed Solution: Aggregated Inventory + Stock Adjustments

### Architecture Overview

```
medications (catalog)
    ↓
drug_inventory (ONE record per medication - aggregated quantities)
    ↓
drug_stock_adjustments (ALL stock movements with batch details)
    ↓
drug_inventory_transactions (transaction history with patient info)
```

### Key Changes

1. **drug_inventory**: One record per medication
   - Aggregated quantity across all batches
   - Current average prices (for display)
   - Reorder levels
   - Location

2. **drug_stock_adjustments**: New table for all stock movements
   - Batch number
   - Buying price
   - Selling price
   - Expiry date
   - Manufacture date
   - Quantity (positive for receipts, negative for dispensations)
   - Adjustment type (RECEIPT, DISPENSATION, ADJUSTMENT, etc.)
   - Patient information (for dispensations)
   - Reference to prescription/dispensation

3. **drug_inventory_transactions**: Enhanced with patient info
   - Link to patient via dispensation
   - Complete audit trail

## Database Schema

### 1. Redesigned drug_inventory (Aggregated)

```sql
CREATE TABLE drug_inventory (
    drugInventoryId INT PRIMARY KEY AUTO_INCREMENT,
    medicationId INT NOT NULL,
    totalQuantity INT NOT NULL DEFAULT 0,  -- Aggregated across all batches
    reorderLevel INT DEFAULT 0,
    location VARCHAR(100),
    -- Current average prices (for quick reference)
    averageUnitPrice DECIMAL(15, 2),
    averageSellPrice DECIMAL(15, 2),
    -- Status tracking
    status ENUM('active', 'low_stock', 'out_of_stock', 'discontinued') DEFAULT 'active',
    lastRestocked DATE,
    lastDispensed DATE,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (medicationId) REFERENCES medications(medicationId),
    UNIQUE KEY unique_medication (medicationId),
    INDEX idx_status (status)
);
```

### 2. New drug_stock_adjustments table

```sql
CREATE TABLE drug_stock_adjustments (
    adjustmentId INT PRIMARY KEY AUTO_INCREMENT,
    drugInventoryId INT NOT NULL,  -- Link to aggregated drug_inventory
    medicationId INT NOT NULL,     -- Denormalized for faster queries
    adjustmentType ENUM('RECEIPT', 'DISPENSATION', 'ADJUSTMENT', 'TRANSFER', 'EXPIRY', 'DAMAGE', 'RETURN', 'CORRECTION') NOT NULL,
    adjustmentDate DATE NOT NULL,
    adjustmentTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    quantity INT NOT NULL,  -- Positive for receipts, negative for dispensations
    -- Batch details (stored here, not in drug_inventory)
    batchNumber VARCHAR(100) NOT NULL,
    unitPrice DECIMAL(15, 2) NOT NULL,  -- Buying price
    sellPrice DECIMAL(15, 2) NOT NULL,  -- Selling price
    manufactureDate DATE,
    expiryDate DATE NOT NULL,
    minPrice DECIMAL(15, 2),
    -- Location
    location VARCHAR(100),
    -- Patient information (for dispensations)
    patientId INT NULL,  -- Patient who received the drug
    prescriptionId INT NULL,  -- Prescription reference
    dispensationId INT NULL,  -- Dispensation reference
    -- Reference information
    referenceType VARCHAR(50),  -- 'purchase_order', 'dispensation', 'adjustment', etc.
    referenceId INT,
    referenceNumber VARCHAR(100),
    -- User who performed the adjustment
    performedBy INT NOT NULL,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drugInventoryId) REFERENCES drug_inventory(drugInventoryId),
    FOREIGN KEY (medicationId) REFERENCES medications(medicationId),
    FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE SET NULL,
    FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE SET NULL,
    FOREIGN KEY (dispensationId) REFERENCES dispensations(dispensationId) ON DELETE SET NULL,
    FOREIGN KEY (performedBy) REFERENCES users(userId),
    INDEX idx_drug_inventory (drugInventoryId),
    INDEX idx_medication (medicationId),
    INDEX idx_adjustment_type (adjustmentType),
    INDEX idx_adjustment_date (adjustmentDate),
    INDEX idx_batch (batchNumber),
    INDEX idx_patient (patientId),
    INDEX idx_prescription (prescriptionId)
);
```

### 3. Enhanced drug_inventory_transactions (with patient info)

```sql
-- Add patient information columns
ALTER TABLE drug_inventory_transactions
ADD COLUMN patientId INT NULL AFTER drugInventoryId,
ADD COLUMN prescriptionId INT NULL AFTER patientId,
ADD COLUMN dispensationId INT NULL AFTER prescriptionId,
ADD FOREIGN KEY (patientId) REFERENCES patients(patientId) ON DELETE SET NULL,
ADD FOREIGN KEY (prescriptionId) REFERENCES prescriptions(prescriptionId) ON DELETE SET NULL,
ADD FOREIGN KEY (dispensationId) REFERENCES dispensations(dispensationId) ON DELETE SET NULL,
ADD INDEX idx_patient (patientId),
ADD INDEX idx_prescription (prescriptionId);
```

## Migration Strategy

### Phase 1: Create new tables
1. Create `drug_stock_adjustments` table
2. Create new aggregated `drug_inventory` structure
3. Migrate existing data:
   - Aggregate quantities by medication
   - Move batch details to `drug_stock_adjustments`
   - Create initial RECEIPT adjustments for existing batches

### Phase 2: Update transactions
1. Add patient info to `drug_inventory_transactions`
2. Link transactions to dispensations/prescriptions
3. Backfill patient data from dispensations

### Phase 3: Update application
1. Update API routes to use new structure
2. Create stock adjustment endpoints
3. Update UI components

## Benefits

1. **Cleaner inventory view**: One row per medication, see total stock at a glance
2. **Complete history**: All batch details preserved in adjustments table
3. **Patient tracking**: Know which patient received which batch
4. **Better filtering**: Independent history tab with filters (patient, date, batch, etc.)
5. **Automatic cleanup**: Exhausted batches don't clutter inventory (they're in adjustments)
6. **Flexible pricing**: Each adjustment can have different prices
7. **Better reporting**: Easy to generate reports on consumption, profit, etc.

## UI Changes

### 1. Drug Inventory Tab
- Shows one row per medication
- Aggregated quantity
- Status (active, low stock, out of stock)
- Quick actions: View History, Adjust Stock

### 2. Stock Adjustment Form
- Medication selector
- Adjustment type (Receipt, Dispensation, Adjustment, etc.)
- Batch details (batch number, expiry, prices)
- Quantity
- For dispensations: Patient selector, Prescription link
- Reference information

### 3. Drug History Tab (New Independent Page)
- Filters:
  - Medication
  - Patient
  - Date range
  - Batch number
  - Adjustment type
  - Status
- Table columns:
  - Date & Time
  - Medication
  - Batch Number
  - Type
  - Quantity
  - Patient (for dispensations)
  - Buy Price
  - Sell Price
  - Performed By
  - Reference

## API Endpoints

### Stock Adjustments
- `GET /api/pharmacy/stock-adjustments` - List with filters
- `POST /api/pharmacy/stock-adjustments` - Create adjustment
- `GET /api/pharmacy/stock-adjustments/:id` - Get details
- `PUT /api/pharmacy/stock-adjustments/:id` - Update (if allowed)
- `DELETE /api/pharmacy/stock-adjustments/:id` - Delete (if allowed)

### Drug History
- `GET /api/pharmacy/drug-history` - Filtered history
- `GET /api/pharmacy/drug-history/patient/:patientId` - Patient's drug history
- `GET /api/pharmacy/drug-history/medication/:medicationId` - Medication history
- `GET /api/pharmacy/drug-history/batch/:batchNumber` - Batch history

### Drug Inventory (Updated)
- `GET /api/pharmacy/drug-inventory` - List medications (aggregated)
- `GET /api/pharmacy/drug-inventory/:id` - Get medication details
- `GET /api/pharmacy/drug-inventory/:id/adjustments` - Get all adjustments for medication





