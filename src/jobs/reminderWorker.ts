import { Notification } from '../modules/notifications/notification.model.js';
import { NotificationService } from '../services/notification.service.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export class ReminderWorker {
  private static timer: NodeJS.Timeout | null = null;
  private static isProcessing = false;

  public static start(intervalMs = env.REMINDER_WORKER_INTERVAL_MS): void {
    if (this.timer) {
      return;
    }

    logger.info(`[ReminderWorker] Starting worker loop with interval ${intervalMs}ms`);
    this.timer = setInterval(() => {
      this.processDueReminders().catch((err) => {
        logger.error('[ReminderWorker] Unexpected error in processing loop', err);
      });
    }, intervalMs);

    // Initial immediate tick
    this.processDueReminders().catch((err) => {
      logger.error('[ReminderWorker] Unexpected error in initial tick', err);
    });
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      logger.info('[ReminderWorker] Stopped worker loop');
    }
  }

  public static async processDueReminders(): Promise<number> {
    if (this.isProcessing) {
      return 0;
    }

    this.isProcessing = true;
    let processedCount = 0;

    try {
      const now = new Date();
      // Find due notifications that are queued or pending retry
      const pendingNotifications = await Notification.find({
        status: { $in: ['queued', 'retried'] },
        $or: [
          { nextAttemptAt: { $exists: false } },
          { nextAttemptAt: { $lte: now } },
        ],
      })
        .limit(25)
        .sort({ createdAt: 1 });

      for (const notification of pendingNotifications) {
        await NotificationService.dispatch(notification);
        processedCount += 1;
      }

      if (processedCount > 0) {
        logger.info(`[ReminderWorker] Processed ${processedCount} due notifications`);
      }
    } catch (error) {
      logger.error('[ReminderWorker] Error executing reminder cycle', error);
    } finally {
      this.isProcessing = false;
    }

    return processedCount;
  }
}
