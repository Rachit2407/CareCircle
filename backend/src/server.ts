import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { ReminderWorker } from './jobs/reminderWorker.js';
import { logger } from './utils/logger.js';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Initialize Express application
    const app = createApp();

    // 3. Start Background Reminder Worker
    ReminderWorker.start();

    // 4. Start HTTP Server
    const server = app.listen(env.PORT, () => {
      logger.info(`CareCircle AI Backend running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`API Base Path: http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`Health check: http://localhost:${env.PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      ReminderWorker.stop();

      server.close(async () => {
        logger.info('HTTP server closed');
        await disconnectDatabase();
        logger.info('Database disconnected');
        process.exit(0);
      });

      // Force close if graceful shutdown takes longer than 10 seconds
      setTimeout(() => {
        logger.error('Graceful shutdown timed out. Forcing process termination.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
