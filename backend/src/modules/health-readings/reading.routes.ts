import { Router } from 'express';
import { HealthReadingController } from './reading.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizePatientAccess } from '../../middleware/authorizePatient.js';
import { validate } from '../../middleware/validate.js';
import { idempotency } from '../../middleware/idempotency.js';
import { createHealthReadingSchema, listHealthReadingsQuerySchema } from './reading.schemas.js';

const router = Router();

router.use(authenticate);

// Add health reading
router.post(
  '/',
  idempotency(),
  validate({ body: createHealthReadingSchema }),
  authorizePatientAccess('manage_health_readings'),
  HealthReadingController.create
);

// List health readings
router.get(
  '/',
  validate({ query: listHealthReadingsQuerySchema }),
  authorizePatientAccess('manage_health_readings'),
  HealthReadingController.list
);

export default router;
