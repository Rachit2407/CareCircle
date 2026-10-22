import { Router } from 'express';
import { AlertController } from './alert.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizePatientAccess } from '../../middleware/authorizePatient.js';
import { validate } from '../../middleware/validate.js';
import { alertRateLimiter } from '../../middleware/rateLimiter.js';
import { idempotency } from '../../middleware/idempotency.js';
import { createAlertSchema } from './alert.schemas.js';

const router = Router();

router.use(authenticate);

// POST /api/v1/alerts: Rate limited, audited, verifies patient relationship
router.post(
  '/',
  alertRateLimiter,
  idempotency(),
  validate({ body: createAlertSchema }),
  authorizePatientAccess('receive_alerts'),
  AlertController.create
);

export default router;
