// Script to add symptoms, historyOfPresentIllness, and physicalExamination columns to medical_records table
// This script uses Docker exec to run SQL commands inside the MySQL container
const { execSync } = require('child_process');

const CONTAINER_NAME = 'kiplombe_mysql';
const DB_NAME = 'kiplombe_hmis';
const DB_USER = 'kiplombe_user';
const DB_PASSWORD = 'kiplombe_password';

function execDocker(command) {
    try {
        return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    } catch (error) {
        throw new Error(error.stderr || error.message);
    }
}

function checkContainer() {
    try {
        const containers = execDocker(`docker ps --format '{{.Names}}'`);
        if (!containers.includes(CONTAINER_NAME)) {
            throw new Error(`Container '${CONTAINER_NAME}' is not running. Please start it with: docker-compose up -d mysql_db`);
        }
    } catch (error) {
        throw new Error(`Failed to check container: ${error.message}`);
    }
}

function checkColumnExists(columnName) {
    try {
        const result = execDocker(`docker exec ${CONTAINER_NAME} mysql -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -sN -e "
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = '${DB_NAME}' 
            AND TABLE_NAME = 'medical_records' 
            AND COLUMN_NAME = '${columnName}'
        " 2>/dev/null`);
        return parseInt(result.trim()) > 0;
    } catch (error) {
        return false;
    }
}

function addColumn(columnName, afterColumn) {
    try {
        execDocker(`docker exec ${CONTAINER_NAME} mysql -u${DB_USER} -p${DB_PASSWORD} ${DB_NAME} -e "
            ALTER TABLE medical_records
            ADD COLUMN ${columnName} TEXT NULL AFTER ${afterColumn};
        " 2>/dev/null`);
        return true;
    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            return false; // Column already exists
        }
        throw error;
    }
}

async function runMigration() {
    try {
        console.log('Checking if Docker container is running...');
        checkContainer();
        console.log('✅ Container is running');
        
        console.log('Checking for existing columns...');
        const existingColumns = [];
        if (checkColumnExists('symptoms')) existingColumns.push('symptoms');
        if (checkColumnExists('historyOfPresentIllness')) existingColumns.push('historyOfPresentIllness');
        if (checkColumnExists('physicalExamination')) existingColumns.push('physicalExamination');
        console.log('Existing columns:', existingColumns.length > 0 ? existingColumns.join(', ') : 'none');

        // Add symptoms column
        if (existingColumns.includes('symptoms')) {
            console.log('⚠️  symptoms column already exists');
        } else {
            console.log('Adding symptoms column...');
            addColumn('symptoms', 'chiefComplaint');
            console.log('✅ Added symptoms column');
        }

        // Add historyOfPresentIllness column
        if (existingColumns.includes('historyOfPresentIllness')) {
            console.log('⚠️  historyOfPresentIllness column already exists');
        } else {
            console.log('Adding historyOfPresentIllness column...');
            addColumn('historyOfPresentIllness', 'symptoms');
            console.log('✅ Added historyOfPresentIllness column');
        }

        // Add physicalExamination column
        if (existingColumns.includes('physicalExamination')) {
            console.log('⚠️  physicalExamination column already exists');
        } else {
            console.log('Adding physicalExamination column...');
            addColumn('physicalExamination', 'historyOfPresentIllness');
            console.log('✅ Added physicalExamination column');
        }

        console.log('\n✅ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error running migration:', error.message);
        process.exit(1);
    }
}

runMigration();

