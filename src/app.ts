import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { standardRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { sendSuccess } from './utils/apiResponse.js';
import { NotFoundError } from './utils/errors.js';
import { aiGuard } from './middleware/aiGuard.js';

// Route imports
import authRoutes from './modules/auth/auth.routes.js';
import relationshipRoutes from './modules/relationships/relationship.routes.js';
import taskRoutes from './modules/tasks/task.routes.js';
import medicationRoutes from './modules/medications/medication.routes.js';
import appointmentRoutes from './modules/appointments/appointment.routes.js';
import checkinRoutes from './modules/checkins/checkin.routes.js';
import healthReadingRoutes from './modules/health-readings/reading.routes.js';
import recordRoutes from './modules/records/record.routes.js';
import alertRoutes from './modules/alerts/alert.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import mcpRoutes from './modules/mcp/mcp.routes.js';
import assistantRoutes from './modules/assistant/assistant.routes.js';

export const createApp = (): Express => {
  const app = express();

  // Security headers & CORS
  app.use(helmet());

  const allowedOrigins =
    env.NODE_ENV === 'production'
      ? env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
      : true;

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Request-ID',
        'Idempotency-Key',
        'Cookie',
        'X-Client-Type',
      ],
      exposedHeaders: ['X-Request-ID', 'X-Idempotent-Replay', 'Set-Cookie'],
    })
  );

  // Request size limits
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Request ID / Correlation middleware
  app.use(requestIdMiddleware);

  // Global rate limiter (bypassed in test environment)
  if (env.NODE_ENV !== 'test') {
    app.use(standardRateLimiter);
  }

  // Health check endpoint (Milestone 1 requirement)
  const healthHandler = (req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'healthy',
      service: 'CareCircle AI Backend',
      version: '1.0.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  };

  app.get('/health', healthHandler);
  app.get(`${env.API_PREFIX}/health`, healthHandler);

  // Dual-mount MCP endpoints for AI Engine MCPClientService (guarded by aiGuard)
  app.use('/mcp', aiGuard, mcpRoutes);
  app.use(`${env.API_PREFIX}/mcp`, aiGuard, mcpRoutes);

  // Dual-mount Auth endpoints for frontend flexibility
  app.use('/auth', authRoutes);
  app.use(`${env.API_PREFIX}/auth`, authRoutes);

  // Mount API modules
  const prefix = env.API_PREFIX;
  app.use(`${prefix}/relationships`, relationshipRoutes);
  app.use(`${prefix}/tasks`, taskRoutes);
  app.use(`${prefix}/medications`, medicationRoutes);
  app.use(`${prefix}/appointments`, appointmentRoutes);
  app.use(`${prefix}/check-ins`, checkinRoutes);
  app.use(`${prefix}/health-readings`, healthReadingRoutes);
  app.use(`${prefix}/records`, recordRoutes);
  app.use(`${prefix}/alerts`, alertRoutes);
  app.use(`${prefix}/audit`, auditRoutes);
  app.use(`${prefix}/assistant`, aiGuard, assistantRoutes);

  // 404 handler
  app.use((_req, _res, next) => {
    next(new NotFoundError('API endpoint not found'));
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
};
