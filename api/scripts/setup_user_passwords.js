// Script to set up passwords for sample users shown on the login page
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DEMO_USERNAMES = [
  'doctor1',
  'doctor2',
  'nurse1',
  'pharmacist1',
  'pharmacy',
  'cashier',
  'registration',
  'receptionist1',
  'labtech1',
  'matungu_doctor',
  'matungu_registration',
  'matungu_cashier',
  'matungu_nurse',
];

async function setupPasswords() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'mysql_db',
    user: process.env.DB_USER || 'kiplombe_user',
    password: process.env.DB_PASSWORD || 'kiplombe_password',
    database: process.env.DB_NAME || 'kiplombe_hmis'
  });

  try {
    const passwordHash = await bcrypt.hash('password123', 10);
    console.log('Generated password hash for "password123":', passwordHash);

    const placeholders = DEMO_USERNAMES.map(() => '?').join(', ');
    const [result] = await connection.execute(
      `UPDATE users
       SET passwordHash = ?
       WHERE username IN (${placeholders})
         AND voided = 0`,
      [passwordHash, ...DEMO_USERNAMES]
    );

    console.log(`Updated ${result.affectedRows} user(s)`);

    const [users] = await connection.execute(
      `SELECT userId, username, email, firstName, lastName,
              CASE WHEN passwordHash IS NOT NULL AND passwordHash != '' THEN 'Has password' ELSE 'No password' END as password_status
       FROM users
       WHERE username IN ('admin', ${placeholders})
       ORDER BY username`,
      DEMO_USERNAMES
    );

    console.log('\nUser password status:');
    console.table(users);

  } catch (error) {
    console.error('Error setting up passwords:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

setupPasswords();
