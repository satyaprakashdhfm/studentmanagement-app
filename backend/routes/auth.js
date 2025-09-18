const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken, authenticateToken } = require('../utils/jwt');
const { 
  loginValidationRules, 
  userValidationRules, 
  handleValidationErrors 
} = require('../utils/validation');

// Helper function to convert BigInt to Number recursively
function convertBigIntToNumber(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToNumber(value);
    }
    return converted;
  }
  return obj;
}

// POST /api/auth/login
router.post('/login', loginValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username with related data
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        teachers: true,
        students: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    // Check if user is active
    if (!user.active) {
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid username or password' 
      });
    }

    // Update last login
    await prisma.user.update({
      where: { username: user.username },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token
    const token = generateToken({ 
      username: user.username, 
      role: user.role 
    });

    // Prepare user response
    const userResponse = {
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      active: user.active,
      lastLogin: user.lastLogin
    };

    // Add role-specific data
    if (user.role === 'teacher' && user.teachers) {
      userResponse.teacher = convertBigIntToNumber(user.teachers);
    } else if (user.role === 'student' && user.students) {
      userResponse.student = convertBigIntToNumber(user.students);
    }

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// POST /api/auth/register
router.post('/register', userValidationRules(), handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role = 'student' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username },
          { email: email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
        active: true
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

    // Generate JWT token
    const token = generateToken({
      username: newUser.username,
      role: newUser.role
    });

    res.status(201).json({
      token,
      user: newUser,
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/profile (protected route)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;

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

    res.json({ user });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  // In a stateless JWT setup, logout is handled client-side by removing the token
  // For server-side logout, you would typically use a token blacklist
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/change-password (protected route)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const username = req.user.username;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { username },
      select: { password: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { username },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
