import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.schemas.js';
import { authenticate } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';

const router = Router();

// Optional authentication helper for logout
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  authenticate(req, res, () => next()).catch(() => next());
};

router.post('/register', authRateLimiter, validate({ body: registerSchema }), AuthController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), AuthController.login);
router.post('/refresh', validate({ body: refreshSchema.partial() }), AuthController.refresh);
router.get('/session', authenticate, AuthController.session);
router.post('/logout', optionalAuth, AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
