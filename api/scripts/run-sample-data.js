// Script to run radiology sample data SQL file
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runSampleData() {
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
        const sqlFilePath = path.join(__dirname, '../database/sample_data/07_radiology.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');

        console.log('Running radiology sample data SQL file...');
        
        // Execute the SQL
        await connection.query(sql);
        
        console.log('✅ Radiology sample data inserted successfully!');
        
    } catch (error) {
        console.error('❌ Error running sample data:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('Database access denied. Please check your database credentials in .env file.');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
            console.error('Database does not exist. Please create the database first.');
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

runSampleData();



