import { api } from './api-client';
import {
  assistantMessageResponseSchema,
  type ActionConfirmationInput,
  type AssistantMessageInput,
  type AssistantMessageResponse,
} from '@/schemas/assistant';

export const assistantService = {
  sendMessage(input: AssistantMessageInput): Promise<AssistantMessageResponse> {
    return api.post('/assistant/message', input, assistantMessageResponseSchema);
  },

  confirmAction(input: ActionConfirmationInput): Promise<AssistantMessageResponse> {
    return api.post('/assistant/actions/confirm', input, assistantMessageResponseSchema);
  },
};
