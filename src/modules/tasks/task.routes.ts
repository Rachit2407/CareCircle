import { Router } from 'express';
import { TaskController } from './task.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizePatientAccess } from '../../middleware/authorizePatient.js';
import { validate } from '../../middleware/validate.js';
import { idempotency } from '../../middleware/idempotency.js';
import { createTaskSchema, updateTaskSchema, listTasksQuerySchema } from './task.schemas.js';

const router = Router();

router.use(authenticate);

// Create task: requires manage_tasks permission if caregiver, supports idempotency key
router.post(
  '/',
  idempotency(),
  validate({ body: createTaskSchema }),
  authorizePatientAccess('manage_tasks'),
  TaskController.create
);

// List tasks: filtered within permitted patient scope
router.get(
  '/',
  validate({ query: listTasksQuerySchema }),
  authorizePatientAccess('manage_tasks'),
  TaskController.list
);

// Update task: verify task belongs to permitted patient
router.patch(
  '/:id',
  idempotency(),
  validate({ body: updateTaskSchema }),
  authorizePatientAccess('manage_tasks'),
  TaskController.update
);

export default router;
