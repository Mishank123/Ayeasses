const db = require('../config/database');
const IdGenerator = require('./idGenerator');
const logger = require('./logger');

class DatabaseMigration {
  static async migrateToObjectIds() {
    try {
      logger.info('Starting migration to ObjectIds...');
      
      // Create temporary tables with new structure
      await this.createTempTables();
      
      // Migrate data with new IDs
      await this.migrateUsers();
      await this.migrateSessions();
      await this.migrateContent();
      await this.migrateAssessments();
      
      // Drop old tables and rename new ones
      await this.swapTables();
      
      logger.info('Migration completed successfully');
    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    }
  }

  static async createTempTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS assessment_user_temp (
        id VARCHAR(24) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'user') DEFAULT 'user',
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS sessions_temp (
        id VARCHAR(24) PRIMARY KEY,
        user_id VARCHAR(24) NOT NULL,
        token VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS content_temp (
        id VARCHAR(24) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        status ENUM('published', 'draft') DEFAULT 'draft',
        created_by VARCHAR(24) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      
             `CREATE TABLE IF NOT EXISTS assessments_temp (
         id VARCHAR(24) PRIMARY KEY,
         title VARCHAR(255) NOT NULL,
         description TEXT NOT NULL,
         category VARCHAR(100),
         difficulty_level ENUM('beginner', 'intermediate', 'advanced', 'expert'),
         estimated_duration INT DEFAULT 20,
         assessment_type ENUM('video', 'text', 'audio') DEFAULT 'video',
         status ENUM('draft', 'published') DEFAULT 'draft',
         questions_file VARCHAR(500),
         url VARCHAR(255) UNIQUE,
         created_by VARCHAR(24) NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
       )`
    ];

    for (const query of queries) {
      await db.query(query);
    }
  }

  static async migrateUsers() {
    const users = await db.query('SELECT * FROM assessment_user');
    const idMapping = new Map();

    for (const user of users) {
      const newId = IdGenerator.generateIdWithTimestamp();
      idMapping.set(user.id, newId);

      await db.query(
        'INSERT INTO assessment_user_temp (id, username, email, password, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [newId, user.username, user.email, user.password, user.role, user.status, user.created_at, user.updated_at]
      );
    }

    // Store mapping for foreign key updates
    global.idMapping = idMapping;
    logger.info(`Migrated ${users.length} users`);
  }

  static async migrateSessions() {
    const sessions = await db.query('SELECT * FROM sessions');
    const idMapping = global.idMapping;

    for (const session of sessions) {
      const newId = IdGenerator.generateIdWithTimestamp();
      const newUserId = idMapping.get(session.user_id);

      if (newUserId) {
        await db.query(
          'INSERT INTO sessions_temp (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
          [newId, newUserId, session.token, session.expires_at, session.created_at]
        );
      }
    }

    logger.info(`Migrated ${sessions.length} sessions`);
  }

  static async migrateContent() {
    const content = await db.query('SELECT * FROM content');
    const idMapping = global.idMapping;

    for (const item of content) {
      const newId = IdGenerator.generateIdWithTimestamp();
      const newCreatedBy = idMapping.get(item.created_by);

      if (newCreatedBy) {
        await db.query(
          'INSERT INTO content_temp (id, title, description, image_url, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [newId, item.title, item.description, item.image_url, item.status, newCreatedBy, item.created_at, item.updated_at]
        );
      }
    }

    logger.info(`Migrated ${content.length} content items`);
  }

  static async migrateAssessments() {
    const assessments = await db.query('SELECT * FROM assessments');
    const idMapping = global.idMapping;

    for (const assessment of assessments) {
      const newId = IdGenerator.generateIdWithTimestamp();
      const newCreatedBy = idMapping.get(assessment.created_by);

      if (newCreatedBy) {
        await db.query(
          'INSERT INTO assessments_temp (id, title, description, category, difficulty_level, estimated_duration, assessment_type, status, questions_file, url, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [newId, assessment.title, assessment.description, assessment.category, assessment.difficulty_level, assessment.estimated_duration, assessment.assessment_type, assessment.status, assessment.questions_file, assessment.url || null, newCreatedBy, assessment.created_at, assessment.updated_at]
        );
      }
    }

    logger.info(`Migrated ${assessments.length} assessments`);
  }

  static async swapTables() {
    const queries = [
      'DROP TABLE IF EXISTS sessions',
      'DROP TABLE IF EXISTS content',
      'DROP TABLE IF EXISTS assessments',
      'DROP TABLE IF EXISTS assessment_user',
      'RENAME TABLE sessions_temp TO sessions',
      'RENAME TABLE content_temp TO content',
      'RENAME TABLE assessments_temp TO assessments',
      'RENAME TABLE assessment_user_temp TO assessment_user'
    ];

    for (const query of queries) {
      await db.query(query);
    }

    // Add foreign key constraints back
    const fkQueries = [
      'ALTER TABLE sessions ADD CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES assessment_user(id) ON DELETE CASCADE',
      'ALTER TABLE content ADD CONSTRAINT fk_content_user FOREIGN KEY (created_by) REFERENCES assessment_user(id) ON DELETE CASCADE',
      'ALTER TABLE assessments ADD CONSTRAINT fk_assessments_user FOREIGN KEY (created_by) REFERENCES assessment_user(id) ON DELETE CASCADE'
    ];

    for (const query of fkQueries) {
      try {
        await db.query(query);
      } catch (error) {
        logger.warn(`Foreign key constraint already exists or failed: ${error.message}`);
      }
    }
  }
}

module.exports = DatabaseMigration;
