#!/usr/bin/env node
/**
 * Script to identify and remove duplicate wards
 * Usage: node scripts/cleanup-duplicate-wards.js [--dry-run] [--keep-oldest]
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DRY_RUN = process.argv.includes('--dry-run');
const KEEP_OLDEST = process.argv.includes('--keep-oldest');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root_password',
    database: process.env.DB_NAME || 'kiplombe_hmis',
    port: process.env.DB_PORT || 3306
};

async function findDuplicateWards() {
    const connection = await mysql.createConnection(dbConfig);

    try {
        // Find wards with duplicate names and types
        const [duplicates] = await connection.execute(`
            SELECT wardName, wardType, COUNT(*) as count,
                   GROUP_CONCAT(wardId ORDER BY wardId) as wardIds,
                   GROUP_CONCAT(wardCode ORDER BY wardId) as wardCodes,
                   GROUP_CONCAT(createdAt ORDER BY wardId) as createdDates
            FROM wards
            WHERE isActive = 1
            GROUP BY wardName, wardType
            HAVING count > 1
            ORDER BY count DESC, wardName
        `);

        console.log(`\nFound ${duplicates.length} groups of duplicate wards:\n`);

        const wardsToDelete = [];

        for (const dup of duplicates) {
            const wardIds = dup.wardIds.split(',').map(id => parseInt(id));
            const wardCodes = dup.wardCodes.split(',');
            const createdDates = dup.createdDates.split(',');

            console.log(`\n${dup.wardName} (${dup.wardType || 'No type'}) - ${dup.count} duplicates:`);

            // Determine which wards to keep and which to delete
            const wards = wardIds.map((id, idx) => ({
                wardId: id,
                wardCode: wardCodes[idx],
                createdAt: createdDates[idx]
            }));

            if (KEEP_OLDEST) {
                // Keep the oldest ward (first created)
                wards.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                const keepWard = wards[0];
                const deleteWards = wards.slice(1);

                console.log(`  KEEP: Ward ID ${keepWard.wardId} (Code: ${keepWard.wardCode || 'NULL'}, Created: ${keepWard.createdAt})`);
                deleteWards.forEach(w => {
                    console.log(`  DELETE: Ward ID ${w.wardId} (Code: ${w.wardCode || 'NULL'}, Created: ${w.createdAt})`);
                    wardsToDelete.push(w.wardId);
                });
            } else {
                // Keep the ward with a code, or the first one if all have codes or all are null
                const withCode = wards.filter(w => w.wardCode && w.wardCode.trim() !== '');
                const keepWard = withCode.length > 0 ? withCode[0] : wards[0];
                const deleteWards = wards.filter(w => w.wardId !== keepWard.wardId);

                console.log(`  KEEP: Ward ID ${keepWard.wardId} (Code: ${keepWard.wardCode || 'NULL'})`);
                deleteWards.forEach(w => {
                    console.log(`  DELETE: Ward ID ${w.wardId} (Code: ${w.wardCode || 'NULL'})`);
                    wardsToDelete.push(w.wardId);
                });
            }
        }

        if (wardsToDelete.length === 0) {
            console.log('\nNo duplicate wards to remove.');
            return;
        }

        console.log(`\n\nTotal wards to ${DRY_RUN ? 'delete (DRY RUN)' : 'delete'}: ${wardsToDelete.length}`);

        if (DRY_RUN) {
            console.log('\nDRY RUN mode - no changes will be made.');
            console.log('Run without --dry-run to actually delete these wards.');
            return;
        }

        // Check for beds associated with wards to be deleted
        const [bedsCheck] = await connection.execute(`
            SELECT w.wardId, w.wardName, COUNT(b.bedId) as bedCount
            FROM wards w
            LEFT JOIN beds b ON w.wardId = b.wardId AND b.isActive = 1
            WHERE w.wardId IN (?)
            GROUP BY w.wardId, w.wardName
            HAVING bedCount > 0
        `, [wardsToDelete]);

        if (bedsCheck.length > 0) {
            console.log('\n⚠️  WARNING: The following wards have active beds and cannot be deleted:');
            bedsCheck.forEach(w => {
                console.log(`  Ward ID ${w.wardId} (${w.wardName}): ${w.bedCount} beds`);
            });
            const wardsWithBeds = bedsCheck.map(w => w.wardId);
            wardsToDelete = wardsToDelete.filter(id => !wardsWithBeds.includes(id));
            console.log(`\nProceeding to delete ${wardsToDelete.length} wards without beds...`);
        }

        if (wardsToDelete.length === 0) {
            console.log('\nNo wards can be deleted (all have active beds).');
            return;
        }

        // Soft delete the duplicate wards
        const [result] = await connection.execute(`
            UPDATE wards
            SET isActive = 0, updatedAt = NOW()
            WHERE wardId IN (?)
        `, [wardsToDelete]);

        console.log(`\n✅ Successfully deleted ${result.affectedRows} duplicate ward(s).`);

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run the script
findDuplicateWards()
    .then(() => {
        console.log('\nDone.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nError:', error);
        process.exit(1);
    });
