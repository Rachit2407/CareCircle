import { Router } from 'express';
import { RecordController } from './record.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { authorizePatientAccess } from '../../middleware/authorizePatient.js';
import { validate } from '../../middleware/validate.js';
import { idempotency } from '../../middleware/idempotency.js';
import {
  requestUploadUrlSchema,
  confirmRecordSchema,
  listRecordsQuerySchema,
} from './record.schemas.js';

const router = Router();

router.use(authenticate);

// List record metadata (storage keys not exposed)
router.get(
  '/',
  validate({ query: listRecordsQuerySchema }),
  authorizePatientAccess('view_records'),
  RecordController.list
);

// Request signed upload URL
router.post(
  '/upload-url',
  idempotency(),
  validate({ body: requestUploadUrlSchema }),
  authorizePatientAccess('upload_records'),
  RecordController.requestUploadUrl
);

// Confirm uploaded record metadata
router.post(
  '/confirm',
  idempotency(),
  validate({ body: confirmRecordSchema }),
  authorizePatientAccess('upload_records'),
  RecordController.confirmRecord
);

// Request short-lived signed download URL
router.get(
  '/:id/download-url',
  authorizePatientAccess('view_records'),
  RecordController.getDownloadUrl
);

export default router;
