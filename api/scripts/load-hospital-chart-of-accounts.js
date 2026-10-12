/**
 * Load Hospital Chart of Accounts
 *
 * This script loads a comprehensive, standardized Chart of Accounts
 * for hospital financial management.
 *
 * Usage:
 *   node api/scripts/load-hospital-chart-of-accounts.js
 *
 * Options:
 *   --clear    Clear existing accounts before loading (use with caution)
 *   --dry-run  Show what would be loaded without actually loading
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const args = process.argv.slice(2);
const clearExisting = args.includes('--clear');
const dryRun = args.includes('--dry-run');

async function loadChartOfAccounts() {
    let connection;

    try {
        // Create database connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'kiplombe_hms',
            multipleStatements: true
        });

        console.log('Connected to database');

        if (dryRun) {
            console.log('🔍 DRY RUN MODE - No changes will be made\n');
        }

        // Read the SQL file
        const sqlFile = path.join(__dirname, '../database/21_hospital_chart_of_accounts.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        if (clearExisting && !dryRun) {
            console.log('⚠️  Clearing existing accounts...');
            await connection.execute(`
                DELETE FROM accounts
                WHERE accountCode LIKE '1%'
                   OR accountCode LIKE '2%'
                   OR accountCode LIKE '3%'
                   OR accountCode LIKE '4%'
                   OR accountCode LIKE '5%'
            `);
            console.log('✅ Existing accounts cleared');
        }

        if (dryRun) {
            // Count accounts that would be created
            const accountMatches = sql.match(/INSERT IGNORE INTO accounts/g);
            const accountCount = accountMatches ? accountMatches.length : 0;
            console.log(`📊 Would load ${accountCount} account groups`);
            console.log('\nSample accounts that would be created:');

            // Extract sample account codes and names
            const accountLines = sql.match(/\(('[^']+',\s*'[^']+',\s*'[^']+',\s*'[^']+')\)/g);
            if (accountLines) {
                accountLines.slice(0, 10).forEach(line => {
                    const match = line.match(/\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)'\)/);
                    if (match) {
                        console.log(`  ${match[1]} - ${match[2]} (${match[3]})`);
                    }
                });
                if (accountLines.length > 10) {
                    console.log(`  ... and ${accountLines.length - 10} more accounts`);
                }
            }
            console.log('\n✅ Dry run complete. Use without --dry-run to actually load accounts.');
            return;
        }

        console.log('📥 Loading Chart of Accounts...');

        // Execute the SQL
        await connection.query(sql);

        // Count loaded accounts
        const [result] = await connection.execute(
            'SELECT COUNT(*) as count FROM accounts WHERE accountCode REGEXP "^[1-5][0-9]{3}$"'
        );

        console.log(`✅ Successfully loaded ${result[0].count} accounts`);
        console.log('\n📋 Account Summary:');

        // Get summary by type
        const [summary] = await connection.execute(`
            SELECT accountType, COUNT(*) as count
            FROM accounts
            WHERE accountCode REGEXP "^[1-5][0-9]{3}$"
            GROUP BY accountType
            ORDER BY
                CASE accountType
                    WHEN 'Asset' THEN 1
                    WHEN 'Liability' THEN 2
                    WHEN 'Equity' THEN 3
                    WHEN 'Revenue' THEN 4
                    WHEN 'Expense' THEN 5
                END
        `);

        summary.forEach(row => {
            console.log(`  ${row.accountType}: ${row.count} accounts`);
        });

        console.log('\n✅ Chart of Accounts loaded successfully!');
        console.log('💡 You can now view and manage accounts in: Financial Management → General Ledger');

    } catch (error) {
        console.error('❌ Error loading Chart of Accounts:', error.message);
        if (error.sql) {
            console.error('SQL Error:', error.sql);
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the script
loadChartOfAccounts();
