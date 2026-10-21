import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { registerSchema, loginSchema, refreshSchema } from './auth.schemas.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.post('/register', validate({ body: registerSchema }), AuthController.register);
router.post('/login', validate({ body: loginSchema }), AuthController.login);
router.post('/refresh', validate({ body: refreshSchema }), AuthController.refresh);
router.get('/session', authenticate, AuthController.session);
router.post('/logout', AuthController.logout);
router.get('/me', authenticate, AuthController.me);

export default router;
