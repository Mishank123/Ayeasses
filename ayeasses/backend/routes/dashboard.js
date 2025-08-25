const express = require('express');
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const IdGenerator = require('../utils/idGenerator');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [userStats, contentStats, sessionStats] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM assessment_user'),
      db.query('SELECT COUNT(*) as total FROM content'),
      db.query('SELECT COUNT(*) as total FROM sessions WHERE expires_at > NOW()')
    ]);

    const [activeUsers, publishedContent] = await Promise.all([
      db.query('SELECT COUNT(*) as total FROM assessment_user WHERE status = "active"'),
      db.query('SELECT COUNT(*) as total FROM content WHERE status = "published"')
    ]);

    const stats = {
      totalUsers: userStats[0].total,
      activeUsers: activeUsers[0].total,
      totalContent: contentStats[0].total,
      publishedContent: publishedContent[0].total,
      activeSessions: sessionStats[0].total
    };

    res.json({ stats });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to get dashboard statistics' });
  }
});

// Get recent activity
router.get('/recent-activity', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const recentUsers = await db.query(
      'SELECT id, username, email, role, created_at FROM assessment_user ORDER BY created_at DESC LIMIT ?',
      [limit]
    );

    const recentContent = await db.query(
      `SELECT c.id, c.title, c.status, c.created_at, u.username as created_by 
       FROM content c 
       JOIN assessment_user u ON c.created_by = u.id 
       ORDER BY c.created_at DESC LIMIT ?`,
      [limit]
    );

    res.json({
      recentUsers,
      recentContent
    });
  } catch (error) {
    logger.error('Get recent activity error:', error);
    res.status(500).json({ error: 'Failed to get recent activity' });
  }
});

// Get content management data
router.get('/content', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const status = req.query.status || '';
    const search = req.query.search || '';

    let query = `
      SELECT c.id, c.title, c.description, c.image_url, c.status, c.created_at, c.updated_at,
             u.username as created_by
      FROM content c
      JOIN assessment_user u ON c.created_by = u.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM content WHERE 1=1';
    let params = [];

    if (status) {
      query += ' AND c.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (c.title LIKE ? OR c.description LIKE ?)';
      countQuery += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [content, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, status || search ? params.slice(0, -2) : [])
    ]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      content,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Get content error:', error);
    res.status(500).json({ error: 'Failed to get content' });
  }
});

// Create content
router.post('/content', authenticateToken, async (req, res) => {
  try {
    const { title, description, image_url, status = 'draft' } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Generate unique ID for content
    const contentId = IdGenerator.generateIdWithTimestamp();

    await db.query(
      'INSERT INTO content (id, title, description, image_url, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [contentId, title, description, image_url, status, req.user.id]
    );

    const newContent = {
      id: contentId,
      title,
      description,
      image_url,
      status,
      created_by: req.user.id,
      created_at: new Date()
    };

    logger.info(`Content created: ${title} by user: ${req.user.email}`);

    res.status(201).json({
      message: 'Content created successfully',
      content: newContent
    });
  } catch (error) {
    logger.error('Create content error:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// Update content
router.put('/content/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, status } = req.body;

    // Check if content exists
    const existingContent = await db.query(
      'SELECT id FROM content WHERE id = ?',
      [id]
    );

    if (existingContent.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];

    if (title) {
      updateFields.push('title = ?');
      updateParams.push(title);
    }
    if (description) {
      updateFields.push('description = ?');
      updateParams.push(description);
    }
    if (image_url !== undefined) {
      updateFields.push('image_url = ?');
      updateParams.push(image_url);
    }
    if (status) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateParams.push(id);

    await db.query(
      `UPDATE content SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    logger.info(`Content updated: ${id} by user: ${req.user.email}`);

    res.json({ message: 'Content updated successfully' });
  } catch (error) {
    logger.error('Update content error:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Delete content
router.delete('/content/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if content exists
    const existingContent = await db.query(
      'SELECT id FROM content WHERE id = ?',
      [id]
    );

    if (existingContent.length === 0) {
      return res.status(404).json({ error: 'Content not found' });
    }

    await db.query('DELETE FROM content WHERE id = ?', [id]);

    logger.info(`Content deleted: ${id} by user: ${req.user.email}`);

    res.json({ message: 'Content deleted successfully' });
  } catch (error) {
    logger.error('Delete content error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

module.exports = router;
