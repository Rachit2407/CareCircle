import { Router } from 'express';
import { McpController } from './mcp.controller.js';
import { authenticate } from '../../middleware/auth.js';

// TODO(mcp): replaced by real MCP server
const router = Router();

// Discovery endpoint - requires authentication (JWT/cookie or internal service token)
router.get('/tools', authenticate, McpController.listTools);

// Execution endpoint - requires authentication (JWT/cookie or internal service token)
router.post('/call', authenticate, McpController.callTool);

export default router;
