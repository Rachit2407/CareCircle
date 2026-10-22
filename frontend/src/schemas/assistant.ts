import { z } from 'zod';

export const toolActionExecutionSchema = z.object({
  tool: z.string(),
  status: z.string(),
  arguments: z.record(z.unknown()).optional(),
  resultId: z.string().optional(),
  error: z.string().optional(),
});

export type ToolActionExecution = z.infer<typeof toolActionExecutionSchema>;

export const pendingActionSchema = z.object({
  actionId: z.string(),
  tool: z.string(),
  description: z.string(),
  arguments: z.record(z.unknown()),
  expiresAt: z.string().optional(),
});

export type PendingAction = z.infer<typeof pendingActionSchema>;

export const assistantMessageResponseSchema = z.object({
  reply: z.string(),
  actions: z.array(toolActionExecutionSchema).default([]),
  needsConfirmation: z.boolean().default(false),
  pendingAction: pendingActionSchema.nullable().optional(),
  conversationId: z.string().default(''),
  requestId: z.string().default(''),
});

export type AssistantMessageResponse = z.infer<typeof assistantMessageResponseSchema>;

export const assistantMessageInputSchema = z.object({
  message: z.string().min(1, 'Please enter a message'),
  conversationId: z.string().optional(),
  patientId: z.string().optional(),
  caregiverId: z.string().optional(),
});

export type AssistantMessageInput = z.infer<typeof assistantMessageInputSchema>;

export const actionConfirmationInputSchema = z.object({
  actionId: z.string().min(1),
  confirmed: z.boolean(),
  conversationId: z.string().min(1),
});

export type ActionConfirmationInput = z.infer<typeof actionConfirmationInputSchema>;
