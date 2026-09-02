import prisma from '../config/prisma';
import { AssetStatus, AssetCondition, WorkflowStatus, MaintenanceStatus, AssetAction, AllocationStatus, DataQualityStatus, AssetType, Prisma } from '@prisma/client';
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
import { TransferService } from './transfer.service';
import { ReturnService } from './return.service';

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

  // Automated Data Quality Evaluator based on live asset fields
  public static evaluateDataQuality(
    assetData: {
      companyAssetId?: string | null;
      assetCode?: string | null;
      assetName?: string | null;
      model?: string | null;
      assetType?: string | null;
      status?: string | null;
      allocationStatus?: string | null;
      currentHolderId?: string | null;
      employeeNameSource?: string | null;
      holderDisplayName?: string | null;
      serialNumber?: string | null;
      cpu?: string | null;
      ram?: string | null;
      lanIp?: string | null;
      location?: string | null;
      departmentId?: string | null;
    },
    specifications?: any
  ): { status: DataQualityStatus; issues: string[] } {
    const issues: string[] = [];

    const assetId = assetData.companyAssetId || assetData.assetCode;
    const name = assetData.assetName || assetData.model;
    const isAllocated =
      assetData.allocationStatus === 'ALLOCATED' ||
      assetData.status === 'ASSIGNED' ||
      assetData.status === 'IN_USE';
    const holder = assetData.currentHolderId || assetData.employeeNameSource || assetData.holderDisplayName;

    // Critical issues -> NEEDS_REVIEW
    if (!assetId || !assetId.trim()) issues.push('Missing Asset ID');
    if (!name || !name.trim()) issues.push('Missing Asset Name');
    if (isAllocated && (!holder || !holder.trim())) {
      issues.push('Allocated without assigned employee');
    }

    // Warnings -> WARNING
    if (!assetData.serialNumber || !assetData.serialNumber.trim()) {
      issues.push('Missing Serial Number');
    }

    const isComputeDevice =
      !assetData.assetType ||
      ['LAPTOP', 'DESKTOP', 'WORKSTATION', 'SERVER'].includes(String(assetData.assetType).toUpperCase());

    const cpu = assetData.cpu || specifications?.processor;
    const ram = assetData.ram || specifications?.ram;
    const lanIp = assetData.lanIp || specifications?.ipAddress;

    if (isComputeDevice && (!cpu || !cpu.trim())) {
      issues.push('Missing CPU');
    }
    if (isComputeDevice && (!ram || !ram.trim())) {
      issues.push('Missing RAM');
    }
    if (isComputeDevice && (!lanIp || !lanIp.trim())) {
      issues.push('Missing LAN IP');
    }
    if (!assetData.location && !assetData.departmentId) {
      issues.push('Missing Location or Department');
    }

    let status: DataQualityStatus = DataQualityStatus.CLEAN;
    const hasCritical =
      !assetId ||
      !name ||
      (isAllocated && (!holder || !holder.trim()));

    if (hasCritical) {
      status = DataQualityStatus.NEEDS_REVIEW;
    } else if (issues.length > 0) {
      status = DataQualityStatus.WARNING;
    }

    return { status, issues };
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
    location?: string;
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

    // Dynamic Department / Area filter
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

    // Dynamic Location filter
    if (query.location && query.location.trim()) {
      const loc = query.location.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { location: { equals: loc, mode: 'insensitive' } },
            { locationRel: { name: { equals: loc, mode: 'insensitive' } } },
            { locationId: loc },
          ],
        },
      ];
    }

    // Comprehensive Server-backed Search
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const sNormalized = s.replace(/\s+/g, '');
      const isEnumAssetType = Object.values(AssetType).includes(s.toUpperCase() as any);

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
        { ram: { contains: s, mode: 'insensitive' } },
        { lanIp: { contains: s, mode: 'insensitive' } },
        { lanMacAddress: { contains: s, mode: 'insensitive' } },
        { sourceAssetType: { contains: s, mode: 'insensitive' } },
        { specifications: { processor: { contains: s, mode: 'insensitive' } } },
        { specifications: { ram: { contains: s, mode: 'insensitive' } } },
        { specifications: { ipAddress: { contains: s, mode: 'insensitive' } } },
        ...(isEnumAssetType ? [{ assetType: s.toUpperCase() as AssetType }] : []),
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
        case 'allocation':
          orderBy = { allocationStatus: order };
          break;
        case 'criticality':
          orderBy = { criticality: { sort: order, nulls: 'last' } };
          break;
        case 'location':
          orderBy = { location: { sort: order, nulls: 'last' } };
          break;
        case 'department':
          orderBy = { department: { name: order } };
          break;
        case 'employeeName':
        case 'employeeNameSource':
        case 'holder':
        case 'currentHolder':
          orderBy = { employeeNameSource: { sort: order, nulls: 'last' } };
          break;
        case 'cpu':
          orderBy = { cpu: { sort: order, nulls: 'last' } };
          break;
        case 'ram':
          orderBy = { ram: { sort: order, nulls: 'last' } };
          break;
        case 'lanIp':
          orderBy = { lanIp: { sort: order, nulls: 'last' } };
          break;
        case 'serialNumber':
          orderBy = { serialNumber: { sort: order, nulls: 'last' } };
          break;
        case 'dataQuality':
        case 'dataQualityStatus':
          orderBy = { dataQualityStatus: { sort: order, nulls: 'last' } };
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

  // Dynamic distinct locations from actual database records
  static async getDistinctLocations(): Promise<string[]> {
    const [locations, orgLocations] = await Promise.all([
      prisma.asset.findMany({
        select: { location: true },
        distinct: ['location'],
      }),
      prisma.location.findMany({
        select: { name: true },
      }),
    ]);

    const set = new Set<string>();
    locations.forEach((l) => {
      if (l.location && l.location.trim()) set.add(l.location.trim());
    });
    orgLocations.forEach((ol) => {
      if (ol.name && ol.name.trim()) set.add(ol.name.trim());
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  // Live Inventory Telemetry directly from PostgreSQL
  static async getInventoryCounts() {
    const [total, active, allocated, available, underRepair, dataQualityAlerts] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({
        where: {
          OR: [
            { sourceAssetStatus: { equals: 'Active', mode: 'insensitive' } },
            { status: { in: [AssetStatus.IN_USE, AssetStatus.ASSIGNED, AssetStatus.AVAILABLE] } },
          ],
        },
      }),
      prisma.asset.count({
        where: {
          OR: [
            { allocationStatus: AllocationStatus.ALLOCATED },
            { sourceAllocationStatus: { equals: 'Allocated', mode: 'insensitive' } },
          ],
        },
      }),
      prisma.asset.count({
        where: {
          AND: [
            { status: AssetStatus.AVAILABLE },
            { allocationStatus: AllocationStatus.NOT_ALLOCATED },
          ],
        },
      }),
      prisma.asset.count({
        where: { status: AssetStatus.UNDER_REPAIR },
      }),
      prisma.asset.count({
        where: {
          dataQualityStatus: { in: [DataQualityStatus.WARNING, DataQualityStatus.NEEDS_REVIEW] },
        },
      }),
    ]);

    return {
      total,
      active,
      allocated,
      available,
      underRepair,
      dataQualityAlerts,
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
    const quality = AssetService.evaluateDataQuality({ ...assetData, companyAssetId, assetCode }, specifications);

    const newAsset = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          ...assetData,
          companyAssetId,
          assetCode,
          sourceAssetId: companyAssetId,
          dataQualityStatus: quality.status,
          dataQualityIssues: JSON.stringify(quality.issues),
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

    const updatedQuality = AssetService.evaluateDataQuality(
      { ...existing, ...assetData, companyAssetId: existing.companyAssetId, assetCode: existing.assetCode },
      specifications || existing.specifications
    );

    const updated = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id },
        data: {
          ...assetData,
          dataQualityStatus: updatedQuality.status,
          dataQualityIssues: JSON.stringify(updatedQuality.issues),
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
        changedFields.push(`${key.toUpperCase()}: ${oldHardware[key] || 'None'} -> ${newHardware[key] || 'None'}`);
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
          action: AssetAction.HARDWARE_CHANGED,
          previousStatus: existing.status,
          newStatus: existing.status,
          previousCondition: existing.condition,
          newCondition: existing.condition,
          performedById: userId,
          relatedEntityType: 'Hardware',
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

  // Explicit safe deactivation/retirement without destroying historical references
  static async deactivateAsset(id: string, userId: string) {
    const existing = await prisma.asset.findUnique({
      where: { id },
      include: {
        currentHolder: true,
        department: true,
      },
    });

    if (!existing) throw new Error('Asset not found');

    return await prisma.$transaction(async (tx) => {
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

      await HistoryService.recordEvent(tx, {
        assetId: id,
        action: AssetAction.ASSET_DEACTIVATED,
        previousStatus: existing.status,
        newStatus: AssetStatus.RETIRED,
        performedById: userId,
        relatedEntityType: 'Asset',
        remarks: 'Asset safely retired and deactivated from active inventory.',
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_DEACTIVATE',
          entityType: 'Asset',
          entityId: id,
          oldValue: JSON.stringify({
            status: existing.status,
            allocationStatus: existing.allocationStatus,
            holder: existing.currentHolder?.fullName || existing.employeeNameSource,
          }),
          newValue: JSON.stringify({
            status: AssetStatus.RETIRED,
            allocationStatus: AllocationStatus.NOT_ALLOCATED,
          }),
        },
      });

      return {
        id,
        action: 'DEACTIVATED',
        asset: updated,
        message: `Asset ${existing.companyAssetId || existing.assetCode} has been safely retired from active inventory.`,
      };
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
    if (!employee) throw new Error('Employee not found.');
    if (employee.status !== 'ACTIVE') {
      throw new Error('This employee is not eligible for new asset assignment.');
    }

    if (employee.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: employee.departmentId } });
      if (!dept || !dept.isActive) throw new Error('Cannot assign asset to an inactive department.');
    }
    if (employee.locationId) {
      const loc = await prisma.location.findUnique({ where: { id: employee.locationId } });
      if (!loc || !loc.isActive) throw new Error('Cannot assign asset to an inactive location.');
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
    return await TransferService.createTransfer({ ...(data as any), assetId }, userId);
  }

  static async returnAsset(assetId: string, data: unknown, userId: string) {
    return await ReturnService.createReturn({ ...(data as any), assetId }, userId);
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


