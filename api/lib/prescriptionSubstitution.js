const { findFifoBatchForStore } = require('./drugMovement');

const SUBSTITUTION_TYPES = ['generic', 'therapeutic', 'stock_unavailable', 'other'];

async function logItemHistory(connection, {
    itemId,
    prescriptionId,
    fieldName,
    oldValue,
    newValue,
    changedBy,
    notes,
    changeType = 'update',
}) {
    await connection.execute(
        `INSERT INTO prescription_items_history
         (itemId, prescriptionId, fieldName, oldValue, newValue, changedBy, changeType, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            itemId,
            prescriptionId,
            fieldName,
            oldValue != null ? String(oldValue) : null,
            newValue != null ? String(newValue) : null,
            changedBy || null,
            changeType,
            notes || null,
        ],
    );
}

async function getActiveSubstitution(connection, prescriptionItemId) {
    const [rows] = await connection.execute(
        `SELECT pis.*,
                pm.name AS prescribedMedicationName,
                dm.name AS dispensedMedicationName,
                di.batchNumber,
                di.expiryDate,
                di.quantity AS inventoryQuantity,
                di.sellPrice,
                di.storeId
         FROM prescription_item_substitutions pis
         INNER JOIN medications pm ON pm.medicationId = pis.prescribedMedicationId
         INNER JOIN medications dm ON dm.medicationId = pis.dispensedMedicationId
         LEFT JOIN drug_inventory di ON di.drugInventoryId = pis.drugInventoryId
         WHERE pis.prescriptionItemId = ? AND pis.status = 'active'
         ORDER BY pis.substitutionId DESC
         LIMIT 1`,
        [prescriptionItemId],
    );
    return rows[0] || null;
}

async function getActiveSubstitutionsForItems(connection, itemIds) {
    if (!itemIds.length) return new Map();
    const placeholders = itemIds.map(() => '?').join(',');
    const [rows] = await connection.execute(
        `SELECT pis.*,
                pm.name AS prescribedMedicationName,
                dm.name AS dispensedMedicationName,
                di.drugInventoryId AS currentDrugInventoryId,
                di.batchNumber,
                di.expiryDate,
                di.quantity AS inventoryQuantity,
                di.sellPrice,
                di.storeId
         FROM prescription_item_substitutions pis
         INNER JOIN medications pm ON pm.medicationId = pis.prescribedMedicationId
         INNER JOIN medications dm ON dm.medicationId = pis.dispensedMedicationId
         LEFT JOIN drug_inventory di ON di.drugInventoryId = pis.drugInventoryId
         WHERE pis.prescriptionItemId IN (${placeholders})
           AND pis.status = 'active'`,
        itemIds,
    );
    const map = new Map();
    for (const row of rows) {
        if (!map.has(row.prescriptionItemId)) {
            map.set(row.prescriptionItemId, row);
        }
    }
    return map;
}

async function resolveSubstitutionInventory(connection, substitution, { storeId = null, scope = 'branch' } = {}) {
    if (substitution.drugInventoryId) {
        const [invRows] = await connection.execute(
            `SELECT di.*, m.name AS medicationName
             FROM drug_inventory di
             INNER JOIN medications m ON m.medicationId = di.medicationId
             WHERE di.drugInventoryId = ?
               AND di.quantity > 0
               AND di.status = 'active'
               AND (di.expiryDate IS NULL OR di.expiryDate >= CURDATE())`,
            [substitution.drugInventoryId],
        );
        if (invRows[0]) return invRows[0];
    }

    if (storeId) {
        const batch = await findFifoBatchForStore(
            connection,
            substitution.dispensedMedicationId,
            storeId,
            { scope },
        );
        if (batch) return batch;
    }

    const [fallback] = await connection.execute(
        `SELECT di.*, m.name AS medicationName
         FROM drug_inventory di
         INNER JOIN medications m ON m.medicationId = di.medicationId
         WHERE di.medicationId = ?
           AND di.quantity > 0
           AND di.status = 'active'
           AND (di.expiryDate IS NULL OR di.expiryDate >= CURDATE())
         ORDER BY COALESCE(di.createdAt, NOW()) ASC, di.expiryDate ASC
         LIMIT 1`,
        [substitution.dispensedMedicationId],
    );
    return fallback[0] || null;
}

async function cancelActiveSubstitutions(connection, prescriptionItemId, userId, reason = 'Superseded by new substitution') {
    const [active] = await connection.execute(
        `SELECT substitutionId, prescriptionId FROM prescription_item_substitutions
         WHERE prescriptionItemId = ? AND status = 'active'`,
        [prescriptionItemId],
    );
    if (!active.length) return;

    await connection.execute(
        `UPDATE prescription_item_substitutions
         SET status = 'cancelled', updatedAt = NOW()
         WHERE prescriptionItemId = ? AND status = 'active'`,
        [prescriptionItemId],
    );

    for (const row of active) {
        await logItemHistory(connection, {
            itemId: prescriptionItemId,
            prescriptionId: row.prescriptionId,
            fieldName: 'substitution',
            oldValue: row.substitutionId,
            newValue: 'cancelled',
            changedBy: userId,
            notes: reason,
        });
    }
}

async function createSubstitution(connection, {
    prescriptionItemId,
    dispensedMedicationId,
    drugInventoryId,
    substitutionType,
    reason,
    notes,
    userId,
    storeId,
}) {
    if (!SUBSTITUTION_TYPES.includes(substitutionType)) {
        throw new Error(`Invalid substitutionType. Must be one of: ${SUBSTITUTION_TYPES.join(', ')}`);
    }
    if (!reason || !String(reason).trim()) {
        throw new Error('A reason is required for medication substitution');
    }

    const [items] = await connection.execute(
        `SELECT pi.*, m.name AS prescribedMedicationName
         FROM prescription_items pi
         LEFT JOIN medications m ON m.medicationId = pi.medicationId
         WHERE pi.itemId = ?`,
        [prescriptionItemId],
    );
    if (!items.length) {
        throw new Error('Prescription item not found');
    }
    const item = items[0];
    if (item.status !== 'pending') {
        throw new Error('Only pending prescription items can be substituted');
    }
    if (!item.medicationId) {
        throw new Error('Prescription item has no prescribed medication');
    }
    if (Number(item.medicationId) === Number(dispensedMedicationId)) {
        throw new Error('Substitute medication must differ from the prescribed medication');
    }

    const [medRows] = await connection.execute(
        'SELECT medicationId, name FROM medications WHERE medicationId = ? AND voided = 0',
        [dispensedMedicationId],
    );
    if (!medRows.length) {
        throw new Error('Substitute medication not found');
    }
    const dispensedMed = medRows[0];

    let inventory = null;
    if (drugInventoryId) {
        const [invRows] = await connection.execute(
            `SELECT * FROM drug_inventory
             WHERE drugInventoryId = ?
               AND medicationId = ?
               AND quantity > 0
               AND status = 'active'
               AND (expiryDate IS NULL OR expiryDate >= CURDATE())`,
            [drugInventoryId, dispensedMedicationId],
        );
        if (!invRows.length) {
            throw new Error('Selected inventory batch is unavailable for the substitute medication');
        }
        inventory = invRows[0];
    } else if (storeId) {
        inventory = await findFifoBatchForStore(connection, dispensedMedicationId, storeId, { scope: 'branch' });
    }
    if (!inventory) {
        const [fallback] = await connection.execute(
            `SELECT * FROM drug_inventory
             WHERE medicationId = ?
               AND quantity > 0
               AND status = 'active'
               AND (expiryDate IS NULL OR expiryDate >= CURDATE())
             ORDER BY COALESCE(createdAt, NOW()) ASC, expiryDate ASC
             LIMIT 1`,
            [dispensedMedicationId],
        );
        inventory = fallback[0] || null;
    }
    if (!inventory) {
        throw new Error('No available stock found for the substitute medication');
    }

    await cancelActiveSubstitutions(connection, prescriptionItemId, userId);

    const [result] = await connection.execute(
        `INSERT INTO prescription_item_substitutions
         (prescriptionItemId, prescriptionId, prescribedMedicationId, dispensedMedicationId,
          drugInventoryId, substitutionType, reason, status, substitutedBy, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
        [
            prescriptionItemId,
            item.prescriptionId,
            item.medicationId,
            dispensedMedicationId,
            inventory.drugInventoryId,
            substitutionType,
            String(reason).trim(),
            userId || null,
            notes || null,
        ],
    );

    await logItemHistory(connection, {
        itemId: prescriptionItemId,
        prescriptionId: item.prescriptionId,
        fieldName: 'medication_substitution',
        oldValue: item.prescribedMedicationName || item.medicationName || item.medicationId,
        newValue: dispensedMed.name,
        changedBy: userId,
        notes: `[${substitutionType}] ${String(reason).trim()}${notes ? ` — ${notes}` : ''}`,
        changeType: 'update',
    });

    return {
        substitutionId: result.insertId,
        prescriptionItemId,
        prescriptionId: item.prescriptionId,
        prescribedMedicationId: item.medicationId,
        prescribedMedicationName: item.prescribedMedicationName || item.medicationName,
        dispensedMedicationId,
        dispensedMedicationName: dispensedMed.name,
        substitutionType,
        reason: String(reason).trim(),
        drugInventoryId: inventory.drugInventoryId,
        batchNumber: inventory.batchNumber,
        expiryDate: inventory.expiryDate,
        availableQuantity: inventory.quantity,
        unitPrice: inventory.sellPrice,
        status: 'active',
    };
}

async function markSubstitutionDispensed(connection, { prescriptionItemId, dispensedMedicationId, dispensationId, userId }) {
    const sub = await getActiveSubstitution(connection, prescriptionItemId);
    if (!sub) return null;
    if (Number(sub.dispensedMedicationId) !== Number(dispensedMedicationId)) {
        throw new Error('Dispensed medication does not match the active substitution');
    }

    await connection.execute(
        `UPDATE prescription_item_substitutions
         SET status = 'dispensed', dispensationId = ?, updatedAt = NOW()
         WHERE substitutionId = ?`,
        [dispensationId, sub.substitutionId],
    );

    await logItemHistory(connection, {
        itemId: prescriptionItemId,
        prescriptionId: sub.prescriptionId,
        fieldName: 'substitution_dispensed',
        oldValue: 'active',
        newValue: 'dispensed',
        changedBy: userId,
        notes: `Dispensation #${dispensationId}`,
    });

    return sub.substitutionId;
}

async function enrichReadyForDispensingRows(connection, rows, { storeId = null } = {}) {
    if (!rows.length) return rows;

    const itemIds = rows.map((r) => r.itemId);
    const subMap = await getActiveSubstitutionsForItems(connection, itemIds);

    const enriched = [];
    for (const row of rows) {
        const sub = subMap.get(row.itemId);
        if (!sub) {
            enriched.push(row);
            continue;
        }

        const inventory = await resolveSubstitutionInventory(connection, sub, { storeId, scope: 'branch' });
        if (!inventory) {
            enriched.push({
                ...row,
                hasSubstitution: true,
                substitutionId: sub.substitutionId,
                substitutionType: sub.substitutionType,
                substitutionReason: sub.reason,
                prescribedMedicationId: sub.prescribedMedicationId,
                prescribedMedicationName: sub.prescribedMedicationName,
                dispensedMedicationId: sub.dispensedMedicationId,
                dispensedMedicationName: sub.dispensedMedicationName,
                drugInventoryId: null,
                availableQuantity: 0,
            });
            continue;
        }

        const qty = Number(row.prescribedQuantity) || 0;
        enriched.push({
            ...row,
            hasSubstitution: true,
            substitutionId: sub.substitutionId,
            substitutionType: sub.substitutionType,
            substitutionReason: sub.reason,
            prescribedMedicationId: sub.prescribedMedicationId,
            prescribedMedicationName: sub.prescribedMedicationName,
            dispensedMedicationId: sub.dispensedMedicationId,
            dispensedMedicationName: sub.dispensedMedicationName,
            medicationName: sub.dispensedMedicationName,
            drugInventoryId: inventory.drugInventoryId,
            batchNumber: inventory.batchNumber,
            expiryDate: inventory.expiryDate,
            availableQuantity: inventory.quantity,
            unitPrice: inventory.sellPrice,
            totalPrice: inventory.sellPrice != null ? Number(inventory.sellPrice) * qty : row.totalPrice,
        });
    }
    return enriched;
}

module.exports = {
    SUBSTITUTION_TYPES,
    logItemHistory,
    getActiveSubstitution,
    getActiveSubstitutionsForItems,
    resolveSubstitutionInventory,
    createSubstitution,
    markSubstitutionDispensed,
    enrichReadyForDispensingRows,
};
