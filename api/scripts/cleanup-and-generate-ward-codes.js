#!/usr/bin/env node
/**
 * Script to:
 * 1. Generate ward codes for all wards without codes
 * 2. Rename duplicate wards with meaningful Swahili names
 * 3. Delete empty wards (wards without beds or patients)
 * 
 * Usage: node scripts/cleanup-and-generate-ward-codes.js [--dry-run]
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const DRY_RUN = process.argv.includes('--dry-run');

// Meaningful Swahili ward names
const WARD_NAMES = [
    'Tumaini', 'Huruma', 'Pendo', 'Amani', 'Upendo', 'Furaha', 'Neema', 'Baraka',
    'Rehema', 'Shukrani', 'Imani', 'Amani', 'Uzima', 'Ushindi', 'Umoja', 'Urafiki'
];

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root_password',
    database: process.env.DB_NAME || 'kiplombe_hmis',
    port: process.env.DB_PORT || 3306
};

async function generateWardCode(connection, wardName, wardType, excludeWardId = null) {
    const namePrefix = wardName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
    const typePrefix = wardType ? wardType.substring(0, 1).toUpperCase() : 'G';
    
    // Find the next available number for this prefix
    let query = `
        SELECT wardCode FROM wards 
        WHERE wardCode LIKE ? AND wardCode REGEXP '^[A-Z]{3}[A-Z]-[0-9]+$'
        ORDER BY CAST(SUBSTRING(wardCode, LOCATE('-', wardCode) + 1) AS UNSIGNED) DESC
        LIMIT 1
    `;
    let params = [`${namePrefix}${typePrefix}-%`];
    
    if (excludeWardId) {
        query = `
            SELECT wardCode FROM wards 
            WHERE wardCode LIKE ? AND wardCode REGEXP '^[A-Z]{3}[A-Z]-[0-9]+$' AND wardId != ?
            ORDER BY CAST(SUBSTRING(wardCode, LOCATE('-', wardCode) + 1) AS UNSIGNED) DESC
            LIMIT 1
        `;
        params = [`${namePrefix}${typePrefix}-%`, excludeWardId];
    }
    
    const [existingCodes] = await connection.execute(query, params);

    let nextNum = 1;
    if (existingCodes.length > 0) {
        const lastCode = existingCodes[0].wardCode;
        const lastNum = parseInt(lastCode.split('-')[1]) || 0;
        nextNum = lastNum + 1;
    }

    let wardCode = `${namePrefix}${typePrefix}-${String(nextNum).padStart(3, '0')}`;
    
    // Check if generated code already exists (safety check)
    let checkQuery = 'SELECT wardId FROM wards WHERE wardCode = ? AND isActive = 1';
    let checkParams = [wardCode];
    if (excludeWardId) {
        checkQuery += ' AND wardId != ?';
        checkParams.push(excludeWardId);
    }
    
    const [duplicateCheck] = await connection.execute(checkQuery, checkParams);
    if (duplicateCheck.length > 0) {
        // If duplicate found, append a suffix
        let suffix = 1;
        let tempCode = wardCode;
        while (true) {
            const [check] = await connection.execute(checkQuery, checkParams);
            if (check.length === 0) break;
            tempCode = `${wardCode}-${suffix}`;
            checkParams[0] = tempCode;
            suffix++;
            if (suffix > 999) {
                throw new Error('Failed to generate unique ward code');
            }
        }
        wardCode = tempCode;
    }
    
    return wardCode;
}

async function cleanupWards() {
    const connection = await mysql.createConnection(dbConfig);
    
    try {
        console.log('\n=== Ward Cleanup and Code Generation ===\n');
        
        // Step 1: Get all active wards
        const [allWards] = await connection.execute(`
            SELECT w.wardId, w.wardCode, w.wardName, w.wardType, w.capacity,
                   COUNT(DISTINCT b.bedId) as bedCount,
                   COUNT(DISTINCT a.admissionId) as admissionCount
            FROM wards w
            LEFT JOIN beds b ON w.wardId = b.wardId AND b.isActive = 1
            LEFT JOIN admissions a ON b.bedId = a.bedId AND a.status = 'admitted'
            WHERE w.isActive = 1
            GROUP BY w.wardId, w.wardCode, w.wardName, w.wardType, w.capacity
            ORDER BY w.wardName, w.wardType
        `);
        
        console.log(`Found ${allWards.length} active wards\n`);
        
        // Step 2: Identify empty wards (no beds, no patients)
        const emptyWards = allWards.filter(w => 
            parseInt(w.bedCount) === 0 && parseInt(w.admissionCount) === 0
        );
        
        console.log(`Empty wards (no beds, no patients): ${emptyWards.length}`);
        if (emptyWards.length > 0) {
            console.log('Empty wards to delete:');
            emptyWards.forEach(w => {
                console.log(`  - Ward ID ${w.wardId}: ${w.wardName} (${w.wardType || 'No type'})`);
            });
        }
        
        // Step 3: Find duplicate wards (same name and type)
        const duplicates = {};
        allWards.forEach(ward => {
            const key = `${ward.wardName}|${ward.wardType || ''}`;
            if (!duplicates[key]) {
                duplicates[key] = [];
            }
            duplicates[key].push(ward);
        });
        
        const duplicateGroups = Object.entries(duplicates)
            .filter(([key, wards]) => wards.length > 1)
            .map(([key, wards]) => ({ key, wards }));
        
        console.log(`\nDuplicate ward groups: ${duplicateGroups.length}`);
        
        // Step 4: Generate codes for wards without codes
        const wardsWithoutCodes = allWards.filter(w => !w.wardCode || w.wardCode.trim() === '');
        console.log(`\nWards without codes: ${wardsWithoutCodes.length}`);
        
        let nameIndex = 0;
        const updates = [];
        const renames = [];
        const deletions = [];
        
        // Process duplicate groups - rename duplicates with meaningful names
        for (const group of duplicateGroups) {
            const [wardName, wardType] = group.key.split('|');
            const wards = group.wards.filter(w => 
                parseInt(w.bedCount) > 0 || parseInt(w.admissionCount) > 0
            ); // Only process non-empty wards
            
            if (wards.length === 0) continue;
            
            // Keep the first ward, rename the rest
            const keepWard = wards[0];
            const renameWards = wards.slice(1);
            
            for (const ward of renameWards) {
                if (nameIndex >= WARD_NAMES.length) {
                    console.warn(`\n⚠️  Warning: Ran out of ward names. Using generic names.`);
                    break;
                }
                
                const newName = WARD_NAMES[nameIndex++];
                renames.push({
                    wardId: ward.wardId,
                    oldName: ward.wardName,
                    newName: newName,
                    wardType: ward.wardType
                });
            }
        }
        
        // Generate codes for all wards
        for (const ward of allWards) {
            // Skip empty wards (will be deleted)
            if (emptyWards.find(e => e.wardId === ward.wardId)) {
                continue;
            }
            
            // Get the new name if this ward is being renamed
            const rename = renames.find(r => r.wardId === ward.wardId);
            const finalWardName = rename ? rename.newName : ward.wardName;
            const finalWardType = ward.wardType || null;
            
            // Generate code if missing
            if (!ward.wardCode || ward.wardCode.trim() === '') {
                const newCode = await generateWardCode(connection, finalWardName, finalWardType, ward.wardId);
                updates.push({
                    wardId: ward.wardId,
                    wardCode: newCode,
                    wardName: finalWardName,
                    wardType: finalWardType
                });
            } else if (rename) {
                // Ward has code but needs renaming
                updates.push({
                    wardId: ward.wardId,
                    wardCode: ward.wardCode,
                    wardName: finalWardName,
                    wardType: finalWardType
                });
            }
        }
        
        // Summary
        console.log(`\n=== Summary ===`);
        console.log(`Wards to update (generate codes/rename): ${updates.length}`);
        console.log(`Wards to rename: ${renames.length}`);
        console.log(`Empty wards to delete: ${emptyWards.length}`);
        
        if (DRY_RUN) {
            console.log(`\n🔍 DRY RUN MODE - No changes will be made\n`);
            if (updates.length > 0) {
                console.log('Wards to update:');
                updates.forEach(u => {
                    const rename = renames.find(r => r.wardId === u.wardId);
                    console.log(`  - Ward ID ${u.wardId}: ${rename ? `${rename.oldName} → ${u.wardName}` : u.wardName} (Code: ${u.wardCode || 'GENERATE'})`);
                });
            }
            if (emptyWards.length > 0) {
                console.log('\nEmpty wards to delete:');
                emptyWards.forEach(w => {
                    console.log(`  - Ward ID ${w.wardId}: ${w.wardName} (${w.wardType || 'No type'})`);
                });
            }
            console.log(`\nRun without --dry-run to apply changes.`);
            return;
        }
        
        // Execute updates
        console.log(`\n=== Executing Updates ===\n`);
        
        // Update wards (generate codes and rename)
        for (const update of updates) {
            await connection.execute(
                'UPDATE wards SET wardCode = ?, wardName = ?, wardType = ?, updatedAt = NOW() WHERE wardId = ?',
                [update.wardCode, update.wardName, update.wardType, update.wardId]
            );
            const rename = renames.find(r => r.wardId === update.wardId);
            if (rename) {
                console.log(`✅ Renamed Ward ID ${update.wardId}: "${rename.oldName}" → "${update.wardName}" (Code: ${update.wardCode})`);
            } else {
                console.log(`✅ Generated code for Ward ID ${update.wardId}: "${update.wardName}" (Code: ${update.wardCode})`);
            }
        }
        
        // Delete empty wards
        if (emptyWards.length > 0) {
            const emptyWardIds = emptyWards.map(w => w.wardId);
            const placeholders = emptyWardIds.map(() => '?').join(',');
            const [result] = await connection.execute(
                `UPDATE wards SET isActive = 0, updatedAt = NOW() WHERE wardId IN (${placeholders})`,
                emptyWardIds
            );
            console.log(`\n✅ Deleted ${result.affectedRows} empty ward(s)`);
        }
        
        console.log(`\n✅ Cleanup completed successfully!`);
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// Run the script
cleanupWards()
    .then(() => {
        console.log('\nDone.');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\nError:', error);
        process.exit(1);
    });
