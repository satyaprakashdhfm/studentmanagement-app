const express = require('express');
const router = express.Router();
const { prisma } = require('../config/database');
const { authenticateToken } = require('../utils/jwt');

// GET /api/fees - Get fee records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      studentId, 
      classId, 
      feeType,
      academicYear,
      paymentStatus,
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build where clause
    const where = {};
    
    // Add filters
    if (studentId) {
      where.studentId = studentId;
    }
    
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (feeType) {
      where.feeType = feeType;
    }
    
    if (academicYear) {
      where.academicYear = academicYear;
    }

    // Add payment status filter
    if (paymentStatus) {
      if (paymentStatus === 'paid') {
        where.balance = 0;
      } else if (paymentStatus === 'partial') {
        where.AND = [
          { amountPaid: { gt: 0 } },
          { balance: { gt: 0 } }
        ];
      } else if (paymentStatus === 'unpaid') {
        where.amountPaid = 0;
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get fee records with pagination and relations
    const fees = await prisma.fee.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            email: true,
            phone: true,
            fatherName: true,
            fatherOccupation: true,
            motherName: true,
            motherOccupation: true,
            parentContact: true
          }
        },
        class: {
          select: {
            className: true,
            section: true,
            academicYear: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.fee.count({ where });

    // Convert BigInt IDs and Decimals to Numbers for JSON serialization
    const feesWithNumericIds = fees.map(record => {
      return JSON.parse(JSON.stringify(record, (key, value) => {
        if (typeof value === 'bigint') return Number(value);
        if (value && value.constructor && value.constructor.name === 'Decimal') return Number(value.toString());
        return value;
      }));
    });

    res.json({
      fees: feesWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        pages: Math.ceil(Number(total) / limitNum)
      }
    });

  } catch (error) {
    console.error('Get fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fees/student/:studentId - Get fees for a specific student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { 
      academicYear, 
      feeType,
      status,
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build where clause
    const where = {
      studentId: studentId
    };
    
    // Add filters
    if (academicYear) {
      where.academicYear = academicYear;
    }
    
    if (feeType) {
      where.feeType = feeType;
    }
    
    if (status) {
      if (status === 'paid') {
        where.balance = 0;
      } else if (status === 'pending') {
        where.balance = { gt: 0 };
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get fees with pagination and relations
    const fees = await prisma.fee.findMany({
      where,
      include: {
        class: {
          select: {
            className: true,
            section: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ],
      skip,
      take: limitNum
    });

    // Get total count
    const total = await prisma.fee.count({ where });

    // Convert BigInt IDs and Decimals to Numbers for JSON serialization
    const feesWithNumericIds = fees.map(record => {
      return JSON.parse(JSON.stringify(record, (key, value) => {
        if (typeof value === 'bigint') return Number(value);
        if (value && value.constructor && value.constructor.name === 'Decimal') return Number(value.toString());
        return value;
      }));
    });

    res.json({
      fees: feesWithNumericIds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: Number(total),
        pages: Math.ceil(Number(total) / limitNum)
      }
    });

  } catch (error) {
    console.error('Get student fees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fees/:id - Get fee by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const feeId = req.params.id;

    const fee = await prisma.fee.findUnique({
      where: { feeId },
      include: {
        student: {
          select: {
            name: true,
            email: true,
            phone: true,
            fatherName: true,
            fatherOccupation: true,
            motherName: true,
            motherOccupation: true,
            parentContact: true,
            address: true
          }
        },
        class: {
          select: {
            className: true,
            section: true,
            academicYear: true
          }
        }
      }
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    // Convert Decimals to Numbers for JSON serialization
    const feeWithNumericIds = JSON.parse(JSON.stringify(fee, (key, value) => {
      if (value && value.constructor && value.constructor.name === 'Decimal') return Number(value.toString());
      return value;
    }));

    res.json(feeWithNumericIds);

  } catch (error) {
    console.error('Get fee record error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/fees - Create new fee record
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { 
      studentId, 
      classId, 
      feeType, 
      amountDue, 
      academicYear 
    } = req.body;

    // Validate required fields
    if (!studentId || !classId || !feeType || amountDue === undefined || !academicYear) {
      return res.status(400).json({ 
        error: 'Missing required fields: studentId, classId, feeType, amountDue, academicYear' 
      });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { studentId }
    });
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if class exists
    const classExists = await prisma.class.findUnique({
      where: { classId: parseInt(classId) }
    });
    if (!classExists) {
      return res.status(404).json({ error: 'Class not found' });
    }

    // Check for duplicate fee record
    const existingFee = await prisma.fee.findFirst({
      where: {
        studentId,
        classId: parseInt(classId),
        feeType,
        academicYear
      }
    });

    if (existingFee) {
      return res.status(409).json({ 
        error: 'Fee record already exists for this student, class, fee type, and academic year' 
      });
    }

    // Generate fee ID
    const feeId = `FEE${Date.now()}`;

    // Create fee record
    const newFee = await prisma.fee.create({
      data: {
        feeId,
        studentId,
        classId: parseInt(classId),
        feeType,
        amountDue: parseFloat(amountDue),
        amountPaid: 0,
        balance: parseFloat(amountDue),
        academicYear
      },
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        },
        class: {
          select: {
            className: true,
            section: true
          }
        }
      }
    });

    // Convert Decimals to Numbers for JSON serialization
    const feeResponse = JSON.parse(JSON.stringify(newFee, (key, value) => {
      if (value && value.constructor && value.constructor.name === 'Decimal') return Number(value.toString());
      return value;
    }));

    res.status(201).json({
      fee: feeResponse,
      message: 'Fee record created successfully'
    });

  } catch (error) {
    console.error('Create fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/fees/:id/payment - Record fee payment
router.post('/:id/payment', authenticateToken, async (req, res) => {
  try {
    const feeId = req.params.id;
    const { amountPaid, paymentMethod = 'cash' } = req.body;

    if (!amountPaid || amountPaid <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required' });
    }

    // Get current fee record
    const fee = await prisma.fee.findUnique({
      where: { feeId },
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!fee) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    const newAmountPaid = parseFloat(fee.amountPaid) + parseFloat(amountPaid);
    const newBalance = parseFloat(fee.amountDue) - newAmountPaid;

    // Validate payment doesn't exceed due amount
    if (newAmountPaid > parseFloat(fee.amountDue)) {
      return res.status(400).json({ 
        error: 'Payment amount exceeds the due amount',
        currentDue: Number(fee.amountDue),
        currentPaid: Number(fee.amountPaid),
        remainingBalance: Number(fee.balance)
      });
    }

    // Update fee record
    const updatedFee = await prisma.fee.update({
      where: { feeId },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        paymentDate: new Date(),
        paymentMethod
      },
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    // Convert Decimals to Numbers for JSON serialization
    const feeResponse = JSON.parse(JSON.stringify(updatedFee, (key, value) => {
      if (value && value.constructor && value.constructor.name === 'Decimal') return Number(value.toString());
      return value;
    }));

    res.json({
      fee: feeResponse,
      payment: {
        amount: parseFloat(amountPaid),
        method: paymentMethod,
        date: new Date().toISOString()
      },
      message: 'Payment recorded successfully'
    });

  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/fees/:id - Update fee record
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const feeId = req.params.id;
    const updateData = req.body;

    // Check if fee exists
    const existingFee = await prisma.fee.findUnique({
      where: { feeId }
    });

    if (!existingFee) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    // Prepare update data
    const data = {};
    
    if (updateData.feeType) data.feeType = updateData.feeType;
    if (updateData.academicYear) data.academicYear = updateData.academicYear;
    
    // Handle amount due update
    if (updateData.amountDue !== undefined) {
      const newAmountDue = parseFloat(updateData.amountDue);
      if (newAmountDue < 0) {
        return res.status(400).json({ error: 'Amount due cannot be negative' });
      }
      
      const currentAmountPaid = Number(existingFee.amountPaid);
      data.amountDue = newAmountDue;
      data.balance = newAmountDue - currentAmountPaid;
    }

    // Update fee record
    const updatedFee = await prisma.fee.update({
      where: { feeId },
      data,
      include: {
        student: {
          select: {
            name: true,
            email: true
          }
        },
        class: {
          select: {
            className: true,
            section: true
          }
        }
      }
    });

    // Convert Decimals to Numbers for JSON serialization
    const feeResponse = JSON.parse(JSON.stringify(updatedFee, (key, value) => {
      if (value && value.constructor && value.constructor.name === 'Decimal') return Number(value.toString());
      return value;
    }));

    res.json({
      fee: feeResponse,
      message: 'Fee record updated successfully'
    });

  } catch (error) {
    console.error('Update fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/fees/:id - Delete fee record
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const feeId = req.params.id;

    // Check if fee exists
    const existingFee = await prisma.fee.findUnique({
      where: { feeId }
    });

    if (!existingFee) {
      return res.status(404).json({ error: 'Fee record not found' });
    }

    // Check if any payments have been made
    if (parseFloat(existingFee.amountPaid) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete fee record with payments. Amount paid: ' + Number(existingFee.amountPaid)
      });
    }

    // Delete fee record
    await prisma.fee.delete({
      where: { feeId }
    });

    res.json({ message: 'Fee record deleted successfully' });

  } catch (error) {
    console.error('Delete fee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/fees/stats/overview - Get fee statistics
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const { academicYear, classId, feeType } = req.query;

    // Build where clause
    const where = {};
    
    if (academicYear) {
      where.academicYear = academicYear;
    }
    
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (feeType) {
      where.feeType = feeType;
    }

    // Get overall fee statistics
    const overallStats = await prisma.fee.aggregate({
      where,
      _sum: {
        amountDue: true,
        amountPaid: true,
        balance: true
      },
      _count: {
        feeId: true
      }
    });

    // Get fee collection by fee type
    const feeTypeStats = await prisma.fee.groupBy({
      by: ['feeType'],
      where,
      _sum: {
        amountDue: true,
        amountPaid: true,
        balance: true
      },
      _count: {
        feeType: true
      }
    });

    // Get payment status distribution
    const paidFeesCount = await prisma.fee.count({
      where: {
        ...where,
        balance: 0
      }
    });

    const partialFeesCount = await prisma.fee.count({
      where: {
        ...where,
        AND: [
          { amountPaid: { gt: 0 } },
          { balance: { gt: 0 } }
        ]
      }
    });

    const unpaidFeesCount = await prisma.fee.count({
      where: {
        ...where,
        amountPaid: 0
      }
    });

    // Get class-wise fee collection
    const classStats = await prisma.fee.groupBy({
      by: ['classId'],
      where,
      _sum: {
        amountDue: true,
        amountPaid: true,
        balance: true
      },
      _count: {
        classId: true
      }
    });

    // Get class details for stats
    const classIds = classStats.map(stat => stat.classId);
    const classDetails = await prisma.class.findMany({
      where: {
        classId: {
          in: classIds
        }
      },
      select: {
        classId: true,
        className: true,
        section: true
      }
    });

    // Get recent payments (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentPayments = await prisma.fee.aggregate({
      where: {
        ...where,
        paymentDate: {
          gte: thirtyDaysAgo
        }
      },
      _sum: {
        amountPaid: true
      },
      _count: {
        feeId: true
      }
    });

    const classWiseStats = classStats.map(stat => {
      const classDetail = classDetails.find(c => c.classId === stat.classId);
      const collectionPercentage = stat._sum.amountDue > 0 
        ? Math.round((Number(stat._sum.amountPaid) / Number(stat._sum.amountDue)) * 100)
        : 0;
      
      return {
        classId: stat.classId,
        className: classDetail ? `${classDetail.className} - ${classDetail.section}` : 'Unknown',
        totalDue: Number(stat._sum.amountDue || 0),
        totalPaid: Number(stat._sum.amountPaid || 0),
        totalBalance: Number(stat._sum.balance || 0),
        collectionPercentage,
        studentCount: stat._count.classId
      };
    });

    const feeTypeCollection = feeTypeStats.map(stat => {
      const collectionPercentage = stat._sum.amountDue > 0 
        ? Math.round((Number(stat._sum.amountPaid) / Number(stat._sum.amountDue)) * 100)
        : 0;
      
      return {
        feeType: stat.feeType,
        totalDue: Number(stat._sum.amountDue || 0),
        totalPaid: Number(stat._sum.amountPaid || 0),
        totalBalance: Number(stat._sum.balance || 0),
        collectionPercentage,
        recordCount: stat._count.feeType
      };
    });

    const overallCollectionPercentage = overallStats._sum.amountDue > 0 
      ? Math.round((Number(overallStats._sum.amountPaid) / Number(overallStats._sum.amountDue)) * 100)
      : 0;

    res.json({
      overall: {
        totalRecords: overallStats._count.feeId,
        totalDue: Number(overallStats._sum.amountDue || 0),
        totalPaid: Number(overallStats._sum.amountPaid || 0),
        totalBalance: Number(overallStats._sum.balance || 0),
        collectionPercentage: overallCollectionPercentage
      },
      paymentStatus: {
        paid: paidFeesCount,
        partial: partialFeesCount,
        unpaid: unpaidFeesCount
      },
      feeTypeCollection,
      classWiseStats,
      recentPayments: {
        amount: Number(recentPayments._sum.amountPaid || 0),
        count: recentPayments._count.feeId
      }
    });

  } catch (error) {
    console.error('Get fee stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
