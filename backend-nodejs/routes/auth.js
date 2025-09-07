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
    const user = await prisma.user.findFirst({
      where: {
        username: username,
        active: true
      },
      include: {
        student: true,
        teacher: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: Number(user.id), // Convert BigInt to Number for JWT
      username: user.username,
      email: user.email,
      role: user.role
    });

    // Return token and user info (without password)
    const { password: _, ...userWithoutPassword } = user;
    
    // Convert all BigInt values to Numbers for JSON serialization
    const safeUser = convertBigIntToNumber(userWithoutPassword);
    
    res.json({
      success: true,
      token,
      user: safeUser,
      message: 'Login successful'
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
    const { username, email, password, firstName, lastName } = req.body;

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
        active: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = generateToken({
      id: Number(newUser.id), // Convert BigInt to Number
      username: newUser.username,
      email: newUser.email
    });

    res.status(201).json({
      token,
      user: {
        ...newUser,
        id: Number(newUser.id) // Convert BigInt to Number
      },
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
    const userId = BigInt(req.user.id); // Convert to BigInt for Prisma

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      user: {
        ...user,
        id: Number(user.id) // Convert BigInt to Number for JSON
      }
    });

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
    const userId = BigInt(req.user.id); // Convert to BigInt

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
