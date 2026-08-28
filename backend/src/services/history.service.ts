import prisma from '../config/prisma';
import { AssetAction, AssetStatus, AssetCondition, Prisma } from '@prisma/client';

export interface HistoryEventInput {
  assetId: string;
  action: AssetAction;
  previousStatus?: AssetStatus | null;
  newStatus?: AssetStatus | null;
  previousHolderId?: string | null;
  previousHolderName?: string | null;
  newHolderId?: string | null;
  newHolderName?: string | null;
  previousDepartmentId?: string | null;
  previousDepartmentName?: string | null;
  newDepartmentId?: string | null;
  newDepartmentName?: string | null;
  previousLocationId?: string | null;
  previousLocationName?: string | null;
  newLocationId?: string | null;
  newLocationName?: string | null;
  previousCondition?: AssetCondition | null;
  newCondition?: AssetCondition | null;
  performedById?: string | null;
  performedByName?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  eventDate?: Date;
  reason?: string | null;
  remarks?: string | null;
  metadata?: string | null;
}

export class HistoryService {
  /**
   * Records an immutable historical lifecycle event inside a transaction or standalone.
   */
  static async recordEvent(
    tx: Prisma.TransactionClient | typeof prisma,
    input: HistoryEventInput
  ) {
    return await tx.assetStatusHistory.create({
      data: {
        assetId: input.assetId,
        action: input.action,
        previousStatus: input.previousStatus,
        newStatus: input.newStatus,
        previousHolderId: input.previousHolderId,
        previousHolderName: input.previousHolderName,
        newHolderId: input.newHolderId,
        newHolderName: input.newHolderName,
        previousDepartmentId: input.previousDepartmentId,
        previousDepartmentName: input.previousDepartmentName,
        newDepartmentId: input.newDepartmentId,
        newDepartmentName: input.newDepartmentName,
        previousLocationId: input.previousLocationId,
        previousLocationName: input.previousLocationName,
        newLocationId: input.newLocationId,
        newLocationName: input.newLocationName,
        previousCondition: input.previousCondition,
        newCondition: input.newCondition,
        performedById: input.performedById,
        performedByName: input.performedByName,
        approvedById: input.approvedById,
        approvedByName: input.approvedByName,
        eventDate: input.eventDate || new Date(),
        reason: input.reason,
        remarks: input.remarks,
        metadata: input.metadata,
      },
    });
  }

