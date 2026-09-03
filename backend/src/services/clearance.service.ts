import prisma from '../config/prisma';
import {
  ClearanceStatus,
  ClearanceAction,
  WorkflowStatus,
  EmployeeStatus,
  NotificationCategory,
  NotificationPriority,
} from '@prisma/client';
import { NotificationService } from './notification.service';
import { logger } from '../utils/logger';

export class ClearanceService {
  private static async generateClearanceCode(): Promise<string> {
    const count = await prisma.clearance.count();
    return `CLR-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * 1. Initiate Employee Exit Clearance
   */
  static async initiateClearance(
    data: { employeeId: string; exitDate: string | Date; reason?: string; notes?: string },
    userId: string
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      include: {
        assignments: {
          where: { status: WorkflowStatus.ACTIVE },
          include: { asset: true },
        },
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    // Check if there is already an active clearance
    const existingActive = await prisma.clearance.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: [ClearanceStatus.IN_PROGRESS, ClearanceStatus.PENDING_REVIEW, ClearanceStatus.PENDING_APPROVAL] },
      },
    });

    if (existingActive) {
      throw new Error(`An active clearance (${existingActive.clearanceCode}) already exists for this employee.`);
    }

    const clearanceCode = await this.generateClearanceCode();

    const clearance = await prisma.$transaction(async (tx) => {
      const clr = await tx.clearance.create({
        data: {
          clearanceCode,
          employeeId: employee.id,
          exitDate: new Date(data.exitDate),
          reason: data.reason,
          notes: data.notes,
          initiatedById: userId,
          status: employee.assignments.length === 0 ? ClearanceStatus.PENDING_REVIEW : ClearanceStatus.IN_PROGRESS,
        },
      });

      // Create ClearanceItem for each active assignment
      for (const asn of employee.assignments) {
        await tx.clearanceItem.create({
          data: {
            clearanceId: clr.id,
            assetId: asn.assetId,
            assignmentId: asn.id,
            action: ClearanceAction.RETURN,
            status: 'PENDING',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EXIT_INITIATED',
          entityType: 'Clearance',
          entityId: clr.id,
          newValue: JSON.stringify({
            clearanceCode,
            employeeCode: employee.employeeCode,
            assetsCount: employee.assignments.length,
          }),
        },
      });

      return clr;
    });

    // Notify IT and Admin
    await NotificationService.notifyRole('ADMIN', {
      category: NotificationCategory.EMPLOYEE,
      type: 'EMPLOYEE_CLEARANCE_REQUIRED',
      priority: NotificationPriority.HIGH,
      title: `Exit Clearance Initiated: ${employee.fullName} (${clearanceCode})`,
      message: `Offboarding initiated for ${employee.fullName} (${employee.employeeCode}). ${employee.assignments.length} asset(s) held.`,
      entityType: 'Clearance',
      entityId: clearance.id,
      actionRoute: `/clearance/${clearance.id}`,
    });

    return clearance;
  }

  /**
   * 2. Query Clearances
   */
  static async getClearances(query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status as ClearanceStatus;
    }
    if (query.search) {
      where.OR = [
        { clearanceCode: { contains: query.search, mode: 'insensitive' } },
        { employee: { fullName: { contains: query.search, mode: 'insensitive' } } },
        { employee: { employeeCode: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [clearances, total] = await Promise.all([
      prisma.clearance.findMany({
        where,
        include: {
          employee: { include: { department: true, location: true } },
          initiatedBy: { select: { username: true } },
          reviewedBy: { select: { username: true } },
          approvedBy: { select: { username: true } },
          items: {
            include: { asset: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.clearance.count({ where }),
    ]);

    const formatted = clearances.map((c) => {
      const totalItems = c.items.length;
      const resolvedItems = c.items.filter((i) => i.status === 'RESOLVED').length;
      const outstandingItems = totalItems - resolvedItems;

      return {
        id: c.id,
        clearanceCode: c.clearanceCode,
        employee: {
          id: c.employee.id,
          employeeCode: c.employee.employeeCode,
          fullName: c.employee.fullName,
          department: c.employee.department?.name || '—',
          location: c.employee.location?.name || '—',
        },
        exitDate: c.exitDate,
        initiatedDate: c.initiatedDate,
        status: c.status,
        reason: c.reason,
        totalItems,
        resolvedItems,
        outstandingItems,
        initiatedBy: c.initiatedBy?.username || 'System',
        approvedBy: c.approvedBy?.username || '—',
        completedDate: c.completedDate,
      };
    });

    return { clearances: formatted, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * 3. Get single Clearance by ID
   */
  static async getClearanceById(id: string) {
    const clr = await prisma.clearance.findUnique({
      where: { id },
      include: {
        employee: { include: { department: true, location: true } },
        initiatedBy: { select: { id: true, username: true } },
        reviewedBy: { select: { id: true, username: true } },
        approvedBy: { select: { id: true, username: true } },
        items: {
          include: {
            asset: { include: { specifications: true } },
            assignment: true,
            returnRel: true,
            transferRel: true,
            maintenanceRel: true,
            resolvedBy: { select: { username: true } },
          },
        },
      },
    });

    if (!clr) {
      throw new Error('Clearance not found');
    }

    return clr;
  }

  /**
   * 4. Resolve an individual Clearance Item
   */
  static async resolveClearanceItem(
    itemId: string,
    data: {
      action: ClearanceAction;
      resolutionNotes?: string;
      conditionAtClearance?: any;
      damageDescription?: string;
      missingAccessories?: string;
      returnId?: string;
      transferId?: string;
      maintenanceId?: string;
      exceptionReason?: string;
    },
    userId: string
  ) {
    const item = await prisma.clearanceItem.findUnique({
      where: { id: itemId },
      include: { clearance: true },
    });

    if (!item) {
      throw new Error('Clearance item not found');
    }

    if (item.clearance.status === ClearanceStatus.CLEARED) {
      throw new Error('Cannot modify items in a completed clearance.');
    }

    return prisma.clearanceItem.update({
      where: { id: itemId },
      data: {
        action: data.action,
        status: 'RESOLVED',
        resolutionNotes: data.resolutionNotes,
        conditionAtClearance: data.conditionAtClearance,
        damageDescription: data.damageDescription,
        missingAccessories: data.missingAccessories,
        returnId: data.returnId,
        transferId: data.transferId,
        maintenanceId: data.maintenanceId,
        exceptionReason: data.exceptionReason,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * 5. Complete Clearance (with strict validation against outstanding items)
   */
  static async completeClearance(clearanceId: string, userId: string, notes?: string) {
    const clr = await prisma.clearance.findUnique({
      where: { id: clearanceId },
      include: {
        items: true,
        employee: true,
      },
    });

    if (!clr) {
      throw new Error('Clearance not found');
    }

    if (clr.status === ClearanceStatus.CLEARED) {
      throw new Error('Clearance is already completed.');
    }

    // Check for any unresolved items
    const unresolved = clr.items.filter((i) => i.status !== 'RESOLVED');
    if (unresolved.length > 0) {
      throw new Error(`Cannot complete clearance: ${unresolved.length} item(s) remain unresolved.`);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.clearance.update({
        where: { id: clearanceId },
        data: {
          status: ClearanceStatus.CLEARED,
          completedDate: new Date(),
          approvedById: userId,
          notes: notes || clr.notes,
        },
      });

      // Update Employee Status to EXITED
      await tx.employee.update({
        where: { id: clr.employeeId },
        data: {
          status: EmployeeStatus.EXITED,
          exitDate: clr.exitDate,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CLEARANCE_COMPLETED',
          entityType: 'Clearance',
          entityId: clearanceId,
          newValue: JSON.stringify({
            clearanceCode: clr.clearanceCode,
            employeeCode: clr.employee.employeeCode,
            completedAt: new Date().toISOString(),
          }),
        },
      });

      return updated;
    });
  }
}
