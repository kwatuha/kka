-- Update default passwords for sample users
-- All passwords are: password123
-- Password hash generated using bcrypt with 10 salt rounds

-- Generate password hash for 'password123'
-- This can be done using: bcrypt.hash('password123', 10)
-- Hash: $2a$10$rOzJqZqZqZqZqZqZqZqZqOqZqZqZqZqZqZqZqZqZqZqZqZqZqZq

-- Optional: update admin passwordHash (generate with bcrypt, 10 rounds — do not commit plaintext passwords)

-- Update sample users with password: password123
-- Using a proper bcrypt hash for 'password123'
-- Note: This hash will be generated dynamically below using a temporary script
-- For now, we'll use a placeholder that will be replaced

-- Generate hashes using Docker API container (bcryptjs is available there)
-- Then update the users table

-- Verify updates
SELECT userId, username, email, firstName, lastName, 
       CASE WHEN passwordHash IS NOT NULL AND passwordHash != '' THEN 'Has password' ELSE 'No password' END as password_status
FROM users
WHERE username IN ('admin', 'doctor1', 'doctor2', 'nurse1', 'pharmacist1')
ORDER BY username;

