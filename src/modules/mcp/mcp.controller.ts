import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { McpServerAdapter } from '../../mcp/mcpAdapter.js';
import { Appointment } from '../appointments/appointment.model.js';
import { CareRelationship } from '../relationships/careRelationship.model.js';
import { NotificationService } from '../../services/notification.service.js';
import { AuditService } from '../../services/audit.service.js';
import { logger } from '../../utils/logger.js';

export const MCP_TOOLS_CATALOG = [
  {
    name: 'create_care_task',
    description: 'Create a care task or reminder for a patient (e.g. medicine, meal, checkup)',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short description of the task' },
        dueAt: { type: 'string', description: 'ISO-8601 datetime or time description' },
        timezone: { type: 'string', description: 'IANA timezone, e.g. Asia/Kolkata' },
        priority: { type: 'string', enum: ['low', 'normal', 'high'], default: 'normal' },
        assigneeId: { type: 'string', description: 'User ID of caregiver assigned' },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_care_tasks',
    description: 'List care tasks for the patient with optional status filters',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'overdue'] },
        limit: { type: 'integer', default: 10 },
      },
    },
  },
  {
    name: 'add_health_reading',
    description: 'Record a vital measurement (blood pressure, blood glucose, heart rate, weight)',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['blood_pressure', 'glucose', 'heart_rate', 'weight', 'temperature'],
        },
        value: { type: 'string', description: "Measurement value (e.g. '120/80', '110')" },
        unit: { type: 'string', description: 'mmHg, mg/dL, bpm, kg, etc.' },
        notes: { type: 'string', description: 'Qualitative context or symptoms' },
      },
      required: ['type', 'value'],
    },
  },
  {
    name: 'get_next_appointment',
    description: "Fetch details of the patient's next scheduled doctor or clinic visit",
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'send_caregiver_alert',
    description: 'Send a high-priority alert notification to designated family caregivers',
    inputSchema: {
      type: 'object',
      properties: {
        eventType: {
          type: 'string',
          description: 'missed_medication, vital_abnormality, assistance_needed',
        },
        message: { type: 'string', description: 'Concise alert details' },
        severity: { type: 'string', enum: ['low', 'medium', 'critical'] },
      },
      required: ['eventType', 'message', 'severity'],
    },
  },
];

export class McpController {
  /**
   * GET /api/v1/mcp/tools or /mcp/tools
   * Returns list of tools exposed to AI Engine
   */
  public static async listTools(_req: Request, res: Response): Promise<void> {
    res.status(200).json({
      tools: MCP_TOOLS_CATALOG,
    });
  }

