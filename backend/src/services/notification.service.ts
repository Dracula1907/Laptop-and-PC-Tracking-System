import prisma from '../config/prisma';
import { logger } from '../utils/logger';
import { NotificationCategory, NotificationPriority } from '@prisma/client';

export interface CreateNotificationParams {
  userId: string;
  category: NotificationCategory;
  type: string;
  priority?: NotificationPriority;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  assetId?: string;
  actionRoute?: string;
  expiresAt?: Date;
  fingerprint?: string;
  metadata?: any;
}

export class NotificationService {
  /**
   * Create an in-app notification safely with duplicate protection and preference filtering.
   * Isolated: Never throws an exception to caller.
   */
  static async createNotification(params: CreateNotificationParams): Promise<any> {
    try {
      const priority = params.priority || NotificationPriority.NORMAL;
      const fingerprint =
        params.fingerprint ||
        `${params.category}_${params.type}_${params.entityId || ''}_${params.userId}_${new Date().toISOString().slice(0, 10)}`;

      // 1. Deduplication check
      const existing = await prisma.notification.findFirst({
        where: { fingerprint },
        select: { id: true },
      });
      if (existing) {
        return null;
      }

      // 2. User preference check (CRITICAL is always mandatory)
      if (priority !== NotificationPriority.CRITICAL) {
        const pref = await prisma.notificationPreference.findUnique({
          where: {
            userId_category: {
              userId: params.userId,
              category: params.category,
            },
          },
        });

        if (pref && !pref.inAppEnabled) {
          return null; // User disabled notifications for this category
        }
      }

      // 3. Persist notification
      return await prisma.notification.create({
        data: {
          userId: params.userId,
          category: params.category,
          type: params.type,
          priority,
          title: params.title,
          message: params.message,
          entityType: params.entityType,
          entityId: params.entityId,
          assetId: params.assetId,
          actionRoute: params.actionRoute,
          expiresAt: params.expiresAt,
          fingerprint,
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        },
      });
    } catch (error: any) {
      logger.error('Failed to create notification safely (isolated):', error);
      return null;
    }
  }

  /**
   * Create notifications for all active users of a particular role
   */
  static async notifyRole(
    roleCode: string,
    params: Omit<CreateNotificationParams, 'userId'>
  ): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { code: roleCode },
        },
        select: { id: true },
      });

      for (const u of users) {
        await this.createNotification({ ...params, userId: u.id });
      }
    } catch (err) {
      logger.error(`Failed to notify role ${roleCode}:`, err);
    }
  }

  /**
   * Create notifications for a specific list of user IDs
   */
  static async notifyUsers(
    userIds: string[],
    params: Omit<CreateNotificationParams, 'userId'>
  ): Promise<void> {
    for (const uId of userIds) {
      await this.createNotification({ ...params, userId: uId });
    }
  }

  /**
   * Query user notifications with rich filtering and pagination
   */
  static async getUserNotifications(userId: string, query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (query.category) {
      where.category = query.category as NotificationCategory;
    }

    if (query.priority) {
      where.priority = query.priority as NotificationPriority;
    }

    if (query.isRead !== undefined && query.isRead !== 'all') {
      where.isRead = query.isRead === 'true' || query.isRead === true;
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { message: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { unreadCount: count };
  }

  static async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  static async markAsUnread(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: false, readAt: null },
    });
  }

  static async markAllAsRead(userId: string, category?: NotificationCategory) {
    const where: any = { userId, isRead: false };
    if (category) where.category = category;

    return prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }

  static async getUserPreferences(userId: string) {
    const categories = Object.values(NotificationCategory);
    const existing = await prisma.notificationPreference.findMany({
      where: { userId },
    });

    const map = new Map(existing.map((p) => [p.category, p]));

    return categories.map((cat) => ({
      category: cat,
      inAppEnabled: map.has(cat) ? map.get(cat)!.inAppEnabled : true,
      emailEnabled: map.has(cat) ? map.get(cat)!.emailEnabled : false,
    }));
  }

  static async updatePreference(
    userId: string,
    category: NotificationCategory,
    inAppEnabled: boolean,
    emailEnabled: boolean = false
  ) {
    return prisma.notificationPreference.upsert({
      where: {
        userId_category: { userId, category },
      },
      update: { inAppEnabled, emailEnabled },
      create: { userId, category, inAppEnabled, emailEnabled },
    });
  }
}
