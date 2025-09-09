const { body, validationResult } = require('express-validator');

// Validation middleware to check for errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// User validation rules
const userValidationRules = () => {
  return [
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    
    body('firstName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('First name must be less than 50 characters'),
    
    body('lastName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Last name must be less than 50 characters')
  ];
};

// Student validation rules (for creating new students - no ID required)
const studentValidationRules = () => {
  return [
    body('name')
      .notEmpty()
      .withMessage('Student name is required')
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('username')
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    
    body('firstName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('First name must be less than 50 characters'),
    
    body('lastName')
      .optional()
      .isLength({ max: 50 })
      .withMessage('Last name must be less than 50 characters'),
    
    body('phone')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
    
    body('address')
      .optional()
      .isLength({ max: 255 })
      .withMessage('Address must be less than 255 characters'),
    
    body('dateOfBirth')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date of birth'),
    
    body('fatherName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Father name must be less than 100 characters'),
    
    body('fatherOccupation')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Father occupation must be less than 100 characters'),
    
    body('motherName')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Mother name must be less than 100 characters'),
    
    body('motherOccupation')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Mother occupation must be less than 100 characters'),
    
    body('parentContact')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid parent contact number'),
    
    body('classId')
      .optional()
      .isNumeric()
      .withMessage('Class ID must be a number')
  ];
};

// Login validation rules
const loginValidationRules = () => {
  return [
    body('username')
      .notEmpty()
      .withMessage('Username is required'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ];
};

// Update student validation rules (all fields optional)
const updateStudentValidationRules = () => {
  return [
    body('name')
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
      .optional()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('course')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Course name must be less than 100 characters'),
    
    body('age')
      .optional()
      .isInt({ min: 16, max: 100 })
      .withMessage('Age must be between 16 and 100'),
    
    body('phoneNumber')
      .optional()
      .matches(/^[\+]?[1-9][\d]{0,15}$/)
      .withMessage('Please provide a valid phone number'),
    
    body('enrolled')
      .optional()
      .isBoolean()
      .withMessage('Enrolled status must be boolean')
  ];
};

module.exports = {
  handleValidationErrors,
  userValidationRules,
  studentValidationRules,
  loginValidationRules,
  updateStudentValidationRules
};