  /**
   * POST /api/v1/mcp/call or /mcp/call
   * Executes MCP tools invoked by AI Engine / MCP Client
   */
  public static async callTool(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const requestId = req.requestId || (req.headers['x-request-id'] as string) || crypto.randomUUID();
    const { tool, arguments: args = {}, context = {} } = req.body;

    const SYSTEM_ACTOR_HEX = '000000000000000000000001';
    const callerUser = req.user || {
      id: SYSTEM_ACTOR_HEX,
      email: 'ai-engine@carecircle.internal',
      displayName: 'CareCircle AI Engine',
      role: 'admin' as const,
      timezone: 'UTC',
    };

    const validActorId = mongoose.Types.ObjectId.isValid(callerUser.id)
      ? callerUser.id
      : SYSTEM_ACTOR_HEX;

    const targetPatientId =
      context.patientId ||
      args.patientId ||
      (callerUser.role === 'patient' ? callerUser.id : undefined);

    const mcpContext = {
      authenticatedUserId: validActorId,
      authenticatedUserRole: callerUser.role,
      requestId,
      ipAddress: req.ip,
    };

    try {
      switch (tool) {
        case 'create_care_task':
        case 'carecircle_create_care_task': {
          let dueAt = args.dueAt;
          if (!dueAt || isNaN(Date.parse(dueAt))) {
            dueAt = new Date(Date.now() + 3600000).toISOString();
          }

          const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
            low: 'low',
            normal: 'medium',
            medium: 'medium',
            high: 'high',
            urgent: 'urgent',
          };

          const taskResult = await McpServerAdapter.createCareTask(
            {
              patientId: targetPatientId || callerUser.id,
              title: args.title || 'Care Reminder',
              description: args.description,
              dueAt,
              priority: priorityMap[args.priority] || 'medium',
              assigneeId: args.assigneeId,
            },
            mcpContext
          );

          res.status(200).json({
            ok: true,
            status: 'created',
            data: {
              id: taskResult.taskId,
              title: taskResult.title,
              dueAt: taskResult.dueAt,
              status: taskResult.status,
              patientId: taskResult.patientId,
            },
            requestId,
          });
          return;
        }

        case 'get_care_tasks':
        case 'carecircle_list_tasks': {
          const result = await McpServerAdapter.listTasks(
            {
              patientId: targetPatientId,
              status: args.status,
            },
            mcpContext
          );

          res.status(200).json({
            ok: true,
            status: 'success',
            data: {
              tasks: result.tasks,
              total: result.total,
            },
            requestId,
          });
          return;
        }

        case 'add_health_reading':
        case 'carecircle_log_health_reading': {
          let readingType = args.type;
          const valStr = String(args.value || '0');

          if (readingType === 'glucose') {
            readingType = 'blood_glucose';
          }

          if (readingType === 'blood_pressure') {
            const parts = valStr.split('/').map((s: string) => parseFloat(s.trim()));
            const systolic = parts[0] || 120;
            const diastolic = parts[1] || 80;

            const readingResult = await McpServerAdapter.logHealthReading(
              {
                patientId: targetPatientId || callerUser.id,
                type: 'blood_pressure_systolic',
                value: systolic,
                unit: args.unit || 'mmHg',
                notes: args.notes || (valStr.includes('/') ? `Blood Pressure: ${valStr}` : undefined),
              },
              mcpContext
            );

            if (parts.length > 1 && !isNaN(diastolic)) {
              await McpServerAdapter.logHealthReading(
                {
                  patientId: targetPatientId || callerUser.id,
                  type: 'blood_pressure_diastolic',
                  value: diastolic,
                  unit: args.unit || 'mmHg',
                  notes: `Diastolic component of ${valStr}`,
                },
                mcpContext
              );
            }

            res.status(200).json({
              ok: true,
              status: 'created',
              data: {
                id: readingResult.readingId,
                type: 'blood_pressure',
                value: args.value,
                unit: args.unit || 'mmHg',
              },
              requestId,
            });
            return;
          }

          const numVal = parseFloat(valStr) || 0;
          const readingResult = await McpServerAdapter.logHealthReading(
            {
              patientId: targetPatientId || callerUser.id,
              type: readingType,
              value: numVal,
              unit: args.unit || '',
              notes: args.notes,
            },
            mcpContext
          );

          res.status(200).json({
            ok: true,
            status: 'created',
            data: {
              id: readingResult.readingId,
              type: args.type,
              value: readingResult.value,
              unit: readingResult.unit,
            },
            requestId,
          });
          return;
        }

        case 'get_next_appointment': {
          const filter: any = {
            status: { $in: ['scheduled', 'rescheduled'] },
            startsAt: { $gte: new Date() },
          };
          if (targetPatientId) {
            filter.patientId = new mongoose.Types.ObjectId(targetPatientId);
          }

          const appointment = await Appointment.findOne(filter).sort({ startsAt: 1 });

          if (appointment) {
            res.status(200).json({
              ok: true,
              status: 'success',
              data: {
                appointment: {
                  id: appointment._id.toString(),
                  provider: appointment.provider,
                  specialty: appointment.specialty,
                  startsAt: appointment.startsAt.toISOString(),
                  location: appointment.location,
                },
              },
              requestId,
            });
          } else {
            res.status(200).json({
              ok: true,
              status: 'success',
              data: {
                appointment: null,
                message: 'No upcoming appointments found',
              },
              requestId,
            });
          }
          return;
        }

        case 'send_caregiver_alert': {
          const alertId = `alt_${crypto.randomUUID().substring(0, 8)}`;
          let recipientCount = 0;

          if (targetPatientId) {
            const relationships = await CareRelationship.find({
              patientId: new mongoose.Types.ObjectId(targetPatientId),
              consentStatus: 'active',
              $or: [{ permissions: 'receive_alerts' }, { permissions: 'all' }],
            });

            recipientCount = relationships.length;
            for (const rel of relationships) {
              await NotificationService.enqueue({
                patientId: targetPatientId,
                recipientId: rel.caregiverId.toString(),
                channel: 'push',
                eventType: 'caregiver_alert',
                payload: {
                  eventType: args.eventType,
                  message: args.message,
                  severity: args.severity || 'high',
                },
              });
            }

            await AuditService.log({
              actorId: validActorId,
              actorRole: callerUser.role,
              patientId: targetPatientId,
              action: 'MCP_SEND_CAREGIVER_ALERT',
              targetType: 'caregiver_alert',
              result: 'SUCCESS',
              requestId,
              metadata: { eventType: args.eventType, severity: args.severity, recipientCount },
            });
          }

          res.status(200).json({
            ok: true,
            status: 'dispatched',
            data: {
              alertId,
              recipientCount,
            },
            requestId,
          });
          return;
        }

        default:
          res.status(200).json({
            ok: false,
            error: {
              code: 'NOT_FOUND',
              message: `Tool ${tool} not found`,
            },
            requestId,
          });
          return;
      }
    } catch (error: any) {
      logger.error(`MCP Tool execution failed for ${tool}`, { error: error.message, stack: error.stack });
      res.status(200).json({
        ok: false,
        error: {
          code: error.code || 'MCP_EXECUTION_ERROR',
          message: error.message || 'Tool execution encountered an error',
        },
        requestId,
      });
    }
  }
}
