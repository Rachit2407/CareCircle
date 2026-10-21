import { Router, Request, Response, NextFunction } from 'express';
import { McpController } from './mcp.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Middleware to support both token-authenticated callers and AI Engine service calls
const mcpAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers.authorization || req.headers.cookie || req.headers['x-internal-service-token']) {
    return authenticate(req, res, next);
  }

  // Fallback internal caller identity for AI Engine direct MCP connection
  req.user = {
    id: (req.headers['x-actor-id'] as string) || 'system_ai_engine',
    email: 'ai-engine@carecircle.internal',
    displayName: 'CareCircle AI Engine',
    role: 'admin',
    timezone: 'UTC',
  };
  next();
};

// Discovery endpoint
router.get('/tools', McpController.listTools);

// Execution endpoint
router.post('/call', mcpAuth, McpController.callTool);

export default router;
