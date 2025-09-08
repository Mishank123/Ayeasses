const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const IdGenerator = require('../utils/idGenerator');
const UrlGenerator = require('../utils/urlGenerator');
const gcpStorage = require('../services/gcpStorage');
const heygenService = require('../services/heygen');
const openaiService = require('../services/openaiService');

const router = express.Router();

// Configure multer for memory storage (for GCP upload)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, CSV, and Excel files are allowed.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Database storage for assessments

// Validation middleware
const assessmentValidation = [
  body('title')
    .isLength({ min: 3 })
    .withMessage('Title must be at least 3 characters long')
    .trim(),
  body('description')
    .isLength({ min: 5 })
    .withMessage('Description must be at least 5 characters long')
    .trim(),
  body('category')
    .optional()
    .isString()
    .withMessage('Category must be a string'),
  body('difficultyLevel')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Difficulty level must be one of: beginner, intermediate, advanced, expert'),
  body('estimatedDuration')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Estimated duration must be between 1 and 480 minutes'),
  body('assessmentType')
    .optional()
    .isIn(['video', 'text', 'audio'])
    .withMessage('Assessment type must be one of: video, text, audio'),
  body('status')
    .optional()
    .isIn(['draft', 'published'])
    .withMessage('Status must be either draft or published')
];

// Public API routes (no authentication required)

// Get all published assessments for public access
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Build query with filters (only published assessments)
    let whereConditions = ['status = "published"'];
    let queryParams = [];

    if (search) {
      whereConditions.push('(title LIKE ? OR description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM assessments ${whereClause}`;
    const [countResult] = await db.query(countQuery, queryParams);
    const total = countResult.total;

    // Get paginated results
    const assessmentsQuery = `
      SELECT 
        id, title, description, category, difficulty_level as difficultyLevel,
        estimated_duration as estimatedDuration, assessment_type as assessmentType,
        url, created_at as createdAt
      FROM assessments 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const assessments = await db.query(assessmentsQuery, [...queryParams, limit, offset]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      assessments,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Get public assessments error:', error);
    res.status(500).json({ error: 'Failed to get assessments' });
  }
});

// Admin route for getting assessments (must be before /:uuid route)
router.get('/admin', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const search = req.query.search || '';

    // Build query with filters
    let whereConditions = [];
    let queryParams = [];

    if (status) {
      whereConditions.push('status = ?');
      queryParams.push(status);
    }

    if (search) {
      whereConditions.push('(title LIKE ? OR description LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM assessments ${whereClause}`;
    const [countResult] = await db.query(countQuery, queryParams);
    const total = countResult.total;

    // Get paginated results
    const assessmentsQuery = `
      SELECT 
        id, title, description, category, difficulty_level as difficultyLevel,
        estimated_duration as estimatedDuration, assessment_type as assessmentType,
        status, questions_file as questionsFile, questions_file_id as questionsFileId,
        avatar_config as avatarConfig, url, created_by as createdBy,
        created_at as createdAt, updated_at as updatedAt
      FROM assessments 
      ${whereClause}
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const assessments = await db.query(assessmentsQuery, [...queryParams, limit, offset]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      assessments,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Get assessments error:', error);
    res.status(500).json({ error: 'Failed to get assessments' });
  }
});

// Get assessment by UUID for public access
router.get('/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    
    const [assessment] = await db.query(
      `SELECT 
        id, title, description, category, difficulty_level as difficultyLevel,
        estimated_duration as estimatedDuration, assessment_type as assessmentType,
        status, questions_file as questionsFile, questions_file_id as questionsFileId,
        avatar_config as avatarConfig, url, created_at as createdAt
       FROM assessments WHERE url = ? AND status = "published"`,
      [uuid]
    );

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json({ assessment });

  } catch (error) {
    logger.error('Get public assessment error:', error);
    res.status(500).json({ error: 'Failed to get assessment' });
  }
});

// Protected routes (authentication required)

// Create assessment (without file upload)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      difficultyLevel,
      estimatedDuration = 20,
      assessmentType = 'video',
      status = 'draft'
    } = req.body;

    // Generate unique ID and URL for assessment
    const assessmentId = IdGenerator.generateIdWithTimestamp();
    const assessmentUrl = UrlGenerator.generateAssessmentUrl(title);

    // Insert assessment into database
    await db.pool.execute(
      `INSERT INTO assessments (
        id, title, description, category, difficulty_level, estimated_duration, 
        assessment_type, status, url, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assessmentId,
        title,
        description,
        category || null,
        difficultyLevel || null,
        parseInt(estimatedDuration),
        assessmentType,
        status,
        assessmentUrl,
        req.user.id
      ]
    );

    // Get the created assessment
    const [createdAssessment] = await db.query(
      `SELECT 
        id, title, description, category, difficulty_level as difficultyLevel,
        estimated_duration as estimatedDuration, assessment_type as assessmentType,
        status, questions_file as questionsFile, questions_file_id as questionsFileId,
        avatar_config as avatarConfig, url, created_at as createdAt
       FROM assessments WHERE id = ?`,
      [assessmentId]
    );

    logger.info(`Assessment created: ${assessmentId} by user: ${req.user?.email || 'public'}`);

    res.status(201).json({
      message: 'Assessment created successfully',
      assessment: createdAssessment
    });

  } catch (error) {
    logger.error('Create assessment error:', error);
    res.status(500).json({
      error: 'Failed to create assessment'
    });
  }
});

