// TODO(mcp): replaced by real MCP server
import { Router, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Requires authentication (JWT/cookie or valid service token)
router.all('*', authenticate, async (req: Request, res: Response) => {
  try {
    const targetUrl = `${env.AI_ENGINE_URL}${req.originalUrl}`;
    const headers: Record<string, string> = {
      'content-type': req.headers['content-type'] || 'application/json',
      accept: req.headers['accept'] || 'application/json',
    };

    if (env.INTERNAL_SERVICE_TOKEN) {
      headers['x-internal-service-token'] = env.INTERNAL_SERVICE_TOKEN;
    }

    if (req.user?.id) {
      headers['x-actor-id'] = req.user.id;
    }

    const isWrite = ['POST', 'PUT', 'PATCH'].includes(req.method);
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: isWrite && req.body ? JSON.stringify(req.body) : undefined,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    } else {
      const buffer = await response.arrayBuffer();
      res.setHeader('content-type', contentType);
      return res.status(response.status).send(Buffer.from(buffer));
    }
  } catch (error: any) {
    logger.warn('AI Engine connection attempt failed', { error: error.message, path: req.originalUrl });
    return res.status(503).json({
      error: {
        code: 'AI_ENGINE_UNAVAILABLE',
        message: 'CareCircle AI Engine service is currently offline or unreachable on ' + env.AI_ENGINE_URL,
      },
    });
  }
});

export default router;
