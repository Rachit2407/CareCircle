import { Router } from 'express';
import { RelationshipController } from './relationship.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createRelationshipSchema, updateRelationshipSchema } from './relationship.schemas.js';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createRelationshipSchema }), RelationshipController.create);
router.get('/', RelationshipController.list);
router.patch('/:id', validate({ body: updateRelationshipSchema }), RelationshipController.update);

export default router;
