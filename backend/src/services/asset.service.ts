import prisma from '../config/prisma';
import { AssetStatus, AssetCondition, WorkflowStatus, MaintenanceStatus, AssetAction, AllocationStatus, Prisma } from '@prisma/client';
import {
  AssetCreateSchema,
  AssetUpdateSchema,
  AssetHardwareUpdateSchema,
  AssetAssignmentSchema,
  AssetTransferSchema,
  AssetReturnSchema,
  MaintenanceCreateSchema,
} from '../validators/schemas';
import { HistoryService } from './history.service';

export class AssetService {
  // Helper for generating sequential asset codes AST-000001
  private static async generateAssetCode(): Promise<string> {
    const astAssets = await prisma.asset.findMany({
      where: { assetCode: { startsWith: 'AST-' } },
      select: { assetCode: true },
    });

    let maxNum = 0;
    for (const a of astAssets) {
      const match = a.assetCode.match(/^AST-(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxNum) maxNum = val;
      }
    }

    return `AST-${(maxNum + 1).toString().padStart(6, '0')}`;
  }

  // Validate status transition matrix
  private static validateStatusTransition(currentStatus: AssetStatus, newStatus: AssetStatus) {
    if (currentStatus === newStatus) return;

    if (currentStatus === AssetStatus.RETIRED) {
      throw new Error('Retired assets cannot change status or be assigned.');
    }
    if (currentStatus === AssetStatus.SCRAPPED) {
      throw new Error('Scrapped assets cannot change status or be assigned.');
    }

    const validTransitions: Record<AssetStatus, AssetStatus[]> = {
      AVAILABLE: [AssetStatus.RESERVED, AssetStatus.ASSIGNED, AssetStatus.UNDER_REPAIR, AssetStatus.RETIRED, AssetStatus.DAMAGED, AssetStatus.LOST, AssetStatus.STOLEN],
      RESERVED: [AssetStatus.AVAILABLE, AssetStatus.ASSIGNED],
      ASSIGNED: [AssetStatus.IN_USE, AssetStatus.RETURNED, AssetStatus.UNDER_REPAIR, AssetStatus.IN_TRANSIT, AssetStatus.DAMAGED, AssetStatus.LOST, AssetStatus.STOLEN],
      IN_USE: [AssetStatus.RETURNED, AssetStatus.UNDER_REPAIR, AssetStatus.DAMAGED, AssetStatus.LOST, AssetStatus.STOLEN],
      UNDER_REPAIR: [AssetStatus.AVAILABLE, AssetStatus.DAMAGED, AssetStatus.SCRAPPED, AssetStatus.RETIRED],
      RETURNED: [AssetStatus.AVAILABLE, AssetStatus.UNDER_REPAIR, AssetStatus.RETIRED, AssetStatus.SCRAPPED],
      IN_TRANSIT: [AssetStatus.ASSIGNED, AssetStatus.IN_USE, AssetStatus.AVAILABLE],
      DAMAGED: [AssetStatus.UNDER_REPAIR, AssetStatus.SCRAPPED, AssetStatus.RETIRED],
      LOST: [AssetStatus.AVAILABLE, AssetStatus.SCRAPPED, AssetStatus.RETIRED],
      STOLEN: [AssetStatus.AVAILABLE, AssetStatus.SCRAPPED, AssetStatus.RETIRED],
      RETIRED: [],
      SCRAPPED: [],
    };

    const allowed = validTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}.`);
    }
  }

  static async getAssets(query: {
    page?: number;
    limit?: number;
    search?: string;
    assetType?: string;
    status?: string;
    condition?: string;
    departmentId?: string;
    locationId?: string;
    employeeId?: string;
    allocationStatus?: string;
    criticality?: string;
    dataQualityStatus?: string;
    holderType?: string;
    sourceAssetStatus?: string;
    department?: string;
    departmentOrArea?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(1000, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.AssetWhereInput = {};

    if (query.assetType) where.assetType = query.assetType as any;
    if (query.status) where.status = query.status as any;
    if (query.condition) where.condition = query.condition as any;
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.employeeId) where.currentHolderId = query.employeeId;
    if (query.allocationStatus) where.allocationStatus = query.allocationStatus as any;
    if (query.criticality) where.criticality = { equals: query.criticality, mode: 'insensitive' };
    if (query.dataQualityStatus) where.dataQualityStatus = query.dataQualityStatus as any;
    if (query.holderType) where.holderType = query.holderType as any;
    if (query.sourceAssetStatus) where.sourceAssetStatus = { equals: query.sourceAssetStatus, mode: 'insensitive' };

    const deptFilter = query.department || query.departmentOrArea;
    if (deptFilter && deptFilter.trim()) {
      const d = deptFilter.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { location: { equals: d, mode: 'insensitive' } },
            { department: { name: { equals: d, mode: 'insensitive' } } },
            { departmentId: d },
          ],
        },
      ];
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const sNormalized = s.replace(/\s+/g, '');
      where.OR = [
        { companyAssetId: { contains: s, mode: 'insensitive' } },
        { companyAssetId: { contains: sNormalized, mode: 'insensitive' } },
        { sourceAssetId: { contains: s, mode: 'insensitive' } },
        { assetCode: { contains: s, mode: 'insensitive' } },
        { assetName: { contains: s, mode: 'insensitive' } },
        { assetDescription: { contains: s, mode: 'insensitive' } },
        { assetNumber: { contains: s, mode: 'insensitive' } },
        { laptopNumber: { contains: s, mode: 'insensitive' } },
        { pcNumber: { contains: s, mode: 'insensitive' } },
        { serialNumber: { contains: s, mode: 'insensitive' } },
        { manufacturer: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
        { employeeNameSource: { contains: s, mode: 'insensitive' } },
        { currentHolder: { fullName: { contains: s, mode: 'insensitive' } } },
        { currentHolder: { employeeCode: { contains: s, mode: 'insensitive' } } },
        { holderDisplayName: { contains: s, mode: 'insensitive' } },
        { location: { contains: s, mode: 'insensitive' } },
        { department: { name: { contains: s, mode: 'insensitive' } } },
        { cpu: { contains: s, mode: 'insensitive' } },
        { lanIp: { contains: s, mode: 'insensitive' } },
        { lanMacAddress: { contains: s, mode: 'insensitive' } },
        { specifications: { processor: { contains: s, mode: 'insensitive' } } },
        { specifications: { ipAddress: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Dynamic sorting
    let orderBy: any = [{ companyAssetId: { sort: 'asc', nulls: 'last' } }, { assetCode: 'asc' }];
    if (query.sortBy) {
      const order: 'asc' | 'desc' = query.sortOrder === 'desc' ? 'desc' : 'asc';
      switch (query.sortBy) {
        case 'companyAssetId':
        case 'assetId':
          orderBy = [{ companyAssetId: { sort: order, nulls: 'last' } }, { assetCode: order }];
          break;
        case 'assetName':
        case 'model':
          orderBy = [{ assetName: { sort: order, nulls: 'last' } }, { model: order }];
          break;
        case 'assetType':
          orderBy = { assetType: order };
          break;
        case 'sourceAssetStatus':
        case 'status':
          orderBy = [{ sourceAssetStatus: { sort: order, nulls: 'last' } }, { status: order }];
          break;
        case 'allocationStatus':
          orderBy = { allocationStatus: order };
          break;
        case 'criticality':
          orderBy = { criticality: { sort: order, nulls: 'last' } };
          break;
        case 'location':
        case 'department':
          orderBy = { location: { sort: order, nulls: 'last' } };
          break;
        case 'employeeName':
        case 'employeeNameSource':
        case 'holder':
          orderBy = { employeeNameSource: { sort: order, nulls: 'last' } };
          break;
        case 'cpu':
          orderBy = { cpu: { sort: order, nulls: 'last' } };
          break;
        case 'serialNumber':
          orderBy = { serialNumber: { sort: order, nulls: 'last' } };
          break;
        case 'createdAt':
          orderBy = { createdAt: order };
          break;
        default:
          orderBy = [{ companyAssetId: { sort: order, nulls: 'last' } }, { assetCode: order }];
      }
    }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          currentHolder: {
            select: { id: true, employeeCode: true, fullName: true, email: true, designation: true },
          },
          department: { select: { id: true, name: true, code: true } },
          locationRel: { select: { id: true, name: true, code: true } },
          specifications: true,
        },
      }),
    ]);

    return {
      assets,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getDistinctDepartments(): Promise<string[]> {
    const [locations, departments] = await Promise.all([
      prisma.asset.findMany({
        select: { location: true },
        distinct: ['location'],
      }),
      prisma.department.findMany({
        select: { name: true },
      }),
    ]);

    const set = new Set<string>();
    locations.forEach((l) => {
      if (l.location && l.location.trim()) set.add(l.location.trim());
    });
    departments.forEach((d) => {
      if (d.name && d.name.trim()) set.add(d.name.trim());
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  static async getAssetById(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        currentHolder: {
          include: { department: true, location: true },
        },
        department: true,
        locationRel: true,
        specifications: true,
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: { employee: true, assignedBy: true, approvedBy: true },
        },
        transfers: {
          orderBy: { createdAt: 'desc' },
          include: {
            previousHolder: true,
            newHolder: true,
            previousDepartment: true,
            newDepartment: true,
            previousLocation: true,
            newLocation: true,
            requestedBy: true,
            approvedBy: true,
          },
        },
        returns: {
          orderBy: { createdAt: 'desc' },
          include: { employee: true, receivedBy: true },
        },
        maintenance: {
          orderBy: { createdAt: 'desc' },
          include: { reportedBy: true, parts: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: { performedBy: true, previousHolder: true, newHolder: true },
        },
      },
    });

    if (!asset) throw new Error('Asset not found');
    return asset;
  }

  static async createAsset(data: unknown, userId: string) {
    const validated = AssetCreateSchema.parse(data);
    const companyAssetId = validated.companyAssetId?.trim() || (await AssetService.generateAssetCode());

    // Check for existing companyAssetId or assetCode
    const existing = await prisma.asset.findFirst({
      where: {
        OR: [
          { companyAssetId: companyAssetId },
          { assetCode: companyAssetId },
        ],
      },
    });

    if (existing) {
      throw new Error(`An asset with ID '${companyAssetId}' already exists in inventory.`);
    }

    const assetCode = companyAssetId;
    const { specifications, ...assetData } = validated;

    const newAsset = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          ...assetData,
          companyAssetId,
          assetCode,
          sourceAssetId: companyAssetId,
          specifications: specifications
            ? {
                create: specifications,
              }
            : undefined,
        },
        include: {
          specifications: true,
          department: true,
          locationRel: true,
          currentHolder: true,
        },
      });

      await HistoryService.recordEvent(tx, {
        assetId: asset.id,
        action: AssetAction.ASSET_CREATED,
        newStatus: asset.status,
        newCondition: asset.condition,
        newDepartmentId: asset.departmentId,
        newDepartmentName: asset.department?.name || asset.location || 'IT STOCK',
        newLocationId: asset.locationId,
        newLocationName: asset.locationRel?.name || asset.location || 'IT Area',
        newHolderName: asset.currentHolder?.fullName || asset.employeeNameSource || 'IT STOCK',
        performedById: userId,
        eventDate: new Date(),
        remarks: `Asset created with ID ${companyAssetId}`,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_CREATE',
          entityType: 'Asset',
          entityId: asset.id,
          newValue: JSON.stringify({
            companyAssetId,
            assetName: asset.assetName,
            status: asset.status,
            allocationStatus: asset.allocationStatus,
          }),
        },
      });

      return asset;
    });

    return newAsset;
  }

  static async updateAsset(id: string, data: unknown, userId: string) {
    const existing = await prisma.asset.findUnique({
      where: { id },
      include: { specifications: true },
    });
    if (!existing) throw new Error('Asset not found');

    const validated = AssetUpdateSchema.parse(data);
    const { specifications, ...assetData } = validated;

    if (assetData.status && assetData.status !== existing.status) {
      AssetService.validateStatusTransition(existing.status, assetData.status);
    }

    const updated = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          ...assetData,
          specifications: specifications
            ? {
                upsert: {
                  create: specifications,
                  update: specifications,
                },
              }
            : undefined,
        },
        include: { specifications: true, department: true, locationRel: true, currentHolder: true },
      });

      if (assetData.status && assetData.status !== existing.status) {
        await HistoryService.recordEvent(tx, {
          assetId: id,
          action: AssetAction.STATUS_CHANGED,
          previousStatus: existing.status,
          newStatus: assetData.status,
          performedById: userId,
          eventDate: new Date(),
          remarks: `Status updated from ${existing.status} to ${assetData.status}`,
        });
      }

      if (assetData.condition && assetData.condition !== existing.condition) {
        await HistoryService.recordEvent(tx, {
          assetId: id,
          action: AssetAction.CONDITION_CHANGED,
          previousCondition: existing.condition,
          newCondition: assetData.condition,
          performedById: userId,
          eventDate: new Date(),
          remarks: `Condition updated from ${existing.condition} to ${assetData.condition}`,
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_UPDATE',
          entityType: 'Asset',
          entityId: id,
          oldValue: JSON.stringify({ status: existing.status, condition: existing.condition, allocationStatus: existing.allocationStatus }),
          newValue: JSON.stringify({ status: asset.status, condition: asset.condition, allocationStatus: asset.allocationStatus }),
        },
      });

      return asset;
    });

    return updated;
  }

  static async updateHardware(id: string, data: unknown, userId: string) {
    const existing = await prisma.asset.findUnique({
      where: { id },
      include: { specifications: true },
    });
    if (!existing) throw new Error('Asset not found');

    const validated = AssetHardwareUpdateSchema.parse(data);
    const { reason, cpu, ram, storage, monitor, keyboard, mouse, chargerAdapter, otherHardware } = validated;

    // Track field-level diffs for audit log
    const oldHardware = {
      cpu: existing.cpu || existing.specifications?.processor || null,
      ram: existing.ram || existing.specifications?.ram || null,
      storage: existing.specifications?.storage || null,
      monitor: existing.specifications?.monitor || null,
      keyboard: existing.specifications?.keyboard || null,
      mouse: existing.specifications?.mouse || null,
      chargerAdapter: existing.specifications?.chargerAdapter || null,
      otherHardware: existing.specifications?.otherHardware || null,
    };

    const newHardware = {
      cpu: cpu !== undefined ? (cpu?.trim() || null) : oldHardware.cpu,
      ram: ram !== undefined ? (ram?.trim() || null) : oldHardware.ram,
      storage: storage !== undefined ? (storage?.trim() || null) : oldHardware.storage,
      monitor: monitor !== undefined ? (monitor?.trim() || null) : oldHardware.monitor,
      keyboard: keyboard !== undefined ? (keyboard?.trim() || null) : oldHardware.keyboard,
      mouse: mouse !== undefined ? (mouse?.trim() || null) : oldHardware.mouse,
      chargerAdapter: chargerAdapter !== undefined ? (chargerAdapter?.trim() || null) : oldHardware.chargerAdapter,
      otherHardware: otherHardware !== undefined ? (otherHardware?.trim() || null) : oldHardware.otherHardware,
    };

    const changedFields: string[] = [];
    Object.keys(newHardware).forEach((k) => {
      const key = k as keyof typeof newHardware;
      if (newHardware[key] !== oldHardware[key]) {
        changedFields.push(`${key.toUpperCase()}: ${oldHardware[key] || '—'} → ${newHardware[key] || '—'}`);
      }
    });

    const updated = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          cpu: newHardware.cpu,
          ram: newHardware.ram,
          specifications: {
            upsert: {
              create: {
                processor: newHardware.cpu,
                ram: newHardware.ram,
                storage: newHardware.storage,
                monitor: newHardware.monitor,
                keyboard: newHardware.keyboard,
                mouse: newHardware.mouse,
                chargerAdapter: newHardware.chargerAdapter,
                otherHardware: newHardware.otherHardware,
              },
              update: {
                processor: newHardware.cpu,
                ram: newHardware.ram,
                storage: newHardware.storage,
                monitor: newHardware.monitor,
                keyboard: newHardware.keyboard,
                mouse: newHardware.mouse,
                chargerAdapter: newHardware.chargerAdapter,
                otherHardware: newHardware.otherHardware,
              },
            },
          },
        },
        include: {
          specifications: true,
          department: true,
          locationRel: true,
          currentHolder: true,
        },
      });

      if (changedFields.length > 0) {
        const changeSummary = changedFields.join(', ');
        await tx.auditLog.create({
          data: {
            userId,
            action: 'HARDWARE_UPDATE',
            entityType: 'Asset',
            entityId: id,
            oldValue: JSON.stringify(oldHardware),
            newValue: JSON.stringify(newHardware),
          },
        });

        await HistoryService.recordEvent(tx, {
          assetId: id,
          action: AssetAction.STATUS_CHANGED,
          newStatus: existing.status,
          newCondition: existing.condition,
          performedById: userId,
          eventDate: new Date(),
          remarks: `Hardware Configuration Updated: ${changeSummary}${reason ? ` (Reason: ${reason})` : ''}`,
        });
      }

      return asset;
    });

    return updated;
  }

  static async deleteAsset(id: string, userId: string) {
    const existing = await prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: { take: 1 },
        transfers: { take: 1 },
        returns: { take: 1 },
        maintenance: { take: 1 },
      },
    });

    if (!existing) throw new Error('Asset not found');

    const hasDependencies =
      existing.assignments.length > 0 ||
      existing.transfers.length > 0 ||
      existing.returns.length > 0 ||
      existing.maintenance.length > 0;

    return await prisma.$transaction(async (tx) => {
      if (hasDependencies) {
        // Safe soft-delete / decommissioning to protect historical integrity
        const updated = await tx.asset.update({
          where: { id },
          data: {
            status: AssetStatus.RETIRED,
            sourceAssetStatus: 'Inactive',
            allocationStatus: AllocationStatus.NOT_ALLOCATED,
            sourceAllocationStatus: 'Not Allocated',
            currentHolderId: null,
            employeeNameSource: null,
            notes: (existing.notes ? existing.notes + ' | ' : '') + 'Safely deactivated/retired by Admin.',
          },
        });

        await tx.assetStatusHistory.create({
          data: {
            assetId: id,
            action: AssetAction.RETIRED,
            previousStatus: existing.status,
            newStatus: AssetStatus.RETIRED,
            performedById: userId,
            remarks: 'Asset safely retired/deactivated by admin due to historical dependencies.',
          },
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'ASSET_DEACTIVATE',
            entityType: 'Asset',
            entityId: id,
            oldValue: JSON.stringify({ status: existing.status, allocationStatus: existing.allocationStatus }),
            newValue: JSON.stringify({ status: AssetStatus.RETIRED, allocationStatus: AllocationStatus.NOT_ALLOCATED }),
          },
        });

        return {
          id,
          action: 'DEACTIVATED',
          asset: updated,
          message: `Asset ${existing.companyAssetId || existing.assetCode} has been safely retired from active inventory.`,
        };
      } else {
        // True hard delete if no dependent records exist
        await tx.assetSpecification.deleteMany({ where: { assetId: id } });
        await tx.assetStatusHistory.deleteMany({ where: { assetId: id } });
        await tx.asset.delete({ where: { id } });

        await tx.auditLog.create({
          data: {
            userId,
            action: 'ASSET_DELETE',
            entityType: 'Asset',
            entityId: id,
            oldValue: JSON.stringify({
              assetCode: existing.assetCode,
              companyAssetId: existing.companyAssetId,
              model: existing.model,
            }),
          },
        });

        return {
          id,
          action: 'DELETED',
          message: `Asset ${existing.companyAssetId || existing.assetCode} has been permanently deleted.`,
        };
      }
    });
  }

  static async assignAsset(assetId: string, data: unknown, userId: string) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');

    if (asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.SCRAPPED) {
      throw new Error('Cannot assign a retired or scrapped asset.');
    }
    if (asset.status === AssetStatus.UNDER_REPAIR) {
      throw new Error('Cannot assign an asset currently under repair.');
    }
    if (asset.allocationStatus === AllocationStatus.ALLOCATED && asset.status === AssetStatus.ASSIGNED) {
      throw new Error('Asset is currently allocated to an active holder. Please process a transfer or return first.');
    }

    const validated = AssetAssignmentSchema.parse(data);

    const employee = await prisma.employee.findUnique({ where: { id: validated.employeeId } });
    if (!employee || employee.status !== 'ACTIVE') {
      throw new Error('Employee not found or is currently inactive.');
    }

    return await prisma.$transaction(async (tx) => {
      const assignment = await tx.assetAssignment.create({
        data: {
          assetId,
          employeeId: validated.employeeId,
          assignedById: userId,
          assignedAt: new Date(),
          expectedReturnDate: validated.expectedReturnDate,
          conditionAtAssignment: validated.conditionAtAssignment,
          remarks: validated.remarks,
          status: WorkflowStatus.ACTIVE,
        },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.ASSIGNED,
          condition: validated.conditionAtAssignment,
          allocationStatus: AllocationStatus.ALLOCATED,
          sourceAllocationStatus: 'Allocated',
          currentHolderId: validated.employeeId,
          employeeNameSource: employee.fullName,
          dateOfAllocation: new Date(),
          departmentId: employee.departmentId,
          locationId: employee.locationId,
        },
      });

      await HistoryService.recordEvent(tx, {
        assetId,
        action: AssetAction.ASSIGNED,
        previousStatus: asset.status,
        newStatus: AssetStatus.ASSIGNED,
        previousHolderId: asset.currentHolderId,
        previousHolderName: asset.employeeNameSource || 'IT STOCK',
        newHolderId: validated.employeeId,
        newHolderName: employee.fullName,
        previousDepartmentId: asset.departmentId,
        previousDepartmentName: asset.location,
        newDepartmentId: employee.departmentId || asset.departmentId,
        newDepartmentName: asset.location,
        previousLocationId: asset.locationId,
        previousLocationName: asset.location,
        newLocationId: employee.locationId || asset.locationId,
        newLocationName: asset.location,
        previousCondition: asset.condition,
        newCondition: validated.conditionAtAssignment || asset.condition,
        performedById: userId,
        eventDate: new Date(),
        remarks: validated.remarks || `Assigned to employee ${employee.fullName} (${employee.employeeCode})`,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_ASSIGN',
          entityType: 'AssetAssignment',
          entityId: assignment.id,
          newValue: JSON.stringify({ assetId, employeeId: validated.employeeId, status: 'ACTIVE' }),
        },
      });

      return assignment;
    });
  }

  static async transferAsset(assetId: string, data: unknown, userId: string) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');

    const validated = AssetTransferSchema.parse(data);

    const newHolder = await prisma.employee.findUnique({ where: { id: validated.newHolderId } });
    if (!newHolder || newHolder.status !== 'ACTIVE') {
      throw new Error('Target transfer employee not found or inactive.');
    }

    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.assetTransfer.create({
        data: {
          assetId,
          previousHolderId: asset.currentHolderId,
          newHolderId: validated.newHolderId,
          previousDepartmentId: asset.departmentId,
          newDepartmentId: validated.newDepartmentId || newHolder.departmentId,
          previousLocationId: asset.locationId,
          newLocationId: validated.newLocationId || newHolder.locationId,
          requestedById: userId,
          transferDate: new Date(),
          reason: validated.reason,
          remarks: validated.remarks,
          status: WorkflowStatus.COMPLETED,
        },
      });

      await tx.asset.update({
        where: { id: assetId },
        data: {
          currentHolderId: validated.newHolderId,
          departmentId: validated.newDepartmentId || newHolder.departmentId,
          locationId: validated.newLocationId || newHolder.locationId,
        },
      });

      const prevHolder = asset.currentHolderId ? await tx.employee.findUnique({ where: { id: asset.currentHolderId } }) : null;
      const prevDept = asset.departmentId ? await tx.department.findUnique({ where: { id: asset.departmentId } }) : null;
      const prevLoc = asset.locationId ? await tx.location.findUnique({ where: { id: asset.locationId } }) : null;
      const targetDeptId = validated.newDepartmentId || newHolder.departmentId;
      const newDept = targetDeptId ? await tx.department.findUnique({ where: { id: targetDeptId } }) : null;
      const targetLocId = validated.newLocationId || newHolder.locationId;
      const newLoc = targetLocId ? await tx.location.findUnique({ where: { id: targetLocId } }) : null;

      await HistoryService.recordEvent(tx, {
        assetId,
        action: AssetAction.TRANSFERRED,
        previousStatus: asset.status,
        newStatus: asset.status,
        previousHolderId: asset.currentHolderId,
        previousHolderName: prevHolder?.fullName || asset.employeeNameSource || 'IT STOCK',
        newHolderId: validated.newHolderId,
        newHolderName: newHolder.fullName,
        previousDepartmentId: asset.departmentId,
        previousDepartmentName: prevDept?.name || asset.location,
        newDepartmentId: targetDeptId || null,
        newDepartmentName: newDept?.name || prevDept?.name || asset.location,
        previousLocationId: asset.locationId,
        previousLocationName: prevLoc?.name || asset.location,
        newLocationId: targetLocId || null,
        newLocationName: newLoc?.name || prevLoc?.name || asset.location,
        performedById: userId,
        eventDate: new Date(),
        reason: validated.reason,
        remarks: validated.remarks || `Transferred to ${newHolder.fullName} (${newHolder.employeeCode})`,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_TRANSFER',
          entityType: 'AssetTransfer',
          entityId: transfer.id,
          oldValue: JSON.stringify({ previousHolderId: asset.currentHolderId }),
          newValue: JSON.stringify({ newHolderId: validated.newHolderId }),
        },
      });

      return transfer;
    });
  }

  static async returnAsset(assetId: string, data: unknown, userId: string) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found');
    if (!asset.currentHolderId) throw new Error('Asset is not currently assigned to any employee.');

    const validated = AssetReturnSchema.parse(data);
    const previousHolderId = asset.currentHolderId;

    return await prisma.$transaction(async (tx) => {
      const returnRec = await tx.assetReturn.create({
        data: {
          assetId,
          employeeId: previousHolderId,
          receivedById: userId,
          returnDate: new Date(),
          conditionAtReturn: validated.conditionAtReturn,
          accessoriesReturned: validated.accessoriesReturned,
          damageReported: validated.damageReported,
          missingAccessories: validated.missingAccessories,
          remarks: validated.remarks,
          status: WorkflowStatus.COMPLETED,
        },
      });

      // Deactivate active assignment records
      await tx.assetAssignment.updateMany({
        where: { assetId, employeeId: previousHolderId, status: WorkflowStatus.ACTIVE },
        data: { status: WorkflowStatus.COMPLETED },
      });

      const nextStatus = validated.damageReported ? AssetStatus.UNDER_REPAIR : AssetStatus.AVAILABLE;

      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: nextStatus,
          condition: validated.conditionAtReturn,
          currentHolderId: null,
        },
      });

      const prevHolder = previousHolderId ? await tx.employee.findUnique({ where: { id: previousHolderId } }) : null;
      const prevDept = asset.departmentId ? await tx.department.findUnique({ where: { id: asset.departmentId } }) : null;

      await HistoryService.recordEvent(tx, {
        assetId,
        action: AssetAction.RETURNED,
        previousStatus: asset.status,
        newStatus: nextStatus,
        previousHolderId,
        previousHolderName: prevHolder?.fullName || 'Employee',
        newHolderName: 'IT STOCK',
        previousDepartmentId: asset.departmentId,
        previousDepartmentName: prevDept?.name || asset.location,
        newDepartmentName: 'IT STOCK',
        previousCondition: asset.condition,
        newCondition: validated.conditionAtReturn,
        performedById: userId,
        eventDate: new Date(),
        remarks: `Returned by employee. Accessories returned: ${validated.accessoriesReturned}. Damage reported: ${validated.damageReported}${validated.remarks ? ' | ' + validated.remarks : ''}`,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_RETURN',
          entityType: 'AssetReturn',
          entityId: returnRec.id,
          newValue: JSON.stringify({ assetId, previousHolderId, nextStatus }),
        },
      });

      return returnRec;
    });
  }

  static async createMaintenance(data: unknown, userId: string) {
    const validated = MaintenanceCreateSchema.parse(data);
    const asset = await prisma.asset.findUnique({ where: { id: validated.assetId } });
    if (!asset) throw new Error('Asset not found');

    return await prisma.$transaction(async (tx) => {
      const maintenance = await tx.maintenanceRecord.create({
        data: {
          assetId: validated.assetId,
          reportedById: userId,
          issueTitle: validated.issueTitle,
          issueDescription: validated.issueDescription,
          technician: validated.technician,
          serviceProvider: validated.serviceProvider,
          repairCost: validated.repairCost || 0.0,
          remarks: validated.remarks,
          repairStatus: MaintenanceStatus.REPORTED,
        },
      });

      await tx.asset.update({
        where: { id: validated.assetId },
        data: { status: AssetStatus.UNDER_REPAIR },
      });

      await HistoryService.recordEvent(tx, {
        assetId: validated.assetId,
        action: AssetAction.MAINTENANCE_STARTED,
        previousStatus: asset.status,
        newStatus: AssetStatus.UNDER_REPAIR,
        previousHolderId: asset.currentHolderId,
        previousHolderName: asset.employeeNameSource || 'IT STOCK',
        performedById: userId,
        eventDate: new Date(),
        reason: validated.issueTitle,
        remarks: `${validated.issueDescription || ''} (Technician: ${validated.technician || 'N/A'}, Cost: ₹${validated.repairCost || 0})`,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'MAINTENANCE_CREATE',
          entityType: 'MaintenanceRecord',
          entityId: maintenance.id,
          newValue: JSON.stringify({ issueTitle: validated.issueTitle }),
        },
      });

      return maintenance;
    });
  }
}