// Get assessment by ID
router.get('/id/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [assessment] = await db.query(
      `SELECT 
        id, title, description, category, difficulty_level as difficultyLevel,
        estimated_duration as estimatedDuration, assessment_type as assessmentType,
        status, questions_file as questionsFile, questions_file_id as questionsFileId,
        created_by as createdBy, created_at as createdAt, updated_at as updatedAt
       FROM assessments WHERE id = ?`,
      [id]
    );

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json({ assessment });

  } catch (error) {
    logger.error('Get assessment error:', error);
    res.status(500).json({ error: 'Failed to get assessment' });
  }
});

// Update assessment (without file upload)
router.put('/id/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if assessment exists
    const [existingAssessment] = await db.query(
      'SELECT * FROM assessments WHERE id = ?',
      [id]
    );

    if (!existingAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const {
      title,
      description,
      category,
      difficultyLevel,
      estimatedDuration,
      assessmentType,
      status
    } = req.body;

    // Build update query
    const updateFields = [];
    const updateParams = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateParams.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateParams.push(description);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateParams.push(category);
    }
    if (difficultyLevel !== undefined) {
      updateFields.push('difficulty_level = ?');
      updateParams.push(difficultyLevel);
    }
    if (estimatedDuration !== undefined) {
      updateFields.push('estimated_duration = ?');
      updateParams.push(parseInt(estimatedDuration));
    }
    if (assessmentType !== undefined) {
      updateFields.push('assessment_type = ?');
      updateParams.push(assessmentType);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add id to params
    updateParams.push(id);

    // Update assessment
    await db.query(
      `UPDATE assessments SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    // Get updated assessment
    const [updatedAssessment] = await db.query(
      `SELECT 
        id, title, description, category, difficulty_level as difficultyLevel,
        estimated_duration as estimatedDuration, assessment_type as assessmentType,
        status, questions_file as questionsFile, questions_file_id as questionsFileId,
        avatar_config as avatarConfig, created_by as createdBy,
        created_at as createdAt, updated_at as updatedAt
       FROM assessments WHERE id = ?`,
      [id]
    );

    logger.info(`Assessment updated: ${id} by user: ${req.user?.email || 'public'}`);

    res.json({
      message: 'Assessment updated successfully',
      assessment: updatedAssessment
    });

  } catch (error) {
    logger.error('Update assessment error:', error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
});

// Delete assessment
router.delete('/id/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if assessment exists
    const [existingAssessment] = await db.query(
      'SELECT id FROM assessments WHERE id = ?',
      [id]
    );

    if (!existingAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Delete assessment
    await db.query('DELETE FROM assessments WHERE id = ?', [id]);

    logger.info(`Assessment deleted: ${id} by user: ${req.user?.email || 'public'}`);

    res.json({ message: 'Assessment deleted successfully' });

  } catch (error) {
    logger.error('Delete assessment error:', error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
});

// Publish assessment with avatar configuration and file association
router.patch('/id/:id/publish', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      questionsFileId, 
      avatarConfig,
      assessmentType = 'video'
    } = req.body;
    
    // Check if assessment exists
    const [existingAssessment] = await db.query(
      'SELECT * FROM assessments WHERE id = ?',
      [id]
    );

    if (!existingAssessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Check if assessment already has a questions file
    const hasExistingFile = existingAssessment.questions_file_id || existingAssessment.questions_file;
    
    // Validate required fields for publishing
    if (!questionsFileId && !hasExistingFile) {
      return res.status(400).json({
        error: 'Questions file ID is required to publish an assessment'
      });
    }

    if (!avatarConfig) {
      return res.status(400).json({
        error: 'Avatar configuration is required to publish an assessment'
      });
    }

    // Validate avatar configuration structure (accept the fields being sent from frontend)
    if (typeof avatarConfig !== 'object' || avatarConfig === null) {
      return res.status(400).json({
        error: 'Avatar configuration must be an object'
      });
    }

    let questionsFile = null;
    let fileId = questionsFileId;
    let fileUrl = null;

    if (questionsFileId) {
      // Verify the new questions file exists and belongs to the user
      const [newQuestionsFile] = await db.query(
        'SELECT * FROM uploaded_files WHERE id = ? AND uploaded_by = ? AND folder = "assessments"',
        [questionsFileId, req.user.id]
      );

      if (!newQuestionsFile) {
        return res.status(404).json({
          error: 'Questions file not found or access denied'
        });
      }

      questionsFile = newQuestionsFile;
      fileUrl = newQuestionsFile.file_url;

      // Debug: Log the questions file data
      logger.info('New questions file data:', {
        id: questionsFile.id,
        filename: questionsFile.filename,
        file_url: questionsFile.file_url,
        original_name: questionsFile.original_name
      });
    } else {
      // Use existing file data
      fileId = existingAssessment.questions_file_id;
      fileUrl = existingAssessment.questions_file;
      
      logger.info('Using existing file data:', {
        fileId: fileId,
        fileUrl: fileUrl
      });
    }

    // Update assessment with file association, avatar config, and publish status
    const updateData = {
      status: 'published',
      questions_file: fileUrl,
      questions_file_id: fileId,
      avatar_config: JSON.stringify(avatarConfig),
      assessment_type: assessmentType
    };
    
    logger.info('Updating assessment with data:', updateData);
    
    await db.query(
      `UPDATE assessments SET 
        status = ?, 
        questions_file = ?, 
        questions_file_id = ?, 
        avatar_config = ?,
        assessment_type = ?
       WHERE id = ?`,
      [
        'published',
        fileUrl,
        fileId,
        JSON.stringify(avatarConfig),
        assessmentType,
        id
      ]
    );

    // Get updated assessment
    const [updatedAssessment] = await db.query(
      `SELECT 
        id, title, description, category, difficulty_level as difficultyLevel,
        estimated_duration as estimatedDuration, assessment_type as assessmentType,
        status, questions_file as questionsFile, questions_file_id as questionsFileId,
        avatar_config as avatarConfig, url, created_by as createdBy,
        created_at as createdAt, updated_at as updatedAt
       FROM assessments WHERE id = ?`,
      [id]
    );

    // Debug: Log the updated assessment data
    logger.info('Updated assessment data:', {
      id: updatedAssessment.id,
      questions_file: updatedAssessment.questionsFile,
      questions_file_id: updatedAssessment.questionsFileId,
      status: updatedAssessment.status
    });

    logger.info(`Assessment published with avatar config: ${id} by user: ${req.user?.email || 'public'}`);

    res.json({
      message: 'Assessment published successfully with avatar configuration',
      assessment: updatedAssessment
    });

  } catch (error) {
    logger.error('Publish assessment error:', error);
    res.status(500).json({ error: 'Failed to publish assessment' });
  }
});

// Get avatar configuration for assessment
router.get('/id/:id/avatar-config', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get assessment with avatar config
    const [assessment] = await db.query(
      `SELECT 
        id, title, description, category, difficulty_level as difficultyLevel,
        estimated_duration as estimatedDuration, assessment_type as assessmentType,
        status, questions_file as questionsFile, questions_file_id as questionsFileId,
        avatar_config as avatarConfig, url, created_by as createdBy,
        created_at as createdAt, updated_at as updatedAt
       FROM assessments WHERE id = ?`,
      [id]
    );

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Parse avatar config if it exists
    let avatarConfig = null;
    if (assessment.avatarConfig) {
      try {
        avatarConfig = JSON.parse(assessment.avatarConfig);
      } catch (error) {
        logger.error('Error parsing avatar config:', error);
      }
    }

    // Get available avatars
    const availableAvatars = [
      {
        id: 'dr-jacob-jones',
        name: 'Dr. Jacob Jones',
        image: '/avatars/dr-jacob-jones.jpg',
        description: 'Experienced male doctor with professional demeanor',
        specialties: ['General Medicine', 'Internal Medicine']
      },
      {
        id: 'dr-jane-doe',
        name: 'Dr. Jane Doe', 
        image: '/avatars/dr-jane-doe.jpg',
        description: 'Compassionate female doctor with excellent bedside manner',
        specialties: ['Family Medicine', 'Pediatrics']
      }
    ];

    // Get available emotional styles
    const emotionalStyles = [
      { id: 'excited', name: 'Excited', description: 'Enthusiastic and energetic' },
      { id: 'serious', name: 'Serious', description: 'Professional and focused' },
      { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' }
    ];

    // Get available tones
    const tones = [
      { id: 'formal', name: 'Formal', description: 'Professional and structured' },
      { id: 'informal', name: 'Informal', description: 'Casual and relaxed' },
      { id: 'balanced', name: 'Balanced', description: 'Professional yet approachable' }
    ];

    res.json({
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        status: assessment.status,
        url: assessment.url
      },
      avatarConfig: avatarConfig,
      availableAvatars: availableAvatars,
      emotionalStyles: emotionalStyles,
      tones: tones
    });

  } catch (error) {
    logger.error('Get avatar config error:', error);
    res.status(500).json({ error: 'Failed to get avatar configuration' });
  }
});

// Start assessment with Heygen streaming
router.post('/:id/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { mode = 'video' } = req.body;
    
    logger.info('Assessment start request received:', {
      assessmentId: id,
      mode: mode,
      userId: req.user.id,
      userEmail: req.user?.email || 'public'
    });

    // Validate assessment ID format
    if (!id || id.length < 10) {
      logger.error('Invalid assessment ID format:', id);
      return res.status(400).json({ error: 'Invalid assessment ID format' });
    }
    
    // Check if assessment exists and is published
    let assessment;
    try {
      const [assessmentResult] = await db.query(
        `SELECT 
          id, title, description, category, difficulty_level as difficultyLevel,
          estimated_duration as estimatedDuration, assessment_type as assessmentType,
          status, questions_file as questionsFile, avatar_config as avatarConfig,
          url, created_at as createdAt
         FROM assessments WHERE id = ? AND status = "published"`,
        [id]
      );
      
      assessment = assessmentResult;
      
      if (!assessment) {
        logger.error('Assessment not found or not published:', id);
        return res.status(404).json({ error: 'Assessment not found or not published' });
      }
      
      logger.info('Assessment found:', {
        id: assessment.id,
        title: assessment.title,
        status: assessment.status
      });
      
    } catch (dbError) {
      logger.error('Database error in assessment query:', dbError);
      return res.status(500).json({ error: 'Database error while fetching assessment' });
    }

    // Check if user already has an active session for this assessment
    try {
      const [existingSession] = await db.query(
        'SELECT * FROM assessment_sessions WHERE assessment_id = ? AND user_id = ? AND status = "active"',
        [id, req.user.id]
      );

      if (existingSession) {
        logger.info('User already has active session:', {
          sessionId: existingSession.id,
          assessmentId: id,
          userId: req.user.id
        });
        
        return res.status(400).json({ 
          error: 'You already have an active session for this assessment',
          sessionId: existingSession.id,
          streamUrl: existingSession.stream_url
        });
      }
    } catch (dbError) {
      logger.error('Database error in session check:', dbError);
      return res.status(500).json({ error: 'Database error while checking existing sessions' });
    }

    // Parse avatar configuration
    let avatarConfig = {};
    if (assessment.avatarConfig) {
      try {
        avatarConfig = typeof assessment.avatarConfig === 'string' 
          ? JSON.parse(assessment.avatarConfig) 
          : assessment.avatarConfig;
        
        logger.info('Avatar config parsed successfully:', avatarConfig);
      } catch (error) {
        logger.error('Error parsing avatar config:', error);
        // Continue with empty avatar config
      }
    } else {
      logger.info('No avatar config found, using defaults');
    }

    // Map avatar configuration to Heygen parameters
    const avatarName = avatarConfig.avatarPersona === 'dr-jane-doe' ? 'avatar_002' : 'avatar_001';
    const voiceSettings = {
      rate: 1.0,
      emotion: avatarConfig.voiceTone || 'friendly',
      elevenlabs_settings: {}
    };

    logger.info('Heygen parameters prepared:', {
      avatarName: avatarName,
      voiceSettings: voiceSettings
    });

    // Get questions from assessment_questions table
    let questionsData = null;
    try {
      const [questionsResult] = await db.query(
        'SELECT questions_text FROM assessment_questions WHERE assessment_id = ? ORDER BY created_at DESC LIMIT 1',
        [id]
      );
      
      questionsData = questionsResult;
      
      if (questionsData && questionsData.questions_text) {
        logger.info('Questions found for assessment');
      } else {
        logger.info('No questions found for assessment');
      }
    } catch (dbError) {
      logger.error('Database error in questions query:', dbError);
      // Continue without questions
    }

    let firstQuestion = avatarConfig.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience.";
    let spokenText = null;
    let aiScript = null;

    if (questionsData && questionsData.questions_text) {
      try {
        // Generate spoken text using OpenAI
        const openaiResult = await openaiService.generateSpokenText(questionsData.questions_text);
        
        if (openaiResult.success) {
          spokenText = openaiResult.spokenText;
          aiScript = openaiResult.aiScript;
          firstQuestion = spokenText;
          
          logger.info('OpenAI spoken text generated successfully');
          
          // Update assessment_questions with spoken text
          await db.query(
            'UPDATE assessment_questions SET spoken_text = ?, ai_script = ? WHERE assessment_id = ?',
            [spokenText, JSON.stringify(aiScript), id]
          );
        }
      } catch (openaiError) {
        logger.error('OpenAI error:', openaiError);
        // Continue with default first question
      }
    }

    logger.info('Starting Heygen streaming for assessment:', {
      assessmentId: id,
      userId: req.user.id,
      avatarName: avatarName,
      voiceSettings: voiceSettings,
      firstQuestion: firstQuestion.substring(0, 100) + '...'
    });

    // Create Heygen streaming session
    let heygenResult;
    try {
      heygenResult = await heygenService.startAssessmentStreaming({
        avatarName,
        quality: 'high',
        voiceSettings,
        assessmentId: id,
        firstQuestion
      });
      
      logger.info('Heygen streaming session created:', {
        success: heygenResult.success,
        sessionId: heygenResult.sessionId,
        mock: heygenResult.mock || false
      });
      
    } catch (heygenError) {
      logger.error('Heygen service error:', heygenError);
      return res.status(500).json({ 
        error: 'Failed to create streaming session',
        details: heygenError.message
      });
    }

    // After creating Heygen session, automatically send "hi" to start the conversation
    let initialAIResponse = null;
    let conversationData = null;
    
    try {
      const chatSessionId = `session_${Date.now()}`;
      
      // Prepare initial payload for AvatarAI
      const initialPayload = {
        user_reply: "hi",
        course_id: id,
        user_id: req.user.id,
        user_name: req.user.name || 'User',
        chat_session_id: 'session_17246304000123',
        doctor_name: avatarConfig.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones',
        doctor_avatar: avatarConfig.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png',
        doctor_tone: avatarConfig.voiceTone || 'Formal',
        doctor_mood: avatarConfig.emotionalStyle || 'Excited',
        message_id: null,
        welcome_message: avatarConfig.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience."
      };

      logger.info('Sending initial "hi" to AvatarAI with payload:', initialPayload);

      // Send initial "hi" to AvatarAI
      const avatarAIResult = await openaiService.sendUserReply(initialPayload);
      
      if (avatarAIResult.success) {
        initialAIResponse = avatarAIResult.data.reply;
        conversationData = avatarAIResult.data.data;
        
        logger.info('AvatarAI response received:', {
          hasReply: !!initialAIResponse,
          replyLength: initialAIResponse ? initialAIResponse.length : 0
        });
        
        // Send the AI response to Heygen streaming session
        try {
          await heygenService.sendTextToStream(heygenResult.sessionId, initialAIResponse);
          logger.info('Initial AI response sent to Heygen streaming session');
        } catch (heygenTextError) {
          logger.error('Error sending text to Heygen:', heygenTextError);
          // Don't fail the session creation if this fails
        }
        
        logger.info('Initial "hi" sent to AvatarAI and response sent to Heygen');
      } else {
        logger.error('AvatarAI failed to respond:', avatarAIResult.error);
      }
    } catch (error) {
      logger.error('Error sending initial "hi" to AvatarAI:', error);
      // Don't fail the session creation if this fails
    }

    if (!heygenResult.success) {
      logger.error('Failed to create Heygen streaming session:', heygenResult.error);
      return res.status(500).json({ 
        error: 'Failed to create streaming session',
        details: heygenResult.error
      });
    }

    // Create assessment session record
    let sessionId;
    try {
      sessionId = IdGenerator.generateIdWithTimestamp();
      
      await db.query(
        `INSERT INTO assessment_sessions (
          id, assessment_id, user_id, heygen_session_id, stream_url, 
          status, avatar_config, first_question
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          id,
          req.user.id,
          heygenResult.sessionId,
          heygenResult.streamUrl,
          'active',
          JSON.stringify(avatarConfig),
          firstQuestion
        ]
      );

      logger.info(`Assessment session created: ${sessionId} for assessment: ${id} by user: ${req.user?.email || 'public'}`);
      
    } catch (dbError) {
      logger.error('Database error creating assessment session:', dbError);
      return res.status(500).json({ error: 'Failed to create assessment session in database' });
    }

    // Prepare success response
    const responseData = {
      success: true,
      sessionId: sessionId,
      heygenSessionId: heygenResult.sessionId,
      streamUrl: heygenResult.streamUrl,
      messageId: heygenResult.messageId,
      spokenText: spokenText,
      aiScript: aiScript,
      initialAIResponse: initialAIResponse,
      conversationData: conversationData,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        mode: mode
      },
      avatarConfig: avatarConfig
    };

    logger.info('Assessment start completed successfully:', {
      sessionId: sessionId,
      assessmentId: id,
      userId: req.user.id,
      mock: heygenResult.mock || false
    });

    res.json(responseData);

  } catch (error) {
    logger.error('Start assessment error:', error);
    res.status(500).json({ error: 'Failed to start assessment' });
  }
});

