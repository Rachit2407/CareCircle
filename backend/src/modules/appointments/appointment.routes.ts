import { Router } from 'express';
import { AppointmentController } from './appointment.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizePatientAccess } from '../../middleware/authorizePatient.js';
import { validate } from '../../middleware/validate.js';
import { idempotency } from '../../middleware/idempotency.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsQuerySchema,
} from './appointment.schemas.js';

const router = Router();

router.use(authenticate);

// Create appointment
router.post(
  '/',
  idempotency(),
  validate({ body: createAppointmentSchema }),
  authorizePatientAccess('manage_appointments'),
  AppointmentController.create
);

// List appointments
router.get(
  '/',
  validate({ query: listAppointmentsQuerySchema }),
  authorizePatientAccess('manage_appointments'),
  AppointmentController.list
);

// Update/reschedule/cancel appointment
router.patch(
  '/:id',
  idempotency(),
  validate({ body: updateAppointmentSchema }),
  authorizePatientAccess('manage_appointments'),
  AppointmentController.update
);

export default router;
