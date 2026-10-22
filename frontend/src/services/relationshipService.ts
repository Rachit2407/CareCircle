import { z } from 'zod';
import { api } from './api-client';
import {
  careRelationshipListResponseSchema,
  type CareRelationship,
  type CreateRelationshipInput,
  type UpdateRelationshipInput,
} from '@/schemas/relationships';

export const relationshipService = {
  list(): Promise<CareRelationship[]> {
    return api.get('/relationships', careRelationshipListResponseSchema);
  },

  create(input: CreateRelationshipInput): Promise<unknown> {
    return api.post('/relationships', input, z.unknown());
  },

  update(id: string, input: UpdateRelationshipInput): Promise<unknown> {
    return api.patch(`/relationships/${id}`, input, z.unknown());
  },
};
