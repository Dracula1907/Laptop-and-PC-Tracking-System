import app from './app';
import prisma from './config/prisma';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify DB connectivity
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database successfully via Prisma ORM.');

    const server = app.listen(PORT, () => {
      logger.info(`🚀 ITAM Backend Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('PostgreSQL connection closed. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
