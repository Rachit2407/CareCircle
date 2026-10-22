import { Notification, INotification, NotificationChannel, NotificationEventType } from '../modules/notifications/notification.model.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Types } from 'mongoose';

export interface DispatchNotificationInput {
  patientId: Types.ObjectId | string;
  recipientId: Types.ObjectId | string;
  channel: NotificationChannel;
  eventType: NotificationEventType;
  payload: Record<string, any>;
  maxAttempts?: number;
}

export class NotificationService {
  /**
   * Enqueue a notification for delivery
   */
  public static async enqueue(input: DispatchNotificationInput): Promise<INotification> {
    const notification = await Notification.create({
      patientId: new Types.ObjectId(input.patientId.toString()),
      recipientId: new Types.ObjectId(input.recipientId.toString()),
      channel: input.channel,
      eventType: input.eventType,
      payload: input.payload,
      status: 'queued',
      attempts: 0,
      maxAttempts: input.maxAttempts || env.REMINDER_MAX_ATTEMPTS,
      nextAttemptAt: new Date(),
    });

    logger.info(`Enqueued notification ${notification._id} for channel ${input.channel}`);
    return notification;
  }

  /**
   * Dispatches a specific notification via provider (Sarvam Voice, Push, SMS, Email)
   */
  public static async dispatch(notification: INotification): Promise<boolean> {
    try {
      notification.attempts += 1;

      // Simulated integration with Sarvam Voice API or external notification gateway
      let providerReference = `prov_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      if (notification.channel === 'voice_sarvam') {
        // Sarvam Voice synthesis/call mock
        providerReference = `sarvam_call_${Date.now()}`;
        logger.info(`[Sarvam Voice] Dispatched voice reminder for recipient ${notification.recipientId}`);
      }

      notification.status = 'sent';
      notification.sentAt = new Date();
      notification.providerReference = providerReference;
      notification.errorMessage = undefined;
      await notification.save();

      return true;
    } catch (error: any) {
      logger.error(`Failed to dispatch notification ${notification._id}`, error);

      if (notification.attempts >= notification.maxAttempts) {
        notification.status = 'failed';
        notification.errorMessage = error.message || 'Exceeded maximum attempts';
      } else {
        notification.status = 'retried';
        // Exponential backoff: 2^attempt * 30 seconds
        const backoffMinutes = Math.pow(2, notification.attempts) * 0.5;
        notification.nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
        notification.errorMessage = error.message;
      }

      await notification.save();
      return false;
    }
  }
}
