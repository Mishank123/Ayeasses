require('dotenv').config({ path: './config.env' });
const DatabaseMigration = require('./utils/migrateToObjectIds');
const db = require('./config/database');
const logger = require('./utils/logger');

async function runMigration() {
  try {
    logger.info('Starting database migration to ObjectIds...');
    
    // Connect to database
    await db.connect();
    
    // Run migration
    await DatabaseMigration.migrateToObjectIds();
    
    logger.info('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Check if this is being run directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