// Stop assessment session
router.post('/:id/stop', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find active session for this assessment and user
    const [session] = await db.query(
      'SELECT * FROM assessment_sessions WHERE assessment_id = ? AND user_id = ? AND status = "active"',
      [id, req.user.id]
    );

    if (!session) {
      return res.status(404).json({ error: 'No active session found for this assessment' });
    }

    // Stop Heygen streaming session
    const heygenResult = await heygenService.stopStreamingSession(session.heygen_session_id);

    // Update session status
    await db.query(
      'UPDATE assessment_sessions SET status = "completed", ended_at = CURRENT_TIMESTAMP WHERE id = ?',
      [session.id]
    );

    logger.info(`Assessment session stopped: ${session.id} for assessment: ${id} by user: ${req.user?.email || 'public'}`);

    res.json({
      success: true,
      message: 'Assessment session stopped successfully',
      sessionId: session.id
    });

  } catch (error) {
    logger.error('Stop assessment error:', error);
    res.status(500).json({ error: 'Failed to stop assessment' });
  }
});

// Get assessment session status
router.get('/:id/session', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find active session for this assessment and user
    const [session] = await db.query(
      'SELECT * FROM assessment_sessions WHERE assessment_id = ? AND user_id = ? AND status = "active"',
      [id, req.user.id]
    );

    if (!session) {
      return res.status(404).json({ error: 'No active session found for this assessment' });
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        heygenSessionId: session.heygen_session_id,
        streamUrl: session.stream_url,
        status: session.status,
        startedAt: session.started_at,
        avatarConfig: session.avatar_config ? JSON.parse(session.avatar_config) : null
      }
    });

  } catch (error) {
    logger.error('Get assessment session error:', error);
    res.status(500).json({ error: 'Failed to get assessment session' });
  }
});

