const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
const IdGenerator = require('../utils/idGenerator');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ayeassess_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Database connection and table initialization
const initializeDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('Database connected successfully');

    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(24) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(24) PRIMARY KEY,
        user_id VARCHAR(24) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create assessments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS assessments (
        id VARCHAR(24) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        difficulty_level ENUM('beginner', 'intermediate', 'advanced', 'expert'),
        estimated_duration INT DEFAULT 20,
        assessment_type ENUM('video', 'text', 'audio') DEFAULT 'video',
        status ENUM('draft', 'published') DEFAULT 'draft',
        url VARCHAR(255) UNIQUE,
        questions_file VARCHAR(500),
        questions_file_id VARCHAR(24),
        avatar_config JSON,
        created_by VARCHAR(24) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create uploaded_files table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id VARCHAR(24) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        folder VARCHAR(50) NOT NULL,
        uploaded_by VARCHAR(24) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create assessment_questions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS assessment_questions (
        id VARCHAR(24) PRIMARY KEY,
        assessment_id VARCHAR(24) NULL,
        questions_text TEXT NOT NULL,
        spoken_text TEXT,
        ai_script JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
      )
    `);

    // Create assessment_sessions table for Heygen streaming sessions
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS assessment_sessions (
        id VARCHAR(24) PRIMARY KEY,
        assessment_id VARCHAR(24) NOT NULL,
        user_id VARCHAR(24) NOT NULL,
        heygen_session_id VARCHAR(255) NOT NULL,
        stream_url VARCHAR(500),
        status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
        avatar_config JSON,
        first_question TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Add foreign key constraints separately with error handling
    try {
      await connection.execute(`
        ALTER TABLE assessment_sessions 
        ADD CONSTRAINT fk_assessment_sessions_assessment 
        FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
      `);
    } catch (error) {
      logger.info('Assessment sessions assessment foreign key constraint already exists or could not be added');
    }

    try {
      await connection.execute(`
        ALTER TABLE assessment_sessions 
        ADD CONSTRAINT fk_assessment_sessions_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (error) {
      logger.info('Assessment sessions user foreign key constraint already exists or could not be added');
    }

    // Add foreign key constraint for questions_file_id if it doesn't exist
    try {
      await connection.execute(`
        ALTER TABLE assessments 
        ADD CONSTRAINT fk_assessments_questions_file 
        FOREIGN KEY (questions_file_id) REFERENCES uploaded_files(id) ON DELETE SET NULL
      `);
    } catch (error) {
      // Foreign key might already exist, ignore error
      logger.info('Questions file foreign key constraint already exists or could not be added');
    }

    connection.release();
    logger.info('Database tables initialized successfully');

  } catch (error) {
    logger.error('Database initialization error:', error);
    throw error;
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
};

// Execute query with connection management
const query = async (sql, params = []) => {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
};

module.exports = {
  pool,
  initializeDatabase,
  testConnection,
  query
};
