import { TaskService } from '../modules/tasks/task.service.js';
import { MedicationSchedule, DoseLog } from '../modules/medications/medication.model.js';
import { HealthReading } from '../modules/health-readings/reading.model.js';
import { CheckIn } from '../modules/checkins/checkin.model.js';
import { CareRelationship } from '../modules/relationships/careRelationship.model.js';
import { NotificationService } from '../services/notification.service.js';
import { AuditService } from '../services/audit.service.js';
import { ForbiddenScopeError, NotFoundError, BusinessRuleError } from '../utils/errors.js';
import mongoose from 'mongoose';

export interface McpCallContext {
  authenticatedUserId: string;
  authenticatedUserRole: 'patient' | 'caregiver' | 'admin';
  requestId?: string;
  ipAddress?: string;
}

export class McpServerAdapter {
  /**
   * Helper to derive permitted patient IDs for the authenticated caller
   * Crucial rule: Never assume a model-supplied patientId is trustworthy!
   */
  private static async getPermittedPatientIds(
    context: McpCallContext,
    targetPatientId?: string
  ): Promise<string[]> {
    if (context.authenticatedUserRole === 'admin') {
      return targetPatientId ? [targetPatientId] : [];
    }

    if (context.authenticatedUserRole === 'patient') {
      if (targetPatientId && targetPatientId !== context.authenticatedUserId) {
        throw new ForbiddenScopeError('Patient caller cannot access records of another patient');
      }
      return [context.authenticatedUserId];
    }

    if (context.authenticatedUserRole === 'caregiver') {
      if (targetPatientId) {
        const rel = await CareRelationship.findOne({
          patientId: new mongoose.Types.ObjectId(targetPatientId),
          caregiverId: new mongoose.Types.ObjectId(context.authenticatedUserId),
          consentStatus: 'active',
        });
        if (!rel) {
          throw new ForbiddenScopeError('No active care relationship with target patient');
        }
        return [targetPatientId];
      } else {
        const rels = await CareRelationship.find({
          caregiverId: new mongoose.Types.ObjectId(context.authenticatedUserId),
          consentStatus: 'active',
        }).select('patientId');
        return rels.map((r) => r.patientId.toString());
      }
    }

    throw new ForbiddenScopeError('Unauthorized caller role');
  }

  /**
   * MCP Tool: carecircle_create_care_task
   */
  public static async createCareTask(
    args: {
      patientId: string;
      title: string;
      description?: string;
      dueAt: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assigneeId?: string;
    },
    context: McpCallContext
  ) {
    const permittedPatientIds = await this.getPermittedPatientIds(context, args.patientId);

    const task = await TaskService.createTask(
      {
        patientId: args.patientId,
        title: args.title,
        description: args.description,
        dueAt: args.dueAt,
        priority: args.priority || 'medium',
        assigneeId: args.assigneeId,
        recurrence: 'none',
      },
      {
        id: context.authenticatedUserId,
        role: context.authenticatedUserRole,
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        userAgent: 'CareCircle-MCP-Adapter/1.0',
      },
      permittedPatientIds
    );

    return {
      success: true,
      taskId: task._id.toString(),
      patientId: task.patientId.toString(),
      title: task.title,
      status: task.status,
      dueAt: task.dueAt.toISOString(),
    };
  }

  /**
   * MCP Tool: carecircle_list_tasks
   */
  public static async listTasks(
    args: { patientId?: string; status?: 'pending' | 'in_progress' | 'completed' | 'cancelled' },
    context: McpCallContext
  ) {
    const permittedPatientIds = await this.getPermittedPatientIds(context, args.patientId);

    const result = await TaskService.listTasks(
      {
        patientId: args.patientId,
        status: args.status,
        limit: 20,
        page: 1,
      },
      {
        id: context.authenticatedUserId,
        role: context.authenticatedUserRole,
        requestId: context.requestId,
      },
      permittedPatientIds
    );

    return {
      tasks: result.tasks.map((t) => ({
        id: t._id.toString(),
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueAt: t.dueAt.toISOString(),
      })),
      total: result.total,
    };
  }