// Send user reply to AvatarAI and get next question
router.post('/:id/send-reply', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userReply, chatSessionId = `session_${Date.now()}` } = req.body;
    
    if (!userReply) {
      return res.status(400).json({ error: 'User reply is required' });
    }

    // Find active session for this assessment and user
    const [session] = await db.query(
      'SELECT * FROM assessment_sessions WHERE assessment_id = ? AND user_id = ? AND status = "active"',
      [id, req.user.id]
    );

    if (!session) {
      return res.status(404).json({ error: 'No active session found for this assessment' });
    }

    // Get assessment and avatar config
    const [assessment] = await db.query(
      'SELECT * FROM assessments WHERE id = ?',
      [id]
    );

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Parse avatar configuration
    let avatarConfig = {};
    if (assessment.avatar_config) {
      try {
        avatarConfig = typeof assessment.avatar_config === 'string' 
          ? JSON.parse(assessment.avatar_config) 
          : assessment.avatar_config;
      } catch (error) {
        logger.error('Error parsing avatar config:', error);
      }
    }

    // Prepare payload for AvatarAI
    const avatarAIPayload = {
      user_reply: userReply,
      course_id: id,
      user_id: req.user.id,
      user_name: req.user.name || 'User',
      chat_session_id: chatSessionId,
      doctor_name: avatarConfig.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones',
      doctor_avatar: avatarConfig.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png',
      doctor_tone: avatarConfig.voiceTone || 'Formal',
      doctor_mood: avatarConfig.emotionalStyle || 'Excited',
      message_id: null,
      welcome_message: avatarConfig.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience."
    };

    // Send to AvatarAI
    const avatarAIResult = await openaiService.sendUserReply(avatarAIPayload);

    if (!avatarAIResult.success) {
      return res.status(500).json({ 
        error: 'Failed to get response from AvatarAI',
        details: avatarAIResult.error
      });
    }

    // Extract the AI response - check for next_question first, then fallback to reply
    const nextQuestion = avatarAIResult.data.next_question;
    const aiResponse = avatarAIResult.data.reply || avatarAIResult.data.response;
    const conversationData = avatarAIResult.data.data;

    // Use next_question if available, otherwise use aiResponse
    const responseToSend = nextQuestion || aiResponse;

    // Send the AI response to Heygen streaming session
    const heygenResult = await heygenService.sendTextToStream(session.heygen_session_id, responseToSend);

    logger.info(`User reply processed: ${session.id}, AI response sent to Heygen`);

    res.json({
      success: true,
      aiResponse: responseToSend,
      nextQuestion: nextQuestion,
      conversationData: conversationData,
      sessionId: session.id,
      messageId: heygenResult?.messageId || null
    });

  } catch (error) {
    logger.error('Send reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Chat endpoint that integrates with AvatarAI completions API (moved here for proper routing)
router.post('/:id/chat', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_reply, chat_session_id = `session_${Date.now()}` } = req.body;
    
    if (!user_reply) {
      return res.status(400).json({ error: 'User reply is required' });
    }

    // Find active session for this assessment and user
    const [session] = await db.query(
      'SELECT * FROM assessment_sessions WHERE assessment_id = ? AND user_id = ? AND status = "active"',
      [id, req.user.id]
    );

    if (!session) {
      return res.status(404).json({ error: 'No active session found for this assessment' });
    }

    // Get assessment and avatar config
    const [assessment] = await db.query(
      'SELECT * FROM assessments WHERE id = ?',
      [id]
    );

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Parse avatar configuration
    let avatarConfig = {};
    if (assessment.avatar_config) {
      try {
        avatarConfig = typeof assessment.avatar_config === 'string' 
          ? JSON.parse(assessment.avatar_config) 
          : assessment.avatar_config;
      } catch (error) {
        logger.error('Error parsing avatar config:', error);
      }
    }

    // Prepare payload for AvatarAI completions API
    const avatarAIPayload = {
      user_reply: user_reply,
      course_id: id,
      user_id: req.user.id,
      user_name: req.user.name || 'User',
      chat_session_id: chat_session_id,
      doctor_name: avatarConfig.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones',
      doctor_avatar: avatarConfig.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png',
      doctor_tone: avatarConfig.voiceTone || 'Formal',
      doctor_mood: avatarConfig.emotionalStyle || 'Excited',
      message_id: null,
      welcome_message: avatarConfig.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience."
    };

    // Call AvatarAI completions API
    const avatarAIResult = await openaiService.sendUserReply(avatarAIPayload);

    if (!avatarAIResult.success) {
      return res.status(500).json({ 
        error: 'Failed to get response from AvatarAI',
        details: avatarAIResult.error
      });
    }

    // Extract the AI response - check for next_question first, then fallback to reply
    const nextQuestion = avatarAIResult.data.next_question;
    const aiResponse = avatarAIResult.data.reply || avatarAIResult.data.response;
    const conversationData = avatarAIResult.data.data;

    // Use next_question if available, otherwise use aiResponse
    const responseToSend = nextQuestion || aiResponse;

    // Send the AI response to Heygen streaming session for avatar speech
    const heygenResult = await heygenService.sendTextToStream(session.heygen_session_id, responseToSend);

    // Store conversation in database (you can add a conversations table if needed)
    // For now, we'll log it
    logger.info(`Chat conversation stored: ${session.id}, user: ${req.user.id}, AI response: ${responseToSend.substring(0, 100)}...`);

    logger.info(`Chat processed: ${session.id}, AI response sent to Heygen`);

    res.json({
      success: true,
      assistant_reply: responseToSend,
      next_question: nextQuestion,
      audio_text: responseToSend, // Same as assistant_reply for now
      conversationData: conversationData,
      sessionId: session.id,
      messageId: heygenResult?.messageId || null
    });

  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat' });
  }
});

