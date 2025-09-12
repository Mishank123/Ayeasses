const express = require('express');
const multer = require('multer');
const axios = require('axios');
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const gcpStorage = require('../services/gcpStorage');
const openaiService = require('../services/openaiService');

const router = express.Router();

// Configure multer for memory storage (for GCP upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow images and documents
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Upload single file to GCP
router.post('/file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Determine folder based on file type
    let folder = 'general';
    if (req.file.mimetype.startsWith('image/')) {
      folder = 'images';
    } else if (req.file.mimetype === 'application/pdf') {
      folder = 'documents';
    } else if (req.file.mimetype.includes('word') || req.file.mimetype.includes('excel')) {
      folder = 'documents';
    }

    // Upload to GCP Storage
    const uploadResult = await gcpStorage.uploadFile(req.file, folder);

    // Save file info to database
    const fileId = require('../utils/idGenerator').generateIdWithTimestamp();
    await db.query(
      'INSERT INTO uploaded_files (id, filename, original_name, file_url, file_size, mime_type, uploaded_by, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        fileId,
        uploadResult.fileName,
        uploadResult.originalName,
        uploadResult.url,
        uploadResult.size,
        uploadResult.mimeType,
        req.user.id,
        folder
      ]
    );

    logger.info(`File uploaded to GCP: ${uploadResult.url} by user: ${req.user.email}`);

    res.json({
      message: 'File uploaded successfully',
      fileId: fileId,
      fileUrl: uploadResult.url,
      fileName: uploadResult.fileName,
      originalName: uploadResult.originalName,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      folder: folder
    });

  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Production GCP upload endpoint
router.post('/gcp/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate file type for assessment questions
    const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only PDF, CSV, and Excel files are allowed for assessment questions.' 
      });
    }

    // Upload to GCP Storage
    const uploadResult = await gcpStorage.uploadFile(req.file, 'assessments');

    // Save file info to database
    const fileId = require('../utils/idGenerator').generateIdWithTimestamp();
    await db.query(
      'INSERT INTO uploaded_files (id, filename, original_name, file_url, file_size, mime_type, folder, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        fileId,
        uploadResult.fileName,
        uploadResult.originalName,
        uploadResult.url,
        uploadResult.size,
        uploadResult.mimeType,
        'assessments',
        req.user.id
      ]
    );

    // Extract text from uploaded file
    const textExtractionResult = await openaiService.extractTextFromFile(req.file.buffer, req.file.mimetype);
    
    if (!textExtractionResult.success) {
      logger.error('Text extraction failed:', textExtractionResult.error);
      return res.status(500).json({ error: 'Failed to extract text from file' });
    }

    // Store extracted questions in assessment_questions table
    const questionsId = require('../utils/idGenerator').generateIdWithTimestamp();
    await db.query(
      'INSERT INTO assessment_questions (id, assessment_id, questions_text) VALUES (?, ?, ?)',
      [questionsId, req.body.assessmentId || null, textExtractionResult.extractedText]
    );

    // Send to AvatarAI API
    try {
      const avatarAIPayload = {
        course_id: fileId, // Using fileId as course_id
        user_id: req.user.id,
        file_url: uploadResult.url
      };

      logger.info('Sending to AvatarAI API:', avatarAIPayload);

      const avatarAIResponse = await axios.post('https://avatarai.awwwex.com/v1/agents/course/create', avatarAIPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      logger.info('AvatarAI API response:', avatarAIResponse.data);

    } catch (avatarAIError) {
      logger.error('AvatarAI API call failed:', avatarAIError.response?.data || avatarAIError.message);
      // Don't fail the upload if AvatarAI API fails
    }

    // Send to AvatarAI QnA API
    try {
      const avatarAIQnAPayload = {
        course_id: fileId,
        course_document: uploadResult.url,
        context: textExtractionResult.extractedText || 'Course content uploaded for QnA processing'
      };

      logger.info('Sending to AvatarAI QnA API:', avatarAIQnAPayload);

      const avatarAIQnAResponse = await axios.post('https://avatarai.awwwex.com/v1/agents/qna', avatarAIQnAPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      logger.info('AvatarAI QnA API response:', avatarAIQnAResponse.data);

    } catch (avatarAIQnAError) {
      logger.error('AvatarAI QnA API call failed:', avatarAIQnAError.response?.data || avatarAIQnAError.message);
      // Don't fail the upload if AvatarAI QnA API fails
    }

    logger.info(`Assessment question file uploaded to GCP: ${uploadResult.url} by user: ${req.user.email}`);

    res.json({
      message: 'Assessment question file uploaded successfully',
      fileId: fileId,
      fileUrl: uploadResult.url,
      fileName: uploadResult.fileName,
      originalName: uploadResult.originalName,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      questionsId: questionsId,
      extractedText: textExtractionResult.extractedText
    });

  } catch (error) {
    logger.error('Assessment question file upload error:', error);
    res.status(500).json({ error: 'Failed to upload assessment question file' });
  }
});

