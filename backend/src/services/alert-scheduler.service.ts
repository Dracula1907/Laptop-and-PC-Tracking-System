import prisma from '../config/prisma';
import { logger } from '../utils/logger';
import { NotificationService } from './notification.service';
import { NotificationCategory, NotificationPriority, WorkflowStatus, MaintenanceStatus, ApprovalStatus } from '@prisma/client';

export class AlertSchedulerService {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Start scheduled background alert runner (runs every 10 minutes)
   */
  static init(intervalMs: number = 10 * 60 * 1000) {
    if (this.timer) return;

    logger.info('Initializing AlertSchedulerService for background operational telemetry...');
    // Run initial scan safely
    this.runChecks().catch((err) => logger.error('Initial alert scan error:', err));

    this.timer = setInterval(() => {
      this.runChecks().catch((err) => logger.error('Scheduled alert check error:', err));
    }, intervalMs);
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Run all operational telemetry alert scans
   */
  static async runChecks(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await Promise.allSettled([
        this.checkOverdueAssignments(),
        this.checkOverdueMaintenance(),
        this.checkWarrantyExpirations(),
        this.checkPendingApprovals(),
      ]);
    } catch (error) {
      logger.error('Error during scheduled alert checks:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 1. Check assignments due soon or overdue
   */
  private static async checkOverdueAssignments(): Promise<void> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const activeAssignments = await prisma.assetAssignment.findMany({
      where: {
        status: WorkflowStatus.ACTIVE,
        expectedReturnDate: { not: null, lte: threeDaysFromNow },
      },
      include: {
        asset: true,
        employee: { include: { user: true } },
      },
      take: 100,
    });

    for (const asn of activeAssignments) {
      if (!asn.expectedReturnDate) continue;
      const isOverdue = asn.expectedReturnDate < now;
      const assetCode = asn.asset.assetCode || 'Asset';

      // Notify the assigned employee user if linked
      if (asn.employee.user?.id) {
        await NotificationService.createNotification({
          userId: asn.employee.user.id,
          category: NotificationCategory.ASSIGNMENT,
          type: isOverdue ? 'ASSIGNMENT_OVERDUE' : 'ASSIGNMENT_DUE_SOON',
          priority: isOverdue ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
          title: isOverdue ? `Asset Return Overdue: ${assetCode}` : `Asset Return Due Soon: ${assetCode}`,
          message: isOverdue
            ? `Your assigned asset ${assetCode} was due on ${asn.expectedReturnDate.toLocaleDateString()}. Please initiate a return.`
            : `Your assigned asset ${assetCode} is due for return on ${asn.expectedReturnDate.toLocaleDateString()}.`,
          entityType: 'AssetAssignment',
          entityId: asn.id,
          assetId: asn.assetId,
          actionRoute: `/assignments`,
          fingerprint: `ASSIGNMENT_${isOverdue ? 'OVERDUE' : 'DUE'}_${asn.id}_${asn.employee.user.id}_${now.toISOString().slice(0, 10)}`,
        });
      }

      // If overdue, also notify IT/Admin
      if (isOverdue) {
        await NotificationService.notifyRole('ADMIN', {
          category: NotificationCategory.ASSIGNMENT,
          type: 'ASSIGNMENT_OVERDUE',
          priority: NotificationPriority.HIGH,
          title: `Overdue Return: ${assetCode} (${asn.employee.fullName})`,
          message: `Asset ${assetCode} assigned to ${asn.employee.fullName} is overdue since ${asn.expectedReturnDate.toLocaleDateString()}.`,
          entityType: 'AssetAssignment',
          entityId: asn.id,
          assetId: asn.assetId,
          actionRoute: `/assignments`,
          fingerprint: `ADMIN_ASSIGNMENT_OVERDUE_${asn.id}_${now.toISOString().slice(0, 10)}`,
        });
      }
    }
  }

  /**
   * 2. Check overdue or open critical maintenance records
   */
  private static async checkOverdueMaintenance(): Promise<void> {
    const now = new Date();

    const overdueMaintenance = await prisma.maintenanceRecord.findMany({
      where: {
        repairStatus: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.WAITING_PARTS] },
        expectedCompletionDate: { not: null, lt: now },
      },
      include: { asset: true },
      take: 100,
    });

    for (const mnt of overdueMaintenance) {
      const code = mnt.maintenanceCode || mnt.id;
      const assetCode = mnt.asset.assetCode || 'Asset';

      await NotificationService.notifyRole('IT', {
        category: NotificationCategory.MAINTENANCE,
        type: 'MAINTENANCE_OVERDUE',
        priority: NotificationPriority.HIGH,
        title: `Maintenance Overdue: ${code}`,
        message: `Maintenance ticket ${code} for asset ${assetCode} has exceeded expected completion date (${mnt.expectedCompletionDate?.toLocaleDateString()}).`,
        entityType: 'MaintenanceRecord',
        entityId: mnt.id,
        assetId: mnt.assetId,
        actionRoute: `/maintenance`,
        fingerprint: `MAINTENANCE_OVERDUE_${mnt.id}_${now.toISOString().slice(0, 10)}`,
      });
    }
  }