  /**
   * Fetches paginated, filtered historical timeline for a specific asset.
   */
  static async getAssetHistory(assetId: string, query: any = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetStatusHistoryWhereInput = {
      assetId,
    };

    if (query.action) {
      const actions = String(query.action).split(',').map((a) => a.trim() as AssetAction);
      if (actions.length === 1) {
        where.action = actions[0];
      } else {
        where.action = { in: actions };
      }
    }

    if (query.startDate || query.endDate) {
      where.eventDate = {};
      if (query.startDate) {
        where.eventDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.eventDate.lte = end;
      }
    }

    if (query.search) {
      const s = String(query.search).trim();
      where.OR = [
        { remarks: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
        { previousHolderName: { contains: s, mode: 'insensitive' } },
        { newHolderName: { contains: s, mode: 'insensitive' } },
        { previousDepartmentName: { contains: s, mode: 'insensitive' } },
        { newDepartmentName: { contains: s, mode: 'insensitive' } },
        { previousLocationName: { contains: s, mode: 'insensitive' } },
        { newLocationName: { contains: s, mode: 'insensitive' } },
        { performedByName: { contains: s, mode: 'insensitive' } },
        { performedBy: { username: { contains: s, mode: 'insensitive' } } },
        { previousHolder: { fullName: { contains: s, mode: 'insensitive' } } },
        { newHolder: { fullName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, events] = await Promise.all([
      prisma.assetStatusHistory.count({ where }),
      prisma.assetStatusHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          performedBy: {
            select: { id: true, username: true },
          },
          approvedBy: {
            select: { id: true, username: true },
          },
          previousHolder: {
            select: { id: true, fullName: true, employeeCode: true, designation: true },
          },
          newHolder: {
            select: { id: true, fullName: true, employeeCode: true, designation: true },
          },
          previousDepartment: {
            select: { id: true, name: true, code: true },
          },
          newDepartment: {
            select: { id: true, name: true, code: true },
          },
          previousLocation: {
            select: { id: true, name: true, code: true },
          },
          newLocation: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
    ]);

    // Format normalized display fields
    const formattedEvents = events.map((e: any) => ({
      id: e.id,
      assetId: e.assetId,
      action: e.action,
      eventType: e.action,
      eventDate: e.eventDate,
      createdAt: e.createdAt,
      previousStatus: e.previousStatus,
      newStatus: e.newStatus,
      previousHolder: e.previousHolder?.fullName || e.previousHolderName || 'IT STOCK',
      newHolder: e.newHolder?.fullName || e.newHolderName || 'IT STOCK',
      previousHolderDetails: e.previousHolder,
      newHolderDetails: e.newHolder,
      previousDepartment: e.previousDepartment?.name || e.previousDepartmentName || '—',
      newDepartment: e.newDepartment?.name || e.newDepartmentName || '—',
      previousLocation: e.previousLocation?.name || e.previousLocationName || '—',
      newLocation: e.newLocation?.name || e.newLocationName || '—',
      previousCondition: e.previousCondition,
      newCondition: e.newCondition,
      performedBy: e.performedBy?.username || e.performedByName || 'System',
      approvedBy: e.approvedBy?.username || e.approvedByName || null,
      reason: e.reason || '',
      remarks: e.remarks || '',
      metadata: e.metadata,
    }));

    // Find the last movement/activity (excluding initial registration if other events exist)
    const lastMovement =
      formattedEvents.find((e: any) => e.action !== AssetAction.CREATED && e.action !== AssetAction.ASSET_CREATED) ||
      formattedEvents[0] ||
      null;

    return {
      events: formattedEvents,
      lastMovement,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Cross-asset history query for audit & reporting.
   */
  static async getGlobalHistory(query: any = {}) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 25;
    const skip = (page - 1) * limit;

    const where: Prisma.AssetStatusHistoryWhereInput = {};

    if (query.assetId) where.assetId = query.assetId;
    if (query.action) where.action = query.action as AssetAction;
    if (query.employeeId) {
      where.OR = [
        { previousHolderId: query.employeeId },
        { newHolderId: query.employeeId },
      ];
    }
    if (query.departmentId) {
      where.OR = [
        { previousDepartmentId: query.departmentId },
        { newDepartmentId: query.departmentId },
      ];
    }
    if (query.startDate || query.endDate) {
      where.eventDate = {};
      if (query.startDate) where.eventDate.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.eventDate.lte = end;
      }
    }
    if (query.search) {
      const s = String(query.search).trim();
      where.OR = [
        { asset: { companyAssetId: { contains: s, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: s, mode: 'insensitive' } } },
        { remarks: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
        { previousHolderName: { contains: s, mode: 'insensitive' } },
        { newHolderName: { contains: s, mode: 'insensitive' } },
        { previousDepartmentName: { contains: s, mode: 'insensitive' } },
        { newDepartmentName: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, events] = await Promise.all([
      prisma.assetStatusHistory.count({ where }),
      prisma.assetStatusHistory.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              companyAssetId: true,
              model: true,
              assetType: true,
              manufacturer: true,
            },
          },
          performedBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          previousHolder: { select: { id: true, fullName: true, employeeCode: true } },
          newHolder: { select: { id: true, fullName: true, employeeCode: true } },
          previousDepartment: { select: { id: true, name: true } },
          newDepartment: { select: { id: true, name: true } },
          previousLocation: { select: { id: true, name: true } },
          newLocation: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      events: events.map((e: any) => ({
        id: e.id,
        assetId: e.assetId,
        companyAssetId: e.asset.companyAssetId || e.asset.assetCode,
        assetModel: e.asset.model,
        assetType: e.asset.assetType,
        action: e.action,
        eventType: e.action,
        eventDate: e.eventDate,
        previousStatus: e.previousStatus,
        newStatus: e.newStatus,
        previousHolder: e.previousHolder?.fullName || e.previousHolderName || 'IT STOCK',
        newHolder: e.newHolder?.fullName || e.newHolderName || 'IT STOCK',
        previousDepartment: e.previousDepartment?.name || e.previousDepartmentName || '—',
        newDepartment: e.newDepartment?.name || e.newDepartmentName || '—',
        previousLocation: e.previousLocation?.name || e.previousLocationName || '—',
        newLocation: e.newLocation?.name || e.newLocationName || '—',
        previousCondition: e.previousCondition,
        newCondition: e.newCondition,
        performedBy: e.performedBy?.username || e.performedByName || 'System',
        approvedBy: e.approvedBy?.username || e.approvedByName || null,
        reason: e.reason || '',
        remarks: e.remarks || '',
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Backfills historical events for existing database assets and workflows that do not have history yet.
   */
  static async backfillExistingRecords() {
    console.log('[History Backfill] Starting verification of existing database records...');

    const assets = await prisma.asset.findMany({
      include: {
        department: true,
        locationRel: true,
        currentHolder: true,
      },
    });

    let createdCount = 0;
    let assignmentCount = 0;
    let transferCount = 0;
    let returnCount = 0;
    let maintenanceCount = 0;

    for (const asset of assets) {
      // Check if registration history exists
      const existingCreated = await prisma.assetStatusHistory.findFirst({
        where: {
          assetId: asset.id,
          action: { in: [AssetAction.CREATED, AssetAction.ASSET_CREATED] },
        },
      });

      if (!existingCreated) {
        await prisma.assetStatusHistory.create({
          data: {
            assetId: asset.id,
            action: AssetAction.ASSET_CREATED,
            newStatus: asset.status,
            newCondition: asset.condition,
            newDepartmentId: asset.departmentId,
            newDepartmentName: asset.department?.name || asset.location || 'IT STOCK',
            newLocationId: asset.locationId,
            newLocationName: asset.locationRel?.name || asset.location || 'IT Area',
            newHolderName: 'IT STOCK',
            eventDate: asset.createdAt,
            remarks: `Asset registered in inventory. Initial status: ${asset.status}`,
            performedByName: 'System Migration',
          },
        });
        createdCount++;
      }

      // Check existing assignments for this asset
      const assignments = await prisma.assetAssignment.findMany({
        where: { assetId: asset.id },
        include: { employee: true, assignedBy: true, approvedBy: true },
        orderBy: { assignedAt: 'asc' },
      });

      for (const assign of assignments) {
        const existingAssignHistory = await prisma.assetStatusHistory.findFirst({
          where: {
            assetId: asset.id,
            action: AssetAction.ASSIGNED,
            newHolderId: assign.employeeId,
            eventDate: assign.assignedAt,
          },
        });

        if (!existingAssignHistory) {
          await prisma.assetStatusHistory.create({
            data: {
              assetId: asset.id,
              action: AssetAction.ASSIGNED,
              previousStatus: AssetStatus.AVAILABLE,
              newStatus: AssetStatus.ASSIGNED,
              previousHolderName: 'IT STOCK',
              newHolderId: assign.employeeId,
              newHolderName: assign.employee.fullName,
              newDepartmentId: asset.departmentId,
              newDepartmentName: asset.department?.name || asset.location || '—',
              newLocationId: asset.locationId,
              newLocationName: asset.locationRel?.name || asset.location || '—',
              previousCondition: AssetCondition.GOOD,
              newCondition: assign.conditionAtAssignment,
              performedById: assign.assignedById,
              performedByName: assign.assignedBy?.username || 'Admin',
              approvedById: assign.approvedById,
              approvedByName: assign.approvedBy?.username || null,
              eventDate: assign.assignedAt,
              remarks: assign.remarks || `Assigned to ${assign.employee.fullName}`,
            },
          });
          assignmentCount++;
        }
      }

      // Check existing transfers for this asset
      const transfers = await prisma.assetTransfer.findMany({
        where: { assetId: asset.id },
        include: {
          previousHolder: true,
          newHolder: true,
          previousDepartment: true,
          newDepartment: true,
          previousLocation: true,
          newLocation: true,
          requestedBy: true,
        },
        orderBy: { transferDate: 'asc' },
      });

      for (const tr of transfers) {
        const existingTransferHistory = await prisma.assetStatusHistory.findFirst({
          where: {
            assetId: asset.id,
            action: AssetAction.TRANSFERRED,
            eventDate: tr.transferDate,
          },
        });

        if (!existingTransferHistory) {
          await prisma.assetStatusHistory.create({
            data: {
              assetId: asset.id,
              action: AssetAction.TRANSFERRED,
              previousHolderId: tr.previousHolderId,
              previousHolderName: tr.previousHolder?.fullName || 'IT STOCK',
              newHolderId: tr.newHolderId,
              newHolderName: tr.newHolder?.fullName,
              previousDepartmentId: tr.previousDepartmentId,
              previousDepartmentName: tr.previousDepartment?.name,
              newDepartmentId: tr.newDepartmentId,
              newDepartmentName: tr.newDepartment?.name,
              previousLocationId: tr.previousLocationId,
              previousLocationName: tr.previousLocation?.name,
              newLocationId: tr.newLocationId,
              newLocationName: tr.newLocation?.name,
              performedById: tr.requestedById,
              performedByName: tr.requestedBy?.username || 'Admin',
              eventDate: tr.transferDate,
              reason: tr.reason,
              remarks: tr.remarks,
            },
          });
          transferCount++;
        }
      }

      // Check existing returns for this asset
      const returns = await prisma.assetReturn.findMany({
        where: { assetId: asset.id },
        include: { employee: true, receivedBy: true },
        orderBy: { returnDate: 'asc' },
      });

      for (const ret of returns) {
        const existingReturnHistory = await prisma.assetStatusHistory.findFirst({
          where: {
            assetId: asset.id,
            action: AssetAction.RETURNED,
            eventDate: ret.returnDate,
          },
        });

        if (!existingReturnHistory) {
          await prisma.assetStatusHistory.create({
            data: {
              assetId: asset.id,
              action: AssetAction.RETURNED,
              previousStatus: AssetStatus.ASSIGNED,
              newStatus: ret.damageReported ? AssetStatus.UNDER_REPAIR : AssetStatus.AVAILABLE,
              previousHolderId: ret.employeeId,
              previousHolderName: ret.employee.fullName,
              newHolderName: 'IT STOCK',
              previousCondition: AssetCondition.GOOD,
              newCondition: ret.conditionAtReturn,
              performedById: ret.receivedById,
              performedByName: ret.receivedBy?.username || 'Admin',
              eventDate: ret.returnDate,
              remarks: `Returned to IT Stock. Damage reported: ${ret.damageReported ? 'Yes' : 'No'}. ${ret.remarks || ''}`,
            },
          });
          returnCount++;
        }
      }

      // Check existing maintenance tickets for this asset
      const maintenanceTickets = await prisma.maintenanceRecord.findMany({
        where: { assetId: asset.id },
        include: { reportedBy: true },
        orderBy: { createdAt: 'asc' },
      });

      for (const mt of maintenanceTickets) {
        const existingMaintHistory = await prisma.assetStatusHistory.findFirst({
          where: {
            assetId: asset.id,
            action: AssetAction.MAINTENANCE_STARTED,
            eventDate: mt.repairStartDate || mt.reportedAt || mt.createdAt,
          },
        });

        if (!existingMaintHistory) {
          await prisma.assetStatusHistory.create({
            data: {
              assetId: asset.id,
              action: AssetAction.MAINTENANCE_STARTED,
              previousStatus: AssetStatus.ASSIGNED,
              newStatus: AssetStatus.UNDER_REPAIR,
              performedById: mt.reportedById,
              performedByName: mt.reportedBy?.username || 'Admin',
              eventDate: mt.repairStartDate || mt.reportedAt || mt.createdAt,
              reason: mt.issueTitle,
              remarks: `${mt.issueDescription || ''} (Technician: ${mt.technician || 'N/A'}, Cost: ₹${mt.repairCost})`,
            },
          });
          maintenanceCount++;
        }
      }
    }

    console.log(
      `[History Backfill] Complete. Created: ${createdCount}, Assigned: ${assignmentCount}, Transferred: ${transferCount}, Returned: ${returnCount}, Maintenance: ${maintenanceCount}`
    );

    return {
      createdCount,
      assignmentCount,
      transferCount,
      returnCount,
      maintenanceCount,
    };
  }
}