// Upload multiple files to GCP
router.post('/files', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        // Determine folder based on file type
        let folder = 'general';
        if (file.mimetype.startsWith('image/')) {
          folder = 'images';
        } else if (file.mimetype === 'application/pdf') {
          folder = 'documents';
        } else if (file.mimetype.includes('word') || file.mimetype.includes('excel')) {
          folder = 'documents';
        }

        // Upload to GCP Storage
        const uploadResult = await gcpStorage.uploadFile(file, folder);

        // Save file info to database
        const fileId = require('../utils/idGenerator').generateIdWithTimestamp();
        await db.query(
          'INSERT INTO uploaded_files (id, filename, original_name, file_url, file_size, mime_type, uploaded_by, folder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            fileId,
            uploadResult.fileName,
            uploadResult.originalName,
            uploadResult.url,
            uploadResult.size,
            uploadResult.mimeType,
            req.user.id,
            folder
          ]
        );

        uploadedFiles.push({
          fileId: fileId,
          fileUrl: uploadResult.url,
          fileName: uploadResult.fileName,
          originalName: uploadResult.originalName,
          size: uploadResult.size,
          mimeType: uploadResult.mimeType,
          folder: folder
        });

      } catch (fileError) {
        logger.error(`Failed to upload file ${file.originalname}:`, fileError);
        // Continue with other files
      }
    }

    logger.info(`${uploadedFiles.length} files uploaded to GCP by user: ${req.user.email}`);

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      totalUploaded: uploadedFiles.length,
      totalRequested: req.files.length
    });

  } catch (error) {
    logger.error('Multiple files upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Upload assessment question file to GCP
router.post('/assessment-questions', authenticateToken, upload.single('questionsFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No question file provided' });
    }

    // Validate file type for assessment questions
    const allowedTypes = ['application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only PDF, CSV, and Excel files are allowed for assessment questions.' 
      });
    }

    // Upload to GCP Storage
    const uploadResult = await gcpStorage.uploadFile(req.file, 'assessments');

    // Save file info to database
    const fileId = require('../utils/idGenerator').generateIdWithTimestamp();
    await db.query(
      'INSERT INTO uploaded_files (id, filename, original_name, file_url, file_size, mime_type, folder, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        fileId,
        uploadResult.fileName,
        uploadResult.originalName,
        uploadResult.url,
        uploadResult.size,
        uploadResult.mimeType,
        'assessments',
        req.user.id
      ]
    );

    // Extract text from uploaded file
    const textExtractionResult = await openaiService.extractTextFromFile(req.file.buffer, req.file.mimetype);
    
    if (!textExtractionResult.success) {
      logger.error('Text extraction failed:', textExtractionResult.error);
      return res.status(500).json({ error: 'Failed to extract text from file' });
    }

    // Store extracted questions in assessment_questions table
    const questionsId = require('../utils/idGenerator').generateIdWithTimestamp();
    await db.query(
      'INSERT INTO assessment_questions (id, assessment_id, questions_text) VALUES (?, ?, ?)',
      [questionsId, req.body.assessmentId || null, textExtractionResult.extractedText]
    );

    // Send to AvatarAI API
    try {
      const avatarAIPayload = {
        course_id: fileId, // Using fileId as course_id
        user_id: req.user.id,
        file_url: uploadResult.url
      };

      logger.info('Sending to AvatarAI API:', avatarAIPayload);

      const avatarAIResponse = await axios.post('https://avatarai.awwwex.com/v1/agents/course/create', avatarAIPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      logger.info('AvatarAI API response:', avatarAIResponse.data);

    } catch (avatarAIError) {
      logger.error('AvatarAI API call failed:', avatarAIError.response?.data || avatarAIError.message);
      // Don't fail the upload if AvatarAI API fails
    }

    // Send to AvatarAI QnA API
    try {
      const avatarAIQnAPayload = {
        course_id: fileId,
        course_document: uploadResult.url,
        context: textExtractionResult.extractedText || 'Course content uploaded for QnA processing'
      };

      logger.info('Sending to AvatarAI QnA API:', avatarAIQnAPayload);

      const avatarAIQnAResponse = await axios.post('https://avatarai.awwwex.com/v1/agents/qna', avatarAIQnAPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      logger.info('AvatarAI QnA API response:', avatarAIQnAResponse.data);

    } catch (avatarAIQnAError) {
      logger.error('AvatarAI QnA API call failed:', avatarAIQnAError.response?.data || avatarAIQnAError.message);
      // Don't fail the upload if AvatarAI QnA API fails
    }

    logger.info(`Assessment question file uploaded to GCP: ${uploadResult.url} by user: ${req.user.email}`);

    res.json({
      message: 'Assessment question file uploaded successfully',
      fileId: fileId,
      fileUrl: uploadResult.url,
      fileName: uploadResult.fileName,
      originalName: uploadResult.originalName,
      size: uploadResult.size,
      mimeType: uploadResult.mimeType,
      questionsId: questionsId,
      extractedText: textExtractionResult.extractedText
    });

  } catch (error) {
    logger.error('Assessment question file upload error:', error);
    res.status(500).json({ error: 'Failed to upload assessment question file' });
  }
});

