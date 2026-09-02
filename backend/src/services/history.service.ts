import prisma from '../config/prisma';
import { AssetAction, AssetStatus, AssetCondition, AllocationStatus, Prisma } from '@prisma/client';

export interface HistoryEventInput {
  assetId: string;
  action: AssetAction;
  previousStatus?: AssetStatus | null;
  newStatus?: AssetStatus | null;
  previousAllocationStatus?: AllocationStatus | null;
  newAllocationStatus?: AllocationStatus | null;
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
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  relatedRecordCode?: string | null;
  isCorrection?: boolean;
  correctedHistoryId?: string | null;
  correctionReason?: string | null;
  snapshot?: string | null;
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
        previousAllocationStatus: input.previousAllocationStatus,
        newAllocationStatus: input.newAllocationStatus,
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
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        relatedRecordCode: input.relatedRecordCode,
        isCorrection: input.isCorrection || false,
        correctedHistoryId: input.correctedHistoryId,
        correctionReason: input.correctionReason,
        snapshot: input.snapshot,
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
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(250, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AssetStatusHistoryWhereInput = {
      assetId,
    };

    if (query.action) {
      const actions = String(query.action).split(',').map((a) => a.trim() as AssetAction).filter(Boolean);
      if (actions.length === 1) {
        where.action = actions[0];
      } else if (actions.length > 1) {
        where.action = { in: actions };
      }
    }

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

    if (query.locationId) {
      where.OR = [
        { previousLocationId: query.locationId },
        { newLocationId: query.locationId },
      ];
    }

    if (query.status) {
      where.OR = [
        { previousStatus: query.status as AssetStatus },
        { newStatus: query.status as AssetStatus },
      ];
    }

    if (query.condition) {
      where.OR = [
        { previousCondition: query.condition as AssetCondition },
        { newCondition: query.condition as AssetCondition },
      ];
    }

    if (query.performedById) {
      where.performedById = query.performedById;
    }

    if (query.relatedEntityType) {
      where.relatedEntityType = query.relatedEntityType;
    }

    // Date filtering (preset or explicit range)
    const now = new Date();
    const eventDateFilter: Prisma.DateTimeFilter = {};
    let hasDateFilter = false;

    if (query.datePreset) {
      if (query.datePreset === 'TODAY') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        eventDateFilter.gte = startOfDay;
        hasDateFilter = true;
      } else if (query.datePreset === 'LAST_7_DAYS') {
        const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        eventDateFilter.gte = d;
        hasDateFilter = true;
      } else if (query.datePreset === 'LAST_30_DAYS') {
        const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        eventDateFilter.gte = d;
        hasDateFilter = true;
      } else if (query.datePreset === 'LAST_90_DAYS') {
        const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        eventDateFilter.gte = d;
        hasDateFilter = true;
      } else if (query.datePreset === 'THIS_YEAR') {
        const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        eventDateFilter.gte = startOfYear;
        hasDateFilter = true;
      }
    }

    if (query.startDate) {
      eventDateFilter.gte = new Date(query.startDate);
      hasDateFilter = true;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      eventDateFilter.lte = end;
      hasDateFilter = true;
    }

    if (hasDateFilter) {
      where.eventDate = eventDateFilter;
    }

