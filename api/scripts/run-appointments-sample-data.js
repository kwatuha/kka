const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runAppointmentsSampleData() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'kiplombe_hmis',
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    console.log('Connected to database');

    // Read SQL file
    const sqlFile = path.join(__dirname, '../database/sample_data/14_appointments.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('Running appointments sample data...');

    // Execute SQL
    await connection.query(sql);

    console.log('Appointments sample data inserted successfully!');
  } catch (error) {
    console.error('Error running appointments sample data:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
}

runAppointmentsSampleData();

