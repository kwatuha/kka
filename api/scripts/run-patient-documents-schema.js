// Script to run patient documents schema
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runPatientDocumentsSchema() {
    let connection;
    
    try {
        // Create connection using same config as db.js
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'kiplombe_hmis',
            port: process.env.DB_PORT || 3306,
            multipleStatements: true
        });

        console.log('Connected to database successfully!');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, '../database/20_patient_documents_schema.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Running patient documents schema SQL file...');
        
        // Execute the SQL
        await connection.query(sql);
        
        console.log('✅ Patient documents table created successfully!');
        
    } catch (error) {
        console.error('❌ Error running schema:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Database access denied. Please check your database credentials in .env file.');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('Database does not exist. Please create the database first.');
        } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⚠️  Table already exists. This is okay - skipping creation.');
        } else {
            console.error('Full error:', error);
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('Database connection closed.');
        }
    }
}

runPatientDocumentsSchema();