  /**
   * 3. Check warranty expiring within 30 days or already expired
   */
  private static async checkWarrantyExpirations(): Promise<void> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringWarranties = await prisma.warranty.findMany({
      where: {
        endDate: { lte: thirtyDaysFromNow },
      },
      include: { asset: true },
      take: 100,
    });

    for (const wrn of expiringWarranties) {
      const isExpired = wrn.endDate < now;
      const code = wrn.warrantyCode;
      const assetCode = wrn.asset.assetCode || 'Asset';

      await NotificationService.notifyRole('ADMIN', {
        category: NotificationCategory.WARRANTY,
        type: isExpired ? 'WARRANTY_EXPIRED' : 'WARRANTY_EXPIRING',
        priority: isExpired ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
        title: isExpired ? `Warranty Expired: ${code}` : `Warranty Expiring Soon: ${code}`,
        message: isExpired
          ? `Warranty ${code} for asset ${assetCode} (${wrn.provider}) expired on ${wrn.endDate.toLocaleDateString()}.`
          : `Warranty ${code} for asset ${assetCode} (${wrn.provider}) expires on ${wrn.endDate.toLocaleDateString()}.`,
        entityType: 'Warranty',
        entityId: wrn.id,
        assetId: wrn.assetId,
        actionRoute: `/warranties`,
        fingerprint: `WARRANTY_${isExpired ? 'EXPIRED' : 'EXPIRING'}_${wrn.id}_${now.toISOString().slice(0, 10)}`,
      });
    }
  }

  /**
   * 4. Check approvals pending longer than 48 hours
   */
  private static async checkPendingApprovals(): Promise<void> {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const pendingApprovals = await prisma.approvalRequest.findMany({
      where: {
        status: ApprovalStatus.PENDING,
        createdAt: { lt: twoDaysAgo },
      },
      include: { asset: true },
      take: 50,
    });

    for (const app of pendingApprovals) {
      const role = app.targetRole || 'MANAGER';
      await NotificationService.notifyRole(role, {
        category: NotificationCategory.APPROVAL,
        type: 'APPROVAL_OVERDUE',
        priority: NotificationPriority.HIGH,
        title: `Action Required: Approval Overdue (${app.requestCode})`,
        message: `Approval request ${app.requestCode} for ${app.requestType} has been pending for over 48 hours.`,
        entityType: 'ApprovalRequest',
        entityId: app.id,
        assetId: app.assetId || undefined,
        actionRoute: `/approvals`,
        fingerprint: `APPROVAL_OVERDUE_${app.id}_${new Date().toISOString().slice(0, 10)}`,
      });
    }
  }
}
