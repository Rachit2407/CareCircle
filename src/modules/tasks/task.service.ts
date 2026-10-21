import { CareTask, ICareTask } from './task.model.js';
import { User } from '../users/user.model.js';
import { CreateTaskInput, UpdateTaskInput, ListTasksQuery } from './task.schemas.js';
import { NotFoundError, ForbiddenScopeError, ValidationError } from '../../utils/errors.js';
import { AuditService } from '../../services/audit.service.js';
import mongoose from 'mongoose';

export interface TaskActorContext {
  id: string;
  role: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class TaskService {
  public static async createTask(
    data: CreateTaskInput,
    actor: TaskActorContext,
    authorizedPatientIds?: string[]
  ): Promise<ICareTask> {
    const patientId = data.patientId;

    // Verify actor is permitted to create tasks for this patient
    if (authorizedPatientIds && !authorizedPatientIds.includes(patientId)) {
      await AuditService.log({
        actorId: actor.id,
        actorRole: actor.role,
        patientId,
        action: 'CREATE_TASK_DENIED',
        targetType: 'careTask',
        result: 'DENIED',
        requestId: actor.requestId,
        metadata: { reason: 'Unauthorized patient scope' },
      });
      throw new ForbiddenScopeError('Not permitted to create tasks for this patient');
    }

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient) {
      throw new NotFoundError('Target patient not found');
    }

    // Verify assignee exists if specified
    let assigneeObjectId: mongoose.Types.ObjectId | undefined;
    if (data.assigneeId) {
      if (!mongoose.Types.ObjectId.isValid(data.assigneeId)) {
        throw new ValidationError('Invalid assigneeId format');
      }
      const assignee = await User.findById(data.assigneeId);
      if (!assignee) {
        throw new NotFoundError('Designated task assignee user not found');
      }
      assigneeObjectId = new mongoose.Types.ObjectId(data.assigneeId);
    }

    const task = await CareTask.create({
      patientId: new mongoose.Types.ObjectId(patientId),
      title: data.title,
      description: data.description,
      assigneeId: assigneeObjectId,
      dueAt: new Date(data.dueAt),
      recurrence: data.recurrence || 'none',
      priority: data.priority || 'medium',
      status: 'pending',
      createdBy: mongoose.Types.ObjectId.isValid(actor.id)
        ? new mongoose.Types.ObjectId(actor.id)
        : (mongoose.Types.ObjectId.isValid(patientId)
            ? new mongoose.Types.ObjectId(patientId)
            : new mongoose.Types.ObjectId('000000000000000000000001')),
    });

    await AuditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      patientId,
      action: 'CREATE_TASK',
      targetType: 'careTask',
      targetId: task._id.toString(),
      result: 'SUCCESS',
      requestId: actor.requestId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      metadata: { title: task.title, priority: task.priority, dueAt: task.dueAt },
    });

    return task;
  }

  public static async listTasks(
    query: ListTasksQuery,
    actor: TaskActorContext,
    authorizedPatientIds?: string[]
  ): Promise<{ tasks: ICareTask[]; total: number; page: number; limit: number }> {
    const filter: any = {};

    // Scope to permitted patients
    if (query.patientId) {
      if (authorizedPatientIds && !authorizedPatientIds.includes(query.patientId)) {
        throw new ForbiddenScopeError('Not permitted to access tasks for this patient');
      }
      filter.patientId = new mongoose.Types.ObjectId(query.patientId);
    } else if (authorizedPatientIds) {
      filter.patientId = { $in: authorizedPatientIds.map((id) => new mongoose.Types.ObjectId(id)) };
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    if (query.dueBefore || query.dueAfter) {
      filter.dueAt = {};
      if (query.dueBefore) filter.dueAt.$lte = new Date(query.dueBefore);
      if (query.dueAfter) filter.dueAt.$gte = new Date(query.dueAfter);
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      CareTask.find(filter)
        .populate('patientId', 'displayName email timezone')
        .populate('assigneeId', 'displayName email role')
        .populate('createdBy', 'displayName role')
        .populate('completedBy', 'displayName role')
        .sort({ dueAt: 1 })
        .skip(skip)
        .limit(limit),
      CareTask.countDocuments(filter),
    ]);

    return { tasks, total, page, limit };
  }

  public static async updateTask(
    taskId: string,
    data: UpdateTaskInput,
    actor: TaskActorContext,
    authorizedPatientIds?: string[]
  ): Promise<ICareTask> {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new ValidationError('Invalid taskId format');
    }

    const task = await CareTask.findById(taskId);
    if (!task) {
      throw new NotFoundError('Care task not found');
    }

    // Verify task belongs to permitted patient
    const taskPatientId = task.patientId.toString();
    if (authorizedPatientIds && !authorizedPatientIds.includes(taskPatientId)) {
      await AuditService.log({
        actorId: actor.id,
        actorRole: actor.role,
        patientId: taskPatientId,
        action: 'UPDATE_TASK_DENIED',
        targetType: 'careTask',
        targetId: taskId,
        result: 'DENIED',
        requestId: actor.requestId,
        metadata: { reason: 'Unauthorized patient scope' },
      });
      throw new ForbiddenScopeError('Not authorized to access or modify this care task');
    }

    if (data.assigneeId) {
      if (!mongoose.Types.ObjectId.isValid(data.assigneeId)) {
        throw new ValidationError('Invalid assigneeId format');
      }
      const assignee = await User.findById(data.assigneeId);
      if (!assignee) {
        throw new NotFoundError('Designated task assignee user not found');
      }
      task.assigneeId = new mongoose.Types.ObjectId(data.assigneeId);
    }

    if (data.title) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.dueAt) task.dueAt = new Date(data.dueAt);
    if (data.recurrence) task.recurrence = data.recurrence;
    if (data.priority) task.priority = data.priority;

    if (data.status) {
      const prevStatus = task.status;
      task.status = data.status;

      if (data.status === 'completed' && prevStatus !== 'completed') {
        task.completedAt = new Date();
        task.completedBy = new mongoose.Types.ObjectId(actor.id);
      } else if (data.status !== 'completed' && prevStatus === 'completed') {
        task.completedAt = undefined;
        task.completedBy = undefined;
      }
    }

    await task.save();

    await AuditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      patientId: taskPatientId,
      action: 'UPDATE_TASK',
      targetType: 'careTask',
      targetId: task._id.toString(),
      result: 'SUCCESS',
      requestId: actor.requestId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      metadata: { updatedFields: Object.keys(data), newStatus: task.status },
    });

    return task;
  }
}
