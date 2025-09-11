const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');
const bcrypt = require('bcrypt');

// GET /api/users - Get all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { search, active, role, page = 1, limit = 20 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (active !== undefined) {
      where.active = active === 'true';
    }
    
    if (role) {
      where.role = role;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:username - Get user by username
router.get('/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const requestingUsername = req.user.username;

    // Users can only view their own profile, unless they're admin
    // For now, allow viewing any user (you can add role checks later)
    
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users - Create new user (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role = 'student', active = true } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existing) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
        active
      },
      select: {
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true
      }
    });

    res.status(201).json({
      user: newUser,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:username - Update user
router.put('/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const updateData = req.body;
    const requestingUsername = req.user.username;

    // Users can only update their own profile (unless admin)
    if (username !== requestingUsername && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { username }
    });

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email is being updated and already exists for another user
    if (updateData.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: updateData.email,
          username: { not: username }
        }
      });
      
      if (emailExists) {
        return res.status(409).json({ error: 'Email already exists for another user' });
      }
    }

    // Prepare update data (exclude password and sensitive fields)
    const allowedFields = ['email', 'firstName', 'lastName'];
    const dataToUpdate = {};
    
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        dataToUpdate[field] = updateData[field];
      }
    });

    // Only admin can update role and active status
    if (req.user.role === 'admin') {
      if (updateData.role !== undefined) dataToUpdate.role = updateData.role;
      if (updateData.active !== undefined) dataToUpdate.active = updateData.active;
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { username },
      data: dataToUpdate,
      select: {
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      user: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:username - Delete user (admin only)
router.delete('/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const requestingUsername = req.user.username;

    // Only admin can delete users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Prevent users from deleting themselves
    if (username === requestingUsername) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { username }
    });

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete by setting active to false instead of actually deleting
    await prisma.user.update({
      where: { username },
      data: { active: false }
    });

    res.json({ message: 'User deactivated successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:username/activate - Reactivate user (admin only)
router.put('/:username/activate', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;

    // Only admin can activate users
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { username }
    });

    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Reactivate user
    await prisma.user.update({
      where: { username },
      data: { active: true }
    });

    res.json({ message: 'User activated successfully' });

  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
