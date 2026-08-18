const prisma = require('../config/prisma');

async function testPrisma() {
  console.log('Testing Prisma Client configuration...');
  try {
    console.log('Prisma Client successfully initialized!');
  } catch (err) {
    console.error('Prisma test error:', err.message);
  }
}

testPrisma();
