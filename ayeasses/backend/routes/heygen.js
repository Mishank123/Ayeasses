const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const heygenService = require('../services/heygen');
const logger = require('../utils/logger');

const router = express.Router();

// Validation middleware
const sessionValidation = [
  body('avatarId')
    .notEmpty()
    .withMessage('Avatar ID is required'),
  body('mode')
    .isIn(['video', 'audio', 'text'])
    .withMessage('Mode must be video, audio, or text'),
  body('emotionalStyle')
    .isIn(['excited', 'serious', 'friendly'])
    .withMessage('Emotional style must be excited, serious, or friendly'),
  body('tone')
    .isIn(['formal', 'informal', 'balanced'])
    .withMessage('Tone must be formal, informal, or balanced'),
  body('assessmentId')
    .notEmpty()
    .withMessage('Assessment ID is required')
];

const streamingTokenValidation = [
  body('avatarId')
    .notEmpty()
    .withMessage('Avatar ID is required'),
  body('mode')
    .isIn(['video', 'audio', 'text'])
    .withMessage('Mode must be video, audio, or text'),
  body('emotionalStyle')
    .optional()
    .isIn(['excited', 'serious', 'friendly'])
    .withMessage('Emotional style must be excited, serious, or friendly'),
  body('tone')
    .optional()
    .isIn(['formal', 'informal', 'balanced'])
    .withMessage('Tone must be formal, informal, or balanced'),
  body('assessmentId')
    .notEmpty()
    .withMessage('Assessment ID is required'),
  body('welcomeMessage')
    .optional()
    .isString()
    .withMessage('Welcome message must be a string')
];

// Create Heygen session
router.post('/session', authenticateToken, sessionValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { avatarId, mode, emotionalStyle, tone, assessmentId } = req.body;

    // Create Heygen session
    const result = await heygenService.createSession({
      avatarId,
      mode,
      emotionalStyle,
      tone,
      assessmentId
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error
      });
    }

    logger.info(`Heygen session created for assessment: ${assessmentId} by user: ${req.user.email}`);

    res.json({
      success: true,
      sessionId: result.sessionId,
      sessionUrl: result.sessionUrl,
      playerUrl: result.playerUrl,
      mode: mode
    });

  } catch (error) {
    logger.error('Create Heygen session error:', error);
    res.status(500).json({
      error: 'Failed to create Heygen session'
    });
  }
});

// Get session status
router.get('/session/:sessionId/status', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await heygenService.getSessionStatus(sessionId);

    if (!result.success) {
      return res.status(500).json({
        error: result.error
      });
    }

    res.json({
      success: true,
      status: result.status,
      data: result.data
    });

  } catch (error) {
    logger.error('Get Heygen session status error:', error);
    res.status(500).json({
      error: 'Failed to get session status'
    });
  }
});

// End session
router.post('/session/:sessionId/end', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await heygenService.endSession(sessionId);

    if (!result.success) {
      return res.status(500).json({
        error: result.error
      });
    }

    logger.info(`Heygen session ended: ${sessionId} by user: ${req.user.email}`);

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('End Heygen session error:', error);
    res.status(500).json({
      error: 'Failed to end session'
    });
  }
});

// Create streaming token for live Heygen API
router.post('/streaming-token', authenticateToken, streamingTokenValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { avatarId, mode, emotionalStyle, tone, assessmentId, welcomeMessage } = req.body;

    // Create Heygen streaming token
    const result = await heygenService.createStreamingToken({
      avatarId,
      mode,
      emotionalStyle,
      tone,
      assessmentId,
      welcomeMessage
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error
      });
    }

    logger.info(`Heygen streaming token created for assessment: ${assessmentId} by user: ${req.user.email}`);

    res.json({
      success: true,
      tokenId: result.tokenId,
      token: result.token,
      sessionUrl: result.sessionUrl,
      playerUrl: result.playerUrl,
      mode: mode,
      avatarId: avatarId,
      emotionalStyle: emotionalStyle,
      tone: tone,
      welcomeMessage: welcomeMessage
    });

  } catch (error) {
    logger.error('Create Heygen streaming token error:', error);
    res.status(500).json({
      error: 'Failed to create Heygen streaming token'
    });
  }
});

// Get available avatars
router.get('/avatars', authenticateToken, async (req, res) => {
  try {
    const result = await heygenService.getAvatars();

    if (!result.success) {
      return res.status(500).json({
        error: result.error
      });
    }

    res.json({
      success: true,
      avatars: result.avatars
    });

  } catch (error) {
    logger.error('Get Heygen avatars error:', error);
    res.status(500).json({
      error: 'Failed to get avatars'
    });
  }
});

// Test Heygen API connection
router.get('/test', authenticateToken, async (req, res) => {
  try {
    logger.info('Testing Heygen API connection...');
    
    // Test the API key by making a simple request
    const testResult = await heygenService.getAvatars();
    
    if (testResult.success) {
      logger.info('Heygen API test successful');
      res.json({
        success: true,
        message: 'Heygen API connection successful',
        avatars: testResult.avatars
      });
    } else {
      logger.error('Heygen API test failed:', testResult.error);
      res.status(500).json({
        success: false,
        error: 'Heygen API connection failed',
        details: testResult.error
      });
    }

  } catch (error) {
    logger.error('Heygen API test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test Heygen API connection',
      details: error.message
    });
  }
});

// Send text to streaming session
router.post('/session/:sessionId/send-text', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Text is required'
      });
    }

    // Send text to Heygen streaming session using the correct API
    const result = await heygenService.sendTextToStream(sessionId, text);

    if (!result.success) {
      return res.status(500).json({
        error: result.error
      });
    }

    logger.info(`Text sent to Heygen session: ${sessionId} by user: ${req.user.email}`);

    res.json({
      success: true,
      messageId: result.messageId,
      sessionId: sessionId
    });

  } catch (error) {
    logger.error('Send text to Heygen session error:', error);
    res.status(500).json({
      error: 'Failed to send text to session'
    });
  }
});

module.exports = router;