  /**
   * MCP Tool: carecircle_log_health_reading
   */
  public static async logHealthReading(
    args: {
      patientId: string;
      type: any;
      value: number;
      unit: string;
      notes?: string;
      measuredAt?: string;
    },
    context: McpCallContext
  ) {
    const permittedPatientIds = await this.getPermittedPatientIds(context, args.patientId);
    if (!permittedPatientIds.includes(args.patientId)) {
      throw new ForbiddenScopeError('Caller lacks access to log readings for this patient');
    }

    const reading = await HealthReading.create({
      patientId: new mongoose.Types.ObjectId(args.patientId),
      type: args.type,
      value: args.value,
      unit: args.unit,
      measuredAt: args.measuredAt ? new Date(args.measuredAt) : new Date(),
      source: 'voice_sarvam',
      notes: args.notes,
      recordedBy: mongoose.Types.ObjectId.isValid(context.authenticatedUserId)
        ? new mongoose.Types.ObjectId(context.authenticatedUserId)
        : (mongoose.Types.ObjectId.isValid(args.patientId)
            ? new mongoose.Types.ObjectId(args.patientId)
            : new mongoose.Types.ObjectId('000000000000000000000001')),
    });

    await AuditService.log({
      actorId: context.authenticatedUserId,
      actorRole: context.authenticatedUserRole,
      patientId: args.patientId,
      action: 'MCP_LOG_HEALTH_READING',
      targetType: 'healthReading',
      targetId: reading._id.toString(),
      result: 'SUCCESS',
      requestId: context.requestId,
      metadata: { type: args.type, value: args.value, unit: args.unit },
    });

    return {
      success: true,
      readingId: reading._id.toString(),
      type: reading.type,
      value: reading.value,
      unit: reading.unit,
    };
  }

  /**
   * MCP Tool: carecircle_log_check_in
   */
  public static async logCheckIn(
    args: {
      patientId: string;
      feeling: 'great' | 'good' | 'fair' | 'poor' | 'terrible';
      painScore: number;
      symptoms?: string[];
      rawPatientUtterance: string;
      aiSummary?: string;
    },
    context: McpCallContext
  ) {
    const permittedPatientIds = await this.getPermittedPatientIds(context, args.patientId);
    if (!permittedPatientIds.includes(args.patientId)) {
      throw new ForbiddenScopeError('Caller lacks access to log check-in for this patient');
    }

    const checkIn = await CheckIn.create({
      patientId: new mongoose.Types.ObjectId(args.patientId),
      feeling: args.feeling,
      painScore: args.painScore,
      symptoms: args.symptoms || [],
      notes: args.rawPatientUtterance,
      aiSummary: args.aiSummary ? `[AI NON-CLINICAL SUMMARY]: ${args.aiSummary}` : undefined,
      respondentType: context.authenticatedUserRole === 'patient' ? 'patient' : 'caregiver',
      recordedBy: mongoose.Types.ObjectId.isValid(context.authenticatedUserId)
        ? new mongoose.Types.ObjectId(context.authenticatedUserId)
        : (mongoose.Types.ObjectId.isValid(args.patientId)
            ? new mongoose.Types.ObjectId(args.patientId)
            : new mongoose.Types.ObjectId('000000000000000000000001')),
    });

    await AuditService.log({
      actorId: context.authenticatedUserId,
      actorRole: context.authenticatedUserRole,
      patientId: args.patientId,
      action: 'MCP_LOG_CHECK_IN',
      targetType: 'checkIn',
      targetId: checkIn._id.toString(),
      result: 'SUCCESS',
      requestId: context.requestId,
      metadata: { feeling: args.feeling, painScore: args.painScore },
    });

    return {
      success: true,
      checkInId: checkIn._id.toString(),
      feeling: checkIn.feeling,
      painScore: checkIn.painScore,
    };
  }
}
