# Drug Stores Management - Implementation Plan

## Overview
Multi-branch drug store system that allows:
- Managing drug stores/locations per branch
- Setting dispensing stores per branch
- Transferring drugs between stores
- Store-specific reorder levels with notifications

## Database Schema ✅
Created in `21_drug_stores_schema.sql`:
- `branches` - Hospital branches/facilities
- `drug_stores` - Drug stores/locations per branch
- `drug_store_reorder_levels` - Reorder levels per store per medication
- `drug_inventory_transfers` - Transfer tracking between stores
- Updated `drug_inventory` to include `storeId` (keeping `location` for backward compatibility)

## Implementation Steps

### Phase 1: Core Infrastructure ✅
1. ✅ Database schema created
2. ⏳ API endpoints for branches
3. ⏳ API endpoints for drug stores (CRUD)
4. ⏳ API endpoints for reorder levels

### Phase 2: Admin Interface
1. ⏳ Admin page: `/admin/drug-stores` or `/settings/drug-stores`
2. ⏳ Branch management UI
3. ⏳ Store management UI (list, create, edit, delete)
4. ⏳ Set dispensing store per branch
5. ⏳ Reorder levels management per store

### Phase 3: Drug Inventory Integration
1. ⏳ Update drug inventory form to use store dropdown
2. ⏳ Update API to handle storeId instead of location string
3. ⏳ Migration script to convert existing location strings to stores
4. ⏳ Update drug inventory display to show store name

### Phase 4: Transfer Functionality
1. ⏳ Transfer request form
2. ⏳ Transfer approval workflow
3. ⏳ Transfer receipt/confirmation
4. ⏳ Transfer history/audit trail

### Phase 5: Reorder Level Notifications
1. ⏳ Background job/cron to check reorder levels
2. ⏳ Notification system for low stock per store
3. ⏳ Dashboard/widget showing low stock items per store

## Notes
- The `location` field in `drug_inventory` is kept for backward compatibility
- Migration will be needed to convert existing location strings to store IDs
- Each branch can have multiple stores, but only one dispensing store
- Main store can transfer to branch stores and vice versa
- Each store maintains independent reorder levels per medication




