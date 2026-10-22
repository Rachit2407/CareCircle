import { Request, Response, NextFunction } from 'express';
import { TaskService, TaskActorContext } from './task.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class TaskController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor: TaskActorContext = {
        id: req.user!.id,
        role: req.user!.role,
        requestId: req.requestId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const task = await TaskService.createTask(req.body, actor, req.authorizedPatientIds);
      sendSuccess(res, { task }, 201);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor: TaskActorContext = {
        id: req.user!.id,
        role: req.user!.role,
        requestId: req.requestId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const result = await TaskService.listTasks(req.query as any, actor, req.authorizedPatientIds);
      sendSuccess(res, result.tasks, 200, {
        total: result.total,
        page: result.page,
        limit: result.limit,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor: TaskActorContext = {
        id: req.user!.id,
        role: req.user!.role,
        requestId: req.requestId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      };

      const taskId = String(req.params.id);
      const task = await TaskService.updateTask(taskId, req.body, actor, req.authorizedPatientIds);
      sendSuccess(res, { task }, 200);
    } catch (error) {
      next(error);
    }
  }
}
