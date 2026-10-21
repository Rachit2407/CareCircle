import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizePatientAccess } from '../../middleware/authorizePatient.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/audit: restricted to permitted patient scope
router.get('/', authorizePatientAccess(), AuditController.list);

export default router;