// Delete file from GCP
router.delete('/file/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Get file info from database
    const files = await db.query(
      'SELECT * FROM uploaded_files WHERE id = ? AND uploaded_by = ?',
      [fileId, req.user.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    const file = files[0];

    // Delete from GCP Storage
    await gcpStorage.deleteFile(file.filename);

    // Delete from database
    await db.query('DELETE FROM uploaded_files WHERE id = ?', [fileId]);

    logger.info(`File deleted from GCP: ${file.filename} by user: ${req.user.email}`);

    res.json({ message: 'File deleted successfully' });

  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Get uploaded files list
router.get('/files', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const folder = req.query.folder;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM uploaded_files WHERE uploaded_by = ?';
    let params = [req.user.id];

    if (folder) {
      query += ' AND folder = ?';
      params.push(folder);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const files = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM uploaded_files WHERE uploaded_by = ?';
    let countParams = [req.user.id];

    if (folder) {
      countQuery += ' AND folder = ?';
      countParams.push(folder);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      files: files,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// Get file by ID
router.get('/file/:fileId', authenticateToken, async (req, res) => {
  try {
    const { fileId } = req.params;

    const files = await db.query(
      'SELECT * FROM uploaded_files WHERE id = ? AND uploaded_by = ?',
      [fileId, req.user.id]
    );

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    res.json({ file: files[0] });

  } catch (error) {
    logger.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});


// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
  }
  
  if (error.message === 'File type not allowed') {
    return res.status(400).json({ error: error.message });
  }

  logger.error('Upload error:', error);
  res.status(500).json({ error: 'Upload failed' });
});

module.exports = router;
