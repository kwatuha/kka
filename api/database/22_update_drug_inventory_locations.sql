-- ============================================
-- MIGRATION: Update drug_inventory locations to Main Store name
-- ============================================
-- This migration updates all existing drug_inventory records to set 
-- their location field to "Main Store" since we've changed from 
-- free text location input to a dropdown that uses store names from drug_stores table.
--
-- IMPORTANT: 
-- 1. Run this after ensuring branches and drug_stores tables are set up
-- 2. Make sure "Main Store" exists in drug_stores table (or adjust the store name below)
-- 3. This will update ALL existing drug_inventory records to use "Main Store" as location
-- ============================================

-- Step 1: Update all drug_inventory records to use "Main Store" as location
-- This updates records that are NULL, empty, or have any other location value
UPDATE drug_inventory 
SET location = 'Main Store'
WHERE location IS NULL 
   OR location = '' 
   OR location != 'Main Store';

-- Step 2: Verify the update (run this query to check results)
-- SELECT location, COUNT(*) as count
-- FROM drug_inventory 
-- GROUP BY location;

-- Note: After this migration, all drug_inventory records will have location = 'Main Store'
-- Make sure "Main Store" exists in your drug_stores table with the same storeName.
-- If your main store has a different name, change 'Main Store' above to match it.
