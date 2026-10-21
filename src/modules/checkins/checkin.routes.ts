import { Router } from 'express';
import { CheckInController } from './checkin.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizePatientAccess } from '../../middleware/authorizePatient.js';
import { validate } from '../../middleware/validate.js';
import { idempotency } from '../../middleware/idempotency.js';
import { createCheckInSchema, listCheckInsQuerySchema } from './checkin.schemas.js';

const router = Router();

router.use(authenticate);

// Create check-in
router.post(
  '/',
  idempotency(),
  validate({ body: createCheckInSchema }),
  authorizePatientAccess('manage_health_readings'),
  CheckInController.create
);

// List check-ins
router.get(
  '/',
  validate({ query: listCheckInsQuerySchema }),
  authorizePatientAccess('manage_health_readings'),
  CheckInController.list
);

export default router;
