const { PrismaClient } = require('@prisma/client');

// Create Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['info', 'warn', 'error'] : ['warn', 'error'],
});

// Test connection function
const testConnection = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
};

// Get connection (returns prisma instance)
const getConnection = () => {
  return prisma;
};

// Graceful shutdown
const closeConnection = async () => {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error.message);
  }
};

// Handle shutdown events
process.on('beforeExit', async () => {
  await closeConnection();
});

process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  prisma,
  testConnection,
  getConnection,
  closeConnection
};
