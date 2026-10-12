-- Fix vw_drug_inventory_aggregated view to group by medication only (not by location)
-- This ensures one row per medication in the summary, regardless of storage location

DROP VIEW IF EXISTS vw_drug_inventory_aggregated;

CREATE VIEW vw_drug_inventory_aggregated AS
SELECT 
    di.medicationId,
    m.name as medicationName,
    m.medicationCode,
    m.genericName,
    m.dosageForm,
    m.strength,
    SUM(di.quantity) as totalQuantity,
    COUNT(DISTINCT di.drugInventoryId) as batchCount,
    MIN(di.expiryDate) as earliestExpiryDate,
    MAX(di.expiryDate) as latestExpiryDate,
    AVG(di.unitPrice) as averageUnitPrice,
    AVG(di.sellPrice) as averageSellPrice,
    MIN(di.unitPrice) as minUnitPrice,
    MAX(di.sellPrice) as maxSellPrice,
    GROUP_CONCAT(DISTINCT di.location ORDER BY di.location SEPARATOR ', ') as location,
    CASE 
        WHEN SUM(di.quantity) = 0 THEN 'out_of_stock'
        WHEN SUM(di.quantity) < 10 THEN 'low_stock'
        ELSE 'active'
    END as status
FROM drug_inventory di
INNER JOIN medications m ON di.medicationId = m.medicationId
WHERE di.status != 'exhausted' OR di.quantity > 0
GROUP BY di.medicationId, m.name, m.medicationCode, m.genericName, m.dosageForm, m.strength;


