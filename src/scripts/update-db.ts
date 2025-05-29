const { readFileSync } = require('fs');
const { join } = require('path');
const { query } = require('../lib/db');

async function updateDatabase() {
  try {
    console.log('Starting database schema update...');
    
    // Read the SQL file
    const sqlFilePath = join(process.cwd(), 'db-schema-update.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await query(stmt);
        console.log('✅ Statement executed successfully');
      } catch (error) {
        console.error('❌ Error executing statement:', error);
        // Continue with the next statement
      }
    }
    
    console.log('Database schema update completed!');
  } catch (error) {
    console.error('Failed to update database schema:', error);
    process.exit(1);
  }
}

// Run the update if this script is executed directly
if (require.main === module) {
  updateDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = updateDatabase; 