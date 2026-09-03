import prisma from '../config/prisma';
import {
  GatePresence,
  GateMovementType,
  GateMovementStatus,
  AssetAction,
  NotificationCategory,
  NotificationPriority,
} from '@prisma/client';
import { HistoryService } from './history.service';
import { NotificationService } from './notification.service';

export class SecurityGateService {
  /**
   * Generates sequential movement code: GMV-000001
   */
  public static async generateMovementCode(): Promise<string> {
    const records = await prisma.gateMovement.findMany({
      where: { movementCode: { startsWith: 'GMV-' } },
      select: { movementCode: true },
    });

    let maxNum = 0;
    for (const r of records) {
      if (r.movementCode) {
        const match = r.movementCode.match(/^GMV-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    return `GMV-${String(maxNum + 1).padStart(6, '0')}`;
  }

  /**
   * Real-time PostgreSQL KPIs for physical gate movements.
   * Zero hardcoded numbers.
   */
  public static async getGateKPIs() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const now = new Date();

    const [
      assetsOutside,
      assetsInside,
      todayOut,
      todayIn,
      overdueReturns,
      totalMovements,
    ] = await Promise.all([
      prisma.asset.count({ where: { gatePresence: GatePresence.OUTSIDE } }),
      prisma.asset.count({ where: { gatePresence: GatePresence.INSIDE } }),
      prisma.gateMovement.count({
        where: {
          movementType: GateMovementType.OUT,
          movementDateTime: { gte: todayStart },
        },
      }),
      prisma.gateMovement.count({
        where: {
          movementType: GateMovementType.IN,
          movementDateTime: { gte: todayStart },
        },
      }),
      prisma.gateMovement.count({
        where: {
          movementType: GateMovementType.OUT,
          status: GateMovementStatus.OPEN,
          expectedReturn: { lt: now },
        },
      }),
      prisma.gateMovement.count(),
    ]);

    return {
      assetsOutside,
      assetsInside,
      todayOut,
      todayIn,
      overdueReturns,
      totalMovements,
    };
  }

  /**
   * Query all assets currently outside the company premises.
   */
  public static async getCurrentOutsideAssets(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {
      gatePresence: GatePresence.OUTSIDE,
    };

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { assetCode: { contains: s, mode: 'insensitive' } },
        { companyAssetId: { contains: s, mode: 'insensitive' } },
        { assetName: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
        { currentHolder: { fullName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        include: {
          currentHolder: { select: { id: true, employeeCode: true, fullName: true, designation: true } },
          department: { select: { id: true, name: true, code: true } },
          locationRel: { select: { id: true, name: true, code: true } },
          gateMovements: {
            where: { movementType: GateMovementType.OUT, status: GateMovementStatus.OPEN },
            orderBy: { movementDateTime: 'desc' },
            take: 1,
            include: {
              gate: { select: { id: true, name: true, code: true } },
              guardUser: { select: { id: true, username: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const now = new Date();
    const rows = assets.map((a) => {
      const openMv = a.gateMovements[0] || null;
      let durationHours = 0;
      let isOverdue = false;

      if (openMv) {
        const outTime = new Date(openMv.movementDateTime).getTime();
        durationHours = Math.round((now.getTime() - outTime) / (1000 * 60 * 60));
        if (openMv.expectedReturn && new Date(openMv.expectedReturn) < now) {
          isOverdue = true;
        }
      }

      return {
        assetId: a.id,
        assetCode: a.companyAssetId || a.assetCode,
        assetName: a.assetName || a.model,
        assetType: a.assetType,
        model: a.model,
        holderName: a.currentHolder?.fullName || a.employeeNameSource || 'Unassigned Stock',
        department: a.department?.name || a.location || 'General',
        location: a.locationRel?.name || a.location || 'Headquarters',
        movementCode: openMv?.movementCode || 'N/A',
        outDateTime: openMv?.movementDateTime || null,
        gateName: openMv?.gate?.name || 'Gate',
        guardName: openMv?.guardUser?.username || 'Guard',
        destination: openMv?.destination || 'External Site',
        purpose: openMv?.purpose || 'Official Use',
        expectedReturn: openMv?.expectedReturn || null,
        durationHours,
        isOverdue,
        remarks: openMv?.remarks || '',
      };
    });

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      rows,
    };
  }

  /**
   * Paginated historical log of all physical gate movements.
   */
  public static async getMovementHistory(query: {
    page?: number;
    limit?: number;
    search?: string;
    movementType?: string;
    gateId?: string;
    guardUserId?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.movementType && (query.movementType === 'OUT' || query.movementType === 'IN')) {
      where.movementType = query.movementType as GateMovementType;
    }
    if (query.gateId) {
      where.gateId = query.gateId;
    }
    if (query.guardUserId) {
      where.guardUserId = query.guardUserId;
    }
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    if (query.startDate || query.endDate) {
      where.movementDateTime = {};
      if (query.startDate) where.movementDateTime.gte = new Date(query.startDate);
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.movementDateTime.lte = end;
      }
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { movementCode: { contains: s, mode: 'insensitive' } },
        { destination: { contains: s, mode: 'insensitive' } },
        { purpose: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } },
        { asset: { assetCode: { contains: s, mode: 'insensitive' } } },
        { asset: { companyAssetId: { contains: s, mode: 'insensitive' } } },
        { asset: { assetName: { contains: s, mode: 'insensitive' } } },
        { employee: { fullName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, movements] = await Promise.all([
      prisma.gateMovement.count({ where }),
      prisma.gateMovement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { movementDateTime: 'desc' },
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              companyAssetId: true,
              assetName: true,
              model: true,
              assetType: true,
              gatePresence: true,
            },
          },
          gate: { select: { id: true, name: true, code: true } },
          guardUser: { select: { id: true, username: true } },
          employee: { select: { id: true, employeeCode: true, fullName: true } },
          department: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
          relatedMovement: { select: { id: true, movementCode: true, movementDateTime: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      movements,
    };
  }

  /**
   * Execute OUT movement atomically in PostgreSQL.
   */
  public static async recordAssetOut(
    data: {
      assetId: string;
      qrCodeId?: string;
      gateId?: string;
      destination: string;
      purpose: string;
      expectedReturn?: string;
      remarks?: string;
    },
    guardUser: any
  ) {
    const effectiveUserId = guardUser?.userId || guardUser?.id;

    return await prisma.$transaction(async (tx) => {
      // 1. Concurrency and presence validation
      const asset = await tx.asset.findUnique({
        where: { id: data.assetId },
        include: { currentHolder: true, department: true, locationRel: true },
      });

      if (!asset) {
        throw new Error('Asset not found.');
      }

      if (asset.gatePresence === GatePresence.OUTSIDE) {
        throw new Error(
          `Asset ${asset.companyAssetId || asset.assetCode} is already recorded as OUTSIDE the premises. Cannot record OUT again.`
        );
      }

      // Check if there is an active QR code
      let qrId = data.qrCodeId;
      if (!qrId) {
        const activeQr = await tx.assetQrCode.findFirst({
          where: { assetId: asset.id, status: 'ACTIVE' },
        });
        if (activeQr) qrId = activeQr.id;
      }

      const movementCode = await this.generateMovementCode();
      const now = new Date();

      // 2. Create GateMovement (OUT, OPEN)
      const movement = await tx.gateMovement.create({
        data: {
          movementCode,
          assetId: asset.id,
          qrCodeId: qrId || null,
          movementType: GateMovementType.OUT,
          movementDateTime: now,
          gateId: data.gateId || null,
          guardUserId: effectiveUserId || null,
          employeeId: asset.currentHolderId || null,
          departmentId: asset.departmentId || null,
          locationId: asset.locationId || null,
          destination: data.destination,
          purpose: data.purpose,
          expectedReturn: data.expectedReturn ? new Date(data.expectedReturn) : null,
          remarks: data.remarks || null,
          status: GateMovementStatus.OPEN,
        },
        include: {
          gate: true,
          guardUser: { select: { id: true, username: true } },
          asset: true,
        },
      });

      // 3. Update Asset Physical Presence to OUTSIDE
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          gatePresence: GatePresence.OUTSIDE,
        },
      });

      // 4. Record in Asset Lifecycle History
      await HistoryService.recordEvent(tx, {
        assetId: asset.id,
        action: AssetAction.ASSET_GATE_EXIT,
        performedById: effectiveUserId,
        eventDate: now,
        remarks: `Physical Exit via ${movement.gate?.name || 'Security Gate'}. Destination: ${data.destination}. Purpose: ${data.purpose}. Code: ${movementCode}`,
      });

      // 5. Audit Log
      if (effectiveUserId) {
        await tx.auditLog.create({
          data: {
            userId: effectiveUserId,
            action: 'ASSET_GATE_EXIT',
            entityType: 'GateMovement',
            entityId: movement.id,
            newValue: JSON.stringify({
              assetCode: asset.companyAssetId || asset.assetCode,
              destination: data.destination,
              purpose: data.purpose,
              movementCode,
            }),
          },
        }).catch(() => {});
      }

      // 6. Notification (isolated failure protection)
      try {
        if (effectiveUserId) {
          await NotificationService.createNotification({
            userId: effectiveUserId,
            category: NotificationCategory.GATE_MOVEMENT,
            type: 'GATE_EXIT',
            priority: NotificationPriority.NORMAL,
            title: `Asset Gate Exit: ${asset.companyAssetId || asset.assetCode}`,
            message: `Asset ${asset.companyAssetId || asset.assetCode} was checked OUT at ${movement.gate?.name || 'Gate'}. Destination: ${data.destination}.`,
            entityType: 'GateMovement',
            entityId: movement.id,
            assetId: asset.id,
            actionRoute: '/security-gate',
          });
        }
      } catch (err) {
        console.warn('Non-blocking gate exit notification warning:', err);
      }


      return movement;
    });
  }

  /**
   * Execute IN movement atomically in PostgreSQL.
   */
  public static async recordAssetIn(
    data: {
      assetId: string;
      qrCodeId?: string;
      gateId?: string;
      remarks?: string;
    },
    guardUser: any
  ) {
    const effectiveUserId = guardUser?.userId || guardUser?.id;

    return await prisma.$transaction(async (tx) => {
      // 1. Concurrency and presence validation
      const asset = await tx.asset.findUnique({
        where: { id: data.assetId },
        include: { currentHolder: true, department: true, locationRel: true },
      });

      if (!asset) {
        throw new Error('Asset not found.');
      }

      if (asset.gatePresence === GatePresence.INSIDE) {
        throw new Error(
          `Asset ${asset.companyAssetId || asset.assetCode} is already recorded as INSIDE the premises. Cannot record IN again.`
        );
      }

      // 2. Find open OUT movement to close
      const openOutMovement = await tx.gateMovement.findFirst({
        where: {
          assetId: asset.id,
          movementType: GateMovementType.OUT,
          status: GateMovementStatus.OPEN,
        },
        orderBy: { movementDateTime: 'desc' },
      });

      let qrId = data.qrCodeId;
      if (!qrId) {
        const activeQr = await tx.assetQrCode.findFirst({
          where: { assetId: asset.id, status: 'ACTIVE' },
        });
        if (activeQr) qrId = activeQr.id;
      }

      const movementCode = await this.generateMovementCode();
      const now = new Date();

      // 3. Create GateMovement (IN, COMPLETED)
      const inMovement = await tx.gateMovement.create({
        data: {
          movementCode,
          assetId: asset.id,
          qrCodeId: qrId || null,
          movementType: GateMovementType.IN,
          movementDateTime: now,
          gateId: data.gateId || null,
          guardUserId: effectiveUserId || null,
          employeeId: asset.currentHolderId || null,
          departmentId: asset.departmentId || null,
          locationId: asset.locationId || null,
          relatedMovementId: openOutMovement ? openOutMovement.id : null,
          remarks: data.remarks || 'Returned to premises in good order',
          status: GateMovementStatus.COMPLETED,
        },
        include: {
          gate: true,
          guardUser: { select: { id: true, username: true } },
          asset: true,
        },
      });

      // 4. Close the open OUT movement if present
      if (openOutMovement) {
        await tx.gateMovement.update({
          where: { id: openOutMovement.id },
          data: {
            status: GateMovementStatus.COMPLETED,
            actualReturn: now,
          },
        });
      }

      // 5. Update Asset Physical Presence to INSIDE
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          gatePresence: GatePresence.INSIDE,
        },
      });

      // 6. Record in Asset Lifecycle History
      await HistoryService.recordEvent(tx, {
        assetId: asset.id,
        action: AssetAction.ASSET_GATE_ENTRY,
        performedById: effectiveUserId,
        eventDate: now,
        remarks: `Physical Entry via ${inMovement.gate?.name || 'Security Gate'}. Closed OUT Code: ${openOutMovement?.movementCode || 'Direct'}. Code: ${movementCode}`,
      });

      // 7. Audit Log
      if (effectiveUserId) {
        await tx.auditLog.create({
          data: {
            userId: effectiveUserId,
            action: 'ASSET_GATE_ENTRY',
            entityType: 'GateMovement',
            entityId: inMovement.id,
            newValue: JSON.stringify({
              assetCode: asset.companyAssetId || asset.assetCode,
              movementCode,
            }),
          },
        }).catch(() => {});
      }

      // 8. Notification
      try {
        if (effectiveUserId) {
          await NotificationService.createNotification({
            userId: effectiveUserId,
            category: NotificationCategory.GATE_MOVEMENT,
            type: 'GATE_ENTRY',
            priority: NotificationPriority.LOW,
            title: `Asset Gate Return: ${asset.companyAssetId || asset.assetCode}`,
            message: `Asset ${asset.companyAssetId || asset.assetCode} has returned safely through ${inMovement.gate?.name || 'Gate'}.`,
            entityType: 'GateMovement',
            entityId: inMovement.id,
            assetId: asset.id,
            actionRoute: '/security-gate',
          });
        }
      } catch (err) {
        console.warn('Non-blocking gate entry notification warning:', err);
      }


      return inMovement;
    });
  }

  /**
   * Generates chronological Daily Gate Register for administrative audit and export.
   */
  public static async getDailyRegister(dateStr?: string, gateId?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const where: any = {
      movementDateTime: { gte: start, lte: end },
    };

    if (gateId) where.gateId = gateId;

    return await prisma.gateMovement.findMany({
      where,
      orderBy: { movementDateTime: 'asc' },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            companyAssetId: true,
            assetName: true,
            model: true,
            assetType: true,
          },
        },
        gate: { select: { id: true, name: true, code: true } },
        guardUser: { select: { id: true, username: true } },
        employee: { select: { id: true, employeeCode: true, fullName: true } },
        department: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Retrieves the most recent gate movement for lightweight live polling.
   */
  public static async getLastMovement() {
    return await prisma.gateMovement.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            companyAssetId: true,
            assetName: true,
            model: true,
            manufacturer: true,
            assetType: true,
            gatePresence: true,
            status: true,
          },
        },
        gate: { select: { id: true, name: true, code: true } },
        guardUser: { select: { id: true, username: true } },
      },
    });
  }
}

