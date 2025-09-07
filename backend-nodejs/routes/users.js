const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../utils/jwt');
const { hashPassword } = require('../utils/password');
const { 
  userValidationRules, 
  handleValidationErrors 
} = require('../utils/validation');

// GET /api/users - Get all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // For now, allow any authenticated user to view users
    // In production, you might want to add role-based access control
    
    const { search, active, page = 1, limit = 20 } = req.query;
    
    let query = 'SELECT id, username, email, first_name, last_name, active, created_at FROM users WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Add search filter
    if (search) {
      paramCount += 4;
      query += ` AND (username ILIKE $${paramCount-3} OR email ILIKE $${paramCount-2} OR first_name ILIKE $${paramCount-1} OR last_name ILIKE $${paramCount})`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Add active filter
    if (active !== undefined) {
      paramCount += 1;
      query += ` AND active = $${paramCount}`;
      params.push(active === 'true');
    }

    // Add ordering
    query += ' ORDER BY created_at DESC';

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount += 2;
    query += ` LIMIT $${paramCount-1} OFFSET $${paramCount}`;
    params.push(parseInt(limit), offset);

    const users = await db.executeQuery(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];
    let countParamCount = 0;
    
    if (search) {
      countParamCount += 4;
      countQuery += ` AND (username ILIKE $${countParamCount-3} OR email ILIKE $${countParamCount-2} OR first_name ILIKE $${countParamCount-1} OR last_name ILIKE $${countParamCount})`;
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (active !== undefined) {
      countParamCount += 1;
      countQuery += ` AND active = $${countParamCount}`;
      countParams.push(active === 'true');
    }

    const countResult = await db.executeQuery(countQuery, countParams);
    const total = parseInt(countResult[0].total);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    // Users can only view their own profile, unless they're admin
    // For now, allow viewing any user (you can add role checks later)
    
    const query = 'SELECT id, username, email, first_name, last_name, active, created_at FROM users WHERE id = $1';
    const users = await db.executeQuery(query, [id]);

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - Create new user (admin only)
router.post('/', authenticateToken, userValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, active = true } = req.body;

    // Check if user already exists
    const existingQuery = 'SELECT id FROM users WHERE username = $1 OR email = $2';
    const existing = await db.executeQuery(existingQuery, [username, email]);

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Insert new user
    const insertQuery = `
      INSERT INTO users (username, email, password, first_name, last_name, active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, first_name, last_name, active, created_at
    `;
    
    const result = await db.executeQuery(insertQuery, [
      username,
      email,
      hashedPassword,
      firstName || null,
      lastName || null,
      active
    ]);

    const newUser = result[0];

    res.status(201).json({
      user: newUser,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const requestingUserId = req.user.id;

    // Users can only update their own profile
    if (parseInt(id) !== requestingUserId) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    // Check if user exists
    const existingQuery = 'SELECT * FROM users WHERE id = ?';
    const existing = await db.executeQuery(existingQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being updated and already exists for another user
    if (updateData.email) {
      const emailQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
      const emailExists = await db.executeQuery(emailQuery, [updateData.email, id]);
      
      if (emailExists.length > 0) {
        return res.status(409).json({ error: 'Email already exists for another user' });
      }
    }

    // Check if username is being updated and already exists for another user
    if (updateData.username) {
      const usernameQuery = 'SELECT id FROM users WHERE username = ? AND id != ?';
      const usernameExists = await db.executeQuery(usernameQuery, [updateData.username, id]);
      
      if (usernameExists.length > 0) {
        return res.status(409).json({ error: 'Username already exists for another user' });
      }
    }

    // Build update query dynamically (exclude password and sensitive fields)
    const updateFields = [];
    const updateValues = [];
    
    const allowedFields = ['username', 'email', 'firstName', 'lastName'];
    const fieldMapping = {
      firstName: 'first_name',
      lastName: 'last_name'
    };

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        const dbField = fieldMapping[key] || key;
        updateFields.push(`${dbField} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at timestamp
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.executeQuery(updateQuery, updateValues);

    // Get updated user (without password)
    const updatedUserQuery = 'SELECT id, username, email, first_name, last_name, active, created_at FROM users WHERE id = ?';
    const [updatedUser] = await db.executeQuery(updatedUserQuery, [id]);

    res.json({
      user: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const requestingUserId = req.user.id;

    // Prevent users from deleting themselves
    if (parseInt(id) === requestingUserId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Check if user exists
    const existingQuery = 'SELECT id FROM users WHERE id = ?';
    const existing = await db.executeQuery(existingQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete by setting active to false instead of actually deleting
    const updateQuery = 'UPDATE users SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await db.executeQuery(updateQuery, [id]);

    res.json({ message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id/activate - Reactivate user (admin only)
router.put('/:id/activate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingQuery = 'SELECT id FROM users WHERE id = ?';
    const existing = await db.executeQuery(existingQuery, [id]);

    if (existing.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Reactivate user
    const updateQuery = 'UPDATE users SET active = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await db.executeQuery(updateQuery, [id]);

    res.json({ message: 'User activated successfully' });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
