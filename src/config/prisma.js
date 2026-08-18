const { PrismaClient } = require('@prisma/client');

/**
 * Singleton Prisma Client Instance for Production-Grade Database Access
 */
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: ['error', 'warn']
  });
} else {
  if (!global.__prisma_client__) {
    global.__prisma_client__ = new PrismaClient({
      log: ['query', 'error', 'warn']
    });
  }
  prisma = global.__prisma_client__;
}

module.exports = prisma;
