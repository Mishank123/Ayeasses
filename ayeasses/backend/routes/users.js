const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const userValidation = [
  body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['admin', 'manager', 'user']).withMessage('Invalid role'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status')
];

// Get all users (admin and manager only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = `
      SELECT id, username, email, role, status, created_at, updated_at 
      FROM assessment_user 
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM assessment_user WHERE 1=1';
    let params = [];

    if (search) {
      query += ' AND (username LIKE ? OR email LIKE ?)';
      countQuery += ' AND (username LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [users, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, search ? [`%${search}%`, `%${search}%`] : [])
    ]);

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get user by ID (admin and manager only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const users = await db.query(
      'SELECT id, username, email, role, status, created_at, updated_at FROM assessment_user WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user (admin and manager only)
router.put('/:id', authenticateToken, requireAdmin, userValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { username, email, role, status } = req.body;

    // Check if user exists
    const existingUsers = await db.query(
      'SELECT id FROM assessment_user WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for duplicate email/username
    if (email || username) {
      const duplicateQuery = 'SELECT id FROM assessment_user WHERE (email = ? OR username = ?) AND id != ?';
      const duplicateParams = [email, username, id];
      const duplicates = await db.query(duplicateQuery, duplicateParams);

      if (duplicates.length > 0) {
        return res.status(400).json({ error: 'Email or username already exists' });
      }
    }

    // Build update query
    const updateFields = [];
    const updateParams = [];

    if (username) {
      updateFields.push('username = ?');
      updateParams.push(username);
    }
    if (email) {
      updateFields.push('email = ?');
      updateParams.push(email);
    }
    if (role) {
      updateFields.push('role = ?');
      updateParams.push(role);
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
      `UPDATE assessment_user SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    logger.info(`User updated: ${id} by admin: ${req.user.email}`);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (admin and manager only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Check if user exists
    const existingUsers = await db.query(
      'SELECT id FROM assessment_user WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascade will handle sessions)
    await db.query('DELETE FROM assessment_user WHERE id = ?', [id]);

    logger.info(`User deleted: ${id} by admin: ${req.user.email}`);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Toggle user status (admin and manager only)
router.patch('/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deactivation
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const users = await db.query(
      'SELECT id, status FROM assessment_user WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newStatus = users[0].status === 'active' ? 'inactive' : 'active';

    await db.query(
      'UPDATE assessment_user SET status = ? WHERE id = ?',
      [newStatus, id]
    );

    logger.info(`User status toggled: ${id} to ${newStatus} by admin: ${req.user.email}`);

    res.json({ 
      message: 'User status updated successfully',
      status: newStatus
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

module.exports = router;