    if (query.search) {
      const s = String(query.search).trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { id: { contains: s, mode: 'insensitive' } },
            { remarks: { contains: s, mode: 'insensitive' } },
            { reason: { contains: s, mode: 'insensitive' } },
            { relatedRecordCode: { contains: s, mode: 'insensitive' } },
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
          ],
        },
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
      previousAllocationStatus: e.previousAllocationStatus,
      newAllocationStatus: e.newAllocationStatus,
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
      relatedEntityType: e.relatedEntityType,
      relatedEntityId: e.relatedEntityId,
      relatedRecordCode: e.relatedRecordCode,
      isCorrection: e.isCorrection || false,
      correctedHistoryId: e.correctedHistoryId,
      correctionReason: e.correctionReason,
      snapshot: e.snapshot,
      reason: e.reason || '',
      remarks: e.remarks || '',
      metadata: e.metadata,
    }));

    // Find the last movement/activity (excluding initial registration if other events exist)
    const lastMovement =
      formattedEvents.find(
        (e: any) =>
          e.action !== AssetAction.CREATED &&
          e.action !== AssetAction.ASSET_CREATED &&
          e.action !== AssetAction.ASSET_IMPORTED
      ) ||
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
   * Compact PostgreSQL aggregate summary of an asset's full history and custody chain.
   */
  static async getAssetHistorySummary(assetId: string) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        currentHolder: { select: { id: true, fullName: true, employeeCode: true, email: true, designation: true } },
        department: { select: { id: true, name: true, code: true } },
        locationRel: { select: { id: true, name: true, code: true } },
      },
    });
    if (!asset) throw new Error('Asset not found');

    const [
      totalEvents,
      assignments,
      transfers,
      returns,
      maintenanceEvents,
      conditionChanges,
      locationChanges,
      firstEvent,
      lastEvent,
      holderEvents,
    ] = await Promise.all([
      prisma.assetStatusHistory.count({ where: { assetId } }),
      prisma.assetStatusHistory.count({
        where: {
          assetId,
          action: { in: [AssetAction.ASSIGNED, AssetAction.ASSET_ASSIGNED, AssetAction.ASSIGNMENT_UPDATED] },
        },
      }),
      prisma.assetStatusHistory.count({
        where: {
          assetId,
          action: { in: [AssetAction.TRANSFERRED, AssetAction.ASSET_TRANSFERRED] },
        },
      }),
      prisma.assetStatusHistory.count({
        where: {
          assetId,
          action: { in: [AssetAction.RETURNED, AssetAction.ASSET_RETURNED, AssetAction.ASSET_RETURN_INITIATED] },
        },
      }),
      prisma.assetStatusHistory.count({
        where: {
          assetId,
          action: {
            in: [
              AssetAction.MAINTENANCE_OPENED,
              AssetAction.MAINTENANCE_STARTED,
              AssetAction.MAINTENANCE_UPDATED,
              AssetAction.MAINTENANCE_COMPLETED,
            ],
          },
        },
      }),
      prisma.assetStatusHistory.count({
        where: {
          assetId,
          action: AssetAction.CONDITION_CHANGED,
        },
      }),
      prisma.assetStatusHistory.count({
        where: {
          assetId,
          action: AssetAction.LOCATION_CHANGED,
        },
      }),
      prisma.assetStatusHistory.findFirst({
        where: { assetId },
        orderBy: [{ eventDate: 'asc' }, { createdAt: 'asc' }],
        include: { performedBy: { select: { username: true } } },
      }),
      prisma.assetStatusHistory.findFirst({
        where: { assetId },
        orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        include: { performedBy: { select: { username: true } } },
      }),
      prisma.assetStatusHistory.findMany({
        where: {
          assetId,
          OR: [{ newHolderId: { not: null } }, { previousHolderId: { not: null } }],
        },
        orderBy: { eventDate: 'asc' },
        include: {
          previousHolder: { select: { id: true, fullName: true, employeeCode: true } },
          newHolder: { select: { id: true, fullName: true, employeeCode: true } },
        },
      }),
    ]);

    // Aggregate unique custodians
    const custodiansMap = new Map<string, { id: string; name: string; code: string; firstSeen: Date; lastSeen: Date; count: number }>();
    for (const he of holderEvents) {
      if (he.newHolder && he.newHolderId) {
        const id = he.newHolderId;
        const existing = custodiansMap.get(id);
        if (!existing) {
          custodiansMap.set(id, {
            id,
            name: he.newHolder.fullName,
            code: he.newHolder.employeeCode,
            firstSeen: he.eventDate,
            lastSeen: he.eventDate,
            count: 1,
          });
        } else {
          existing.lastSeen = he.eventDate;
          existing.count++;
        }
      }
    }

    const previousCustodians = Array.from(custodiansMap.values()).filter(
      (c) => c.id !== asset.currentHolderId
    );

    return {
      totalEvents,
      assignments,
      transfers,
      returns,
      maintenanceEvents,
      conditionChanges,
      locationChanges,
      firstActivity: firstEvent
        ? {
            id: firstEvent.id,
            date: firstEvent.eventDate,
            action: firstEvent.action,
            description: firstEvent.remarks || firstEvent.reason || 'Asset Initial Registration',
            performedBy: firstEvent.performedByName || firstEvent.performedBy?.username || 'System',
          }
        : null,
      lastActivity: lastEvent
        ? {
            id: lastEvent.id,
            date: lastEvent.eventDate,
            action: lastEvent.action,
            description: lastEvent.remarks || lastEvent.reason || 'Recent Movement',
            performedBy: lastEvent.performedByName || lastEvent.performedBy?.username || 'System',
          }
        : null,
      custodySummary: {
        currentHolder: asset.currentHolder
          ? {
              id: asset.currentHolder.id,
              fullName: asset.currentHolder.fullName,
              employeeCode: asset.currentHolder.employeeCode,
              designation: asset.currentHolder.designation,
            }
          : null,
        previousCustodians,
        totalAssignments: assignments,
        totalTransfers: transfers,
        totalReturns: returns,
      },
      currentState: {
        status: asset.status,
        allocationStatus: asset.allocationStatus,
        condition: asset.condition,
        criticality: asset.criticality,
        department: asset.department?.name || asset.location || '—',
        location: asset.locationRel?.name || asset.location || 'HQ',
        currentHolder: asset.currentHolder?.fullName || asset.employeeNameSource || 'IT STOCK',
      },
    };
  }

  /**
   * Administrative correction workflow (Immutability guarantee: appends CORRECTION_RECORDED linked to original)
   */
  static async recordCorrection(
    assetId: string,
    originalHistoryId: string,
    data: any,
    userId: string
  ) {
    const original = await prisma.assetStatusHistory.findUnique({
      where: { id: originalHistoryId },
      include: {
        asset: true,
        previousHolder: true,
        newHolder: true,
        previousDepartment: true,
        newDepartment: true,
        previousLocation: true,
        newLocation: true,
      },
    });

    if (!original || original.assetId !== assetId) {
      throw new Error('Target historical record not found for this asset.');
    }

    if (!data.reason || String(data.reason).trim().length < 5) {
      throw new Error('A detailed reason is mandatory when recording a historical correction.');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    return await prisma.$transaction(async (tx) => {
      // Append new immutable correction record linked to original
      const correction = await tx.assetStatusHistory.create({
        data: {
          assetId,
          action: AssetAction.CORRECTION_RECORDED,
          isCorrection: true,
          correctedHistoryId: originalHistoryId,
          correctionReason: data.reason.trim(),
          previousStatus: original.previousStatus,
          newStatus: data.newStatus || original.newStatus,
          previousCondition: original.previousCondition,
          newCondition: data.newCondition || original.newCondition,
          previousHolderId: original.previousHolderId,
          previousHolderName: original.previousHolderName,
          newHolderId: data.newHolderId !== undefined ? data.newHolderId : original.newHolderId,
          newHolderName: data.newHolderName || (data.newHolderId ? undefined : original.newHolderName),
          previousDepartmentId: original.previousDepartmentId,
          previousDepartmentName: original.previousDepartmentName,
          newDepartmentId: data.newDepartmentId !== undefined ? data.newDepartmentId : original.newDepartmentId,
          newDepartmentName: data.newDepartmentName || (data.newDepartmentId ? undefined : original.newDepartmentName),
          previousLocationId: original.previousLocationId,
          previousLocationName: original.previousLocationName,
          newLocationId: data.newLocationId !== undefined ? data.newLocationId : original.newLocationId,
          newLocationName: data.newLocationName || (data.newLocationId ? undefined : original.newLocationName),
          performedById: userId,
          performedByName: user?.username || 'Admin',
          eventDate: new Date(),
          reason: `Correction of Event #${originalHistoryId.slice(0, 8)}: ${data.reason.trim()}`,
          remarks: data.remarks
            ? data.remarks.trim()
            : `Corrective amendment by ${user?.username || 'Admin'}. Original record preserved intact.`,
          metadata: JSON.stringify({
            correctedEventId: originalHistoryId,
            originalAction: original.action,
            originalDate: original.eventDate,
            correctedFields: data.correctedFields || {},
          }),
        },
        include: {
          performedBy: { select: { id: true, username: true } },
          previousHolder: { select: { id: true, fullName: true, employeeCode: true } },
          newHolder: { select: { id: true, fullName: true, employeeCode: true } },
          previousDepartment: { select: { id: true, name: true } },
          newDepartment: { select: { id: true, name: true } },
          previousLocation: { select: { id: true, name: true } },
          newLocation: { select: { id: true, name: true } },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_HISTORY_CORRECTION',
          entityType: 'AssetStatusHistory',
          entityId: originalHistoryId,
          oldValue: JSON.stringify({
            id: original.id,
            action: original.action,
            holder: original.newHolderName,
            status: original.newStatus,
            condition: original.newCondition,
          }),
          newValue: JSON.stringify({
            correctionId: correction.id,
            reason: data.reason.trim(),
            newHolderId: data.newHolderId,
            newStatus: data.newStatus,
            newCondition: data.newCondition,
          }),
        },
      });

      return correction;
    });
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
              previousHolderName: ret.employee?.fullName || 'Employee',
              newHolderName: 'IT STOCK',
              previousCondition: AssetCondition.GOOD,
              newCondition: ret.conditionAtReturn,
              performedById: ret.receivedById || null,
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