// Send text to streaming session (legacy endpoint)
router.post('/:id/send-text', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Find active session for this assessment and user
    const [session] = await db.query(
      'SELECT * FROM assessment_sessions WHERE assessment_id = ? AND user_id = ? AND status = "active"',
      [id, req.user.id]
    );

    if (!session) {
      return res.status(404).json({ error: 'No active session found for this assessment' });
    }

    // Send text to Heygen streaming session
    const heygenResult = await heygenService.sendTextToStream(session.heygen_session_id, text);

    if (!heygenResult.success) {
      return res.status(500).json({ 
        error: 'Failed to send text to streaming session',
        details: heygenResult.error
      });
    }

    logger.info(`Text sent to session: ${session.id}, messageId: ${heygenResult.messageId}`);

    res.json({
      success: true,
      messageId: heygenResult.messageId,
      sessionId: session.id
    });

  } catch (error) {
    logger.error('Send text error:', error);
    res.status(500).json({ error: 'Failed to send text' });
  }
});

// Create assessment session (frontend handles Heygen) - supports both authenticated and public access
router.post('/:id/create-session', async (req, res) => {
  try {
    const { id } = req.params;
    const { heygenSessionId, streamUrl, mode = 'video', avatarConfig } = req.body;
    
    logger.info('Creating assessment session (frontend Heygen):', {
      assessmentId: id,
      heygenSessionId: heygenSessionId,
      mode: mode,
      userId: req.user?.id || 'public',
      userEmail: req.user?.email || 'public'
    });

    // Validate assessment ID format
    if (!id || id.length < 10) {
      logger.error('Invalid assessment ID format:', id);
      return res.status(400).json({ error: 'Invalid assessment ID format' });
    }
    
    // Check if assessment exists and is published
    let assessment;
    try {
      const [assessmentResult] = await db.query(
        `SELECT 
          id, title, description, category, difficulty_level as difficultyLevel,
          estimated_duration as estimatedDuration, assessment_type as assessmentType,
          status, questions_file as questionsFile, avatar_config as avatarConfig,
          url, created_at as createdAt
         FROM assessments WHERE id = ? AND status = "published"`,
        [id]
      );
      
      assessment = assessmentResult;
      
      if (!assessment) {
        logger.error('Assessment not found or not published:', id);
        return res.status(404).json({ error: 'Assessment not found or not published' });
      }
      
      logger.info('Assessment found:', {
        id: assessment.id,
        title: assessment.title,
        status: assessment.status
      });
      
    } catch (dbError) {
      logger.error('Database error in assessment query:', dbError);
      return res.status(500).json({ error: 'Database error while fetching assessment' });
    }

    // Check if user already has an active session for this assessment (only for authenticated users)
    if (req.user?.id) {
      try {
        const [existingSession] = await db.query(
          'SELECT * FROM assessment_sessions WHERE assessment_id = ? AND user_id = ? AND status = "active"',
          [id, req.user.id]
        );

        if (existingSession) {
          logger.info('User already has active session:', {
            sessionId: existingSession.id,
            assessmentId: id,
            userId: req.user.id
          });
          
          return res.status(400).json({ 
            error: 'You already have an active session for this assessment',
            sessionId: existingSession.id,
            streamUrl: existingSession.stream_url
          });
        }
      } catch (dbError) {
        logger.error('Database error in session check:', dbError);
        return res.status(500).json({ error: 'Database error while checking existing sessions' });
      }
    }

    // Create assessment session record
    let sessionId;
    try {
      sessionId = IdGenerator.generateIdWithTimestamp();
      
      await db.query(
        `INSERT INTO assessment_sessions (
          id, assessment_id, user_id, heygen_session_id, stream_url, 
          status, avatar_config, first_question
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          id,
          req.user?.id || 'public',
          heygenSessionId,
          streamUrl,
          'active',
          JSON.stringify(avatarConfig || {}),
          avatarConfig?.welcomeMessage || "Welcome to this assessment!"
        ]
      );

      logger.info(`Assessment session created: ${sessionId} for assessment: ${id} by user: ${req.user?.email || 'public'}`);
      
    } catch (dbError) {
      logger.error('Database error creating assessment session:', dbError);
      return res.status(500).json({ error: 'Failed to create assessment session in database' });
    }

    // Prepare success response
    const responseData = {
      success: true,
      sessionId: sessionId,
      heygenSessionId: heygenSessionId,
      streamUrl: streamUrl,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        mode: mode
      },
      avatarConfig: avatarConfig || {}
    };

    logger.info('Assessment session creation completed successfully:', {
      sessionId: sessionId,
      assessmentId: id,
      userId: req.user?.id || 'public'
    });

    res.json(responseData);

  } catch (error) {
    logger.error('Create assessment session error:', error);
    res.status(500).json({ error: 'Failed to create assessment session' });
  }
});

module.exports = router;
