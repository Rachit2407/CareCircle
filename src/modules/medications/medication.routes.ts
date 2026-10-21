import { Router } from 'express';
import { MedicationController } from './medication.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizePatientAccess } from '../../middleware/authorizePatient.js';
import { validate } from '../../middleware/validate.js';
import { idempotency } from '../../middleware/idempotency.js';
import {
  createMedicationScheduleSchema,
  updateMedicationScheduleSchema,
  confirmDoseSchema,
  listSchedulesQuerySchema,
} from './medication.schemas.js';

const router = Router();

router.use(authenticate);

// List medication schedules
router.get(
  '/schedule',
  validate({ query: listSchedulesQuerySchema }),
  authorizePatientAccess('manage_medications'),
  MedicationController.list
);

// Create medication schedule
router.post(
  '/schedule',
  idempotency(),
  validate({ body: createMedicationScheduleSchema }),
  authorizePatientAccess('manage_medications'),
  MedicationController.create
);

// Update/pause medication schedule
router.patch(
  '/schedule/:id',
  idempotency(),
  validate({ body: updateMedicationScheduleSchema }),
  authorizePatientAccess('manage_medications'),
  MedicationController.update
);

// Confirm dose taken/skipped (separate from reminder delivery)
router.post(
  '/doses/confirm',
  idempotency(),
  validate({ body: confirmDoseSchema }),
  authorizePatientAccess('manage_medications'),
  MedicationController.confirmDose
);

export default router;
