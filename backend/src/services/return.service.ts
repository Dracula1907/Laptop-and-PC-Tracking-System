import prisma from '../config/prisma';
import {
  AssetStatus,
  AssetCondition,
  WorkflowStatus,
  MaintenanceStatus,
  AssetAction,
  AllocationStatus,
  Prisma,
} from '@prisma/client';
import {
  AssetReturnSchema,
  AssetReturnReceiveSchema,
  AssetReturnInspectSchema,
  AssetReturnCompleteSchema,
  AssetReturnCancelSchema,
  AssetReturnUpdateSchema,
} from '../validators/schemas';
import { HistoryService } from './history.service';

export class ReturnService {
  /**
   * Helper: Generate Sequential Return Code (RET-000001)
   */
  private static async generateReturnCode(): Promise<string> {
    const returnRecords = await prisma.assetReturn.findMany({
      where: { returnCode: { startsWith: 'RET-' } },
      select: { returnCode: true },
    });

    let maxNum = 0;
    for (const r of returnRecords) {
      if (r.returnCode) {
        const match = r.returnCode.match(/^RET-(\d+)$/);
        if (match) {
          const val = parseInt(match[1], 10);
          if (val > maxNum) maxNum = val;
        }
      }
    }
    return `RET-${String(maxNum + 1).padStart(6, '0')}`;
  }

  /**
   * Fetch Returns with Search, Combined Filters, and Server-Side Pagination
   */
  static async getReturns(query: any) {
    const page = Math.max(1, parseInt(query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(10000, parseInt(query.limit as string, 10) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AssetReturnWhereInput = {};

    // Workflow status filter
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as WorkflowStatus;
    }

    // Asset type filter
    if (query.assetType) {
      where.asset = {
        ...((where.asset as Prisma.AssetWhereInput) || {}),
        assetType: query.assetType,
      };
    }

    // Employee filter
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    // Department filter
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    // Location filter
    if (query.locationId) {
      where.locationId = query.locationId;
    }

    // Reason filter
    if (query.returnReason) {
      where.returnReason = { equals: query.returnReason, mode: 'insensitive' };
    }

    // Condition filter
    if (query.condition && query.condition !== 'ALL') {
      where.conditionAtReturn = query.condition as AssetCondition;
    }

    // Inspection Result filter
    if (query.inspectionResult) {
      where.inspectionResult = query.inspectionResult;
    }

    // Maintenance Required filter
    if (query.maintenanceRequired !== undefined && query.maintenanceRequired !== '') {
      where.maintenanceRequired = query.maintenanceRequired === 'true';
    }

    // Disposition filter
    if (query.disposition) {
      where.disposition = query.disposition;
    }

    // Date range filter
    if (query.startDate || query.endDate) {
      where.returnDate = {};
      if (query.startDate) where.returnDate.gte = new Date(query.startDate);
      if (query.endDate) where.returnDate.lte = new Date(query.endDate);
    }

    // Global Search across 10 fields
    if (query.search && query.search.trim() !== '') {
      const s = query.search.trim();
      where.OR = [
        { returnCode: { contains: s, mode: 'insensitive' } },
        { returnReason: { contains: s, mode: 'insensitive' } },
        { damageDescription: { contains: s, mode: 'insensitive' } },
        { missingAccessories: { contains: s, mode: 'insensitive' } },
        { disposition: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } },
        {
          asset: {
            OR: [
              { companyAssetId: { contains: s, mode: 'insensitive' } },
              { assetCode: { contains: s, mode: 'insensitive' } },
              { assetName: { contains: s, mode: 'insensitive' } },
              { model: { contains: s, mode: 'insensitive' } },
              { serialNumber: { contains: s, mode: 'insensitive' } },
            ],
          },
        },
        {
          employee: {
            OR: [
              { fullName: { contains: s, mode: 'insensitive' } },
              { employeeCode: { contains: s, mode: 'insensitive' } },
            ],
          },
        },
        { department: { name: { contains: s, mode: 'insensitive' } } },
        { location: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    let orderBy: Prisma.AssetReturnOrderByWithRelationInput = { returnDate: 'desc' };
    if (query.sortBy) {
      const order = query.sortOrder === 'asc' ? 'asc' : 'desc';
      if (query.sortBy === 'returnCode') orderBy = { returnCode: order };
      else if (query.sortBy === 'returnDate') orderBy = { returnDate: order };
      else if (query.sortBy === 'status') orderBy = { status: order };
      else if (query.sortBy === 'condition') orderBy = { conditionAtReturn: order };
      else if (query.sortBy === 'assetId') orderBy = { asset: { companyAssetId: order } };
    }

    const [total, returns] = await Promise.all([
      prisma.assetReturn.count({ where }),
      prisma.assetReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          asset: {
            include: {
              department: true,
              locationRel: true,
            },
          },
          employee: {
            include: { department: true, location: true },
          },
          department: true,
          location: true,
          receivedBy: { select: { id: true, username: true } },
          inspectedBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          maintenance: { select: { id: true, issueTitle: true, repairStatus: true } },
          assignment: { select: { id: true, assignmentCode: true, assignedAt: true } },
        },
      }),
    ]);

    const formatted = returns.map((r) => ({
      id: r.id,
      returnCode: r.returnCode || `RET-${r.id.slice(0, 8)}`,
      assetId: r.assetId,
      assetCode: r.asset.companyAssetId || r.asset.assetCode,
      assetName: r.asset.assetName || r.asset.model,
      serialNumber: r.asset.serialNumber || '—',
      assetType: r.asset.sourceAssetType || r.asset.assetType,
      manufacturer: r.asset.manufacturer,
      model: r.asset.model,
      employeeId: r.employeeId,
      employeeName: r.employee?.fullName || 'IT STOCK',
      employeeCode: r.employee?.employeeCode || '—',
      departmentId: r.departmentId || r.employee?.departmentId || r.asset.departmentId,
      departmentName: r.department?.name || r.employee?.department?.name || r.asset.department?.name || 'IT STOCK',
      locationId: r.locationId || r.asset.locationId,
      locationName: r.location?.name || r.asset.locationRel?.name || r.asset.location || 'HQ',
      returnDate: r.returnDate,
      returnReason: r.returnReason || r.remarks || 'Standard asset return handover',
      conditionAtReturn: r.conditionAtReturn,
      accessoriesReturned: r.accessoriesReturned,
      damageReported: r.damageReported,
      damageCategory: r.damageCategory,
      damageDescription: r.damageDescription || 'None',
      missingAccessories: r.missingAccessories || 'None',
      accessoriesChecklist: r.accessoriesChecklist,
      dataWipeStatus: r.dataWipeStatus || 'NOT_REQUIRED',
      inspectionRequired: r.inspectionRequired,
      inspectionResult: r.inspectionResult || (r.status === WorkflowStatus.COMPLETED ? 'PASS' : 'PENDING'),
      inspectedById: r.inspectedById,
      inspectedByName: r.inspectedBy?.username || null,
      inspectedAt: r.inspectedAt,
      inspectionRemarks: r.inspectionRemarks,
      maintenanceRequired: r.maintenanceRequired,
      maintenanceId: r.maintenanceId,
      maintenanceInfo: r.maintenance,
      disposition: r.disposition || (r.status === WorkflowStatus.COMPLETED ? 'AVAILABLE' : 'PENDING REVIEW'),
      receivedById: r.receivedById,
      receivedByName: r.receivedBy?.username || 'admin',
      approvedById: r.approvedById,
      approvedByName: r.approvedBy?.username || null,
      assignmentId: r.assignmentId,
      assignmentInfo: r.assignment,
      remarks: r.remarks || '—',
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    return {
      returns: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Real-time aggregate counters directly from PostgreSQL
   */
  static async getReturnCounts() {
    const [all, pending, received, inspected, completed, cancelled] = await Promise.all([
      prisma.assetReturn.count(),
      prisma.assetReturn.count({ where: { status: WorkflowStatus.PENDING } }),
      prisma.assetReturn.count({ where: { status: WorkflowStatus.RECEIVED } }),
      prisma.assetReturn.count({ where: { status: WorkflowStatus.INSPECTED } }),
      prisma.assetReturn.count({ where: { status: WorkflowStatus.COMPLETED } }),
      prisma.assetReturn.count({ where: { status: WorkflowStatus.CANCELLED } }),
    ]);

    return {
      all,
      pending,
      received,
      inspected,
      completed,
      cancelled,
    };
  }

  /**
   * Return dropdown options with full CURRENT ASSET STATE preview
   */
  static async getOptions() {
    const [assets, employees, departments, locations, users] = await Promise.all([
      prisma.asset.findMany({
        select: {
          id: true,
          companyAssetId: true,
          assetCode: true,
          assetName: true,
          model: true,
          manufacturer: true,
          serialNumber: true,
          assetType: true,
          currentHolderId: true,
          departmentId: true,
          locationId: true,
          location: true,
          condition: true,
          status: true,
          allocationStatus: true,
          currentHolder: {
            select: { id: true, fullName: true, employeeCode: true, departmentId: true, locationId: true },
          },
          department: { select: { id: true, name: true } },
          locationRel: { select: { id: true, name: true } },
          assignments: {
            where: { status: WorkflowStatus.ACTIVE },
            select: { id: true, assignmentCode: true, assignedAt: true, employeeId: true },
            take: 1,
          },
        },
        orderBy: { companyAssetId: 'asc' },
      }),
      prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          departmentId: true,
          locationId: true,
          department: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
      prisma.location.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        select: { id: true, username: true, role: { select: { name: true } } },
        orderBy: { username: 'asc' },
      }),
    ]);

    return {
      assets,
      employees,
      departments,
      locations,
      users,
    };
  }

  /**
   * Get single Return details by ID or code
   */
  static async getReturnById(id: string) {
    const r = await prisma.assetReturn.findFirst({
      where: { OR: [{ id }, { returnCode: id }] },
      include: {
        asset: {
          include: {
            department: true,
            locationRel: true,
          },
        },
        employee: {
          include: { department: true, location: true },
        },
        department: true,
        location: true,
        receivedBy: { select: { id: true, username: true } },
        inspectedBy: { select: { id: true, username: true } },
        approvedBy: { select: { id: true, username: true } },
        maintenance: {
          include: {
            parts: true,
            reportedBy: { select: { username: true } },
          },
        },
        assignment: { select: { id: true, assignmentCode: true, assignedAt: true } },
      },
    });

    if (!r) throw new Error('Asset return record not found.');

    const historyEvents = await prisma.assetStatusHistory.findMany({
      where: { assetId: r.assetId },
      orderBy: { eventDate: 'desc' },
      take: 10,
    });

    return {
      id: r.id,
      returnCode: r.returnCode || `RET-${r.id.slice(0, 8)}`,
      assetId: r.assetId,
      assetCode: r.asset.companyAssetId || r.asset.assetCode,
      assetName: r.asset.assetName || r.asset.model,
      serialNumber: r.asset.serialNumber || '—',
      assetType: r.asset.sourceAssetType || r.asset.assetType,
      manufacturer: r.asset.manufacturer,
      model: r.asset.model,
      employeeId: r.employeeId,
      employeeName: r.employee?.fullName || 'IT STOCK',
      employeeCode: r.employee?.employeeCode || '—',
      departmentId: r.departmentId || r.employee?.departmentId || r.asset.departmentId,
      departmentName: r.department?.name || r.employee?.department?.name || r.asset.department?.name || 'IT STOCK',
      locationId: r.locationId || r.asset.locationId,
      locationName: r.location?.name || r.asset.locationRel?.name || r.asset.location || 'HQ',
      returnDate: r.returnDate,
      returnReason: r.returnReason || r.remarks || 'Standard asset return handover',
      conditionAtReturn: r.conditionAtReturn,
      accessoriesReturned: r.accessoriesReturned,
      damageReported: r.damageReported,
      damageCategory: r.damageCategory,
      damageDescription: r.damageDescription || 'None',
      missingAccessories: r.missingAccessories || 'None',
      accessoriesChecklist: r.accessoriesChecklist,
      dataWipeStatus: r.dataWipeStatus || 'NOT_REQUIRED',
      inspectionRequired: r.inspectionRequired,
      inspectionResult: r.inspectionResult || (r.status === WorkflowStatus.COMPLETED ? 'PASS' : 'PENDING'),
      inspectedById: r.inspectedById,
      inspectedByName: r.inspectedBy?.username || null,
      inspectedAt: r.inspectedAt,
      inspectionRemarks: r.inspectionRemarks,
      maintenanceRequired: r.maintenanceRequired,
      maintenanceId: r.maintenanceId,
      maintenanceInfo: r.maintenance,
      disposition: r.disposition || (r.status === WorkflowStatus.COMPLETED ? 'AVAILABLE' : 'PENDING REVIEW'),
      receivedById: r.receivedById,
      receivedByName: r.receivedBy?.username || 'admin',
      approvedById: r.approvedById,
      approvedByName: r.approvedBy?.username || null,
      assignmentId: r.assignmentId,
      assignmentInfo: r.assignment,
      remarks: r.remarks || '—',
      status: r.status,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      historyEvents,
    };
  }

  /**
   * Create New Return (Initiation or Immediate Completion)
   */
  static async createReturn(data: unknown, userId: string) {
    const validated = AssetReturnSchema.parse(data);

    // 1. Fetch Asset
    const asset = await prisma.asset.findUnique({
      where: { id: validated.assetId },
      include: { currentHolder: true, department: true, locationRel: true },
    });

    if (!asset) throw new Error('Asset not found.');

    // 2. Concurrency Conflict Protection
    if (validated.expectedSourceState) {
      const exp = validated.expectedSourceState;
      const holderMismatch = exp.holderId !== undefined && (asset.currentHolderId || null) !== (exp.holderId || null);
      const deptMismatch = exp.departmentId !== undefined && (asset.departmentId || null) !== (exp.departmentId || null);
      const locMismatch = exp.locationId !== undefined && (asset.locationId || null) !== (exp.locationId || null);

      if (holderMismatch || deptMismatch || locMismatch) {
        throw new Error('This asset has changed since you opened this return. Refresh the asset and try again.');
      }
    }

    // 3. Conflicting Transfer Protection
    const pendingTransfer = await prisma.assetTransfer.findFirst({
      where: { assetId: asset.id, status: WorkflowStatus.PENDING },
    });
    if (pendingTransfer) {
      throw new Error(
        `This asset is currently in a pending transfer workflow (${pendingTransfer.transferCode || pendingTransfer.id}). Resolve or cancel the transfer before initiating a return.`
      );
    }

    const returnCode = await ReturnService.generateReturnCode();
    const returnDate = validated.returnDate || new Date();
    const returningEmployeeId = validated.employeeId || asset.currentHolderId || null;
    const targetDeptId = validated.departmentId || asset.departmentId || null;
    const targetLocId = validated.locationId || asset.locationId || null;

    // 4. Locate Active Assignment if exists
    const activeAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: asset.id,
        status: WorkflowStatus.ACTIVE,
      },
    });

    // 5. Atomic Execution
    return await prisma.$transaction(async (tx) => {
      let createdMaintenanceId: string | null = null;

      // If maintenance required & immediately completing, create MaintenanceRecord
      if (validated.maintenanceRequired && validated.status === WorkflowStatus.COMPLETED) {
        const mRecord = await tx.maintenanceRecord.create({
          data: {
            assetId: asset.id,
            reportedById: userId,
            issueTitle: `Maintenance Required on Return (${returnCode})`,
            issueDescription: validated.damageDescription || validated.returnReason || 'Hardware damage/fault detected on return',
            repairStatus: MaintenanceStatus.REPORTED,
            remarks: validated.remarks,
          },
        });
        createdMaintenanceId = mRecord.id;
      }

      // Determine initial disposition
      const defaultDisposition = validated.disposition || (validated.maintenanceRequired ? 'MAINTENANCE' : 'AVAILABLE');

      // Create AssetReturn record
      const returnRec = await tx.assetReturn.create({
        data: {
          returnCode,
          assetId: asset.id,
          assignmentId: activeAssignment?.id || validated.assignmentId || null,
          employeeId: returningEmployeeId,
          departmentId: targetDeptId,
          locationId: targetLocId,
          receivedById: userId,
          returnDate,
          returnReason: validated.returnReason || 'ROUTINE RETURN',
          conditionAtReturn: validated.conditionAtReturn,
          accessoriesReturned: validated.accessoriesReturned,
          damageReported: validated.damageReported,
          damageCategory: validated.damageCategory || null,
          damageDescription: validated.damageDescription || null,
          missingAccessories: validated.missingAccessories || null,
          accessoriesChecklist: (validated.accessoriesChecklist as any) || {
            charger: validated.accessoriesReturned ? 'PRESENT' : 'MISSING',
            monitor: 'NOT_APPLICABLE',
            keyboard: 'NOT_APPLICABLE',
            mouse: 'NOT_APPLICABLE',
            otherHardware: 'NOT_APPLICABLE',
          },
          dataWipeStatus: validated.dataWipeStatus || 'NOT_REQUIRED',
          inspectionRequired: validated.inspectionRequired,
          inspectionResult: validated.inspectionResult || (validated.status === WorkflowStatus.COMPLETED ? 'PASS' : null),
          inspectedById: validated.status === WorkflowStatus.COMPLETED ? userId : null,
          inspectedAt: validated.status === WorkflowStatus.COMPLETED ? returnDate : null,
          inspectionRemarks: validated.status === WorkflowStatus.COMPLETED ? 'Immediate return completion' : null,
          maintenanceRequired: validated.maintenanceRequired,
          maintenanceId: createdMaintenanceId,
          disposition: defaultDisposition,
          approvedById: validated.approvedById || null,
          remarks: validated.remarks,
          status: validated.status,
        },
      });

      // If status is COMPLETED, apply asset and assignment changes immediately
      if (validated.status === WorkflowStatus.COMPLETED) {
        // Close active assignment
        if (activeAssignment) {
          await tx.assetAssignment.update({
            where: { id: activeAssignment.id },
            data: {
              status: WorkflowStatus.RETURNED,
              actualReturnDate: returnDate,
              conditionAtReturn: validated.conditionAtReturn,
            },
          });
        }

        // Update Asset State
        const nextAssetStatus = validated.maintenanceRequired
          ? AssetStatus.UNDER_REPAIR
          : defaultDisposition === 'RETIRED'
          ? AssetStatus.RETIRED
          : AssetStatus.AVAILABLE;

        await tx.asset.update({
          where: { id: asset.id },
          data: {
            allocationStatus: AllocationStatus.NOT_ALLOCATED,
            sourceAllocationStatus: 'Not Allocated',
            currentHolderId: null,
            employeeNameSource: null,
            locationId: targetLocId,
            condition: validated.conditionAtReturn,
            status: nextAssetStatus,
            dateOfDeallocation: returnDate,
          },
        });

        // Record Immutable Asset History
        const prevHolder = returningEmployeeId ? await tx.employee.findUnique({ where: { id: returningEmployeeId } }) : null;
        const prevDept = asset.departmentId ? await tx.department.findUnique({ where: { id: asset.departmentId } }) : null;
        const targetLoc = targetLocId ? await tx.location.findUnique({ where: { id: targetLocId } }) : null;

        await HistoryService.recordEvent(tx, {
          assetId: asset.id,
          action: validated.maintenanceRequired ? AssetAction.MAINTENANCE_STARTED : AssetAction.RETURNED,
          previousStatus: asset.status,
          newStatus: nextAssetStatus,
          previousHolderId: returningEmployeeId,
          previousHolderName: prevHolder?.fullName || asset.employeeNameSource || 'Employee',
          newHolderName: 'IT STOCK',
          previousDepartmentId: asset.departmentId,
          previousDepartmentName: prevDept?.name || asset.location,
          newDepartmentName: 'IT STOCK',
          previousLocationId: asset.locationId,
          previousLocationName: asset.locationRel?.name || asset.location,
          newLocationId: targetLocId,
          newLocationName: targetLoc?.name || 'IT STOCK',
          previousCondition: asset.condition,
          newCondition: validated.conditionAtReturn,
          performedById: userId,
          eventDate: returnDate,
          reason: validated.returnReason || 'Asset Return',
          remarks: `Asset returned (${returnCode}). Condition: ${validated.conditionAtReturn}. Disposition: ${defaultDisposition}`,
        });

        // Record Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'ASSET_RETURN_COMPLETE',
            entityType: 'AssetReturn',
            entityId: returnRec.id,
            oldValue: JSON.stringify({ currentHolderId: asset.currentHolderId, allocationStatus: asset.allocationStatus }),
            newValue: JSON.stringify({ currentHolderId: null, allocationStatus: AllocationStatus.NOT_ALLOCATED, status: nextAssetStatus }),
          },
        });
      } else {
        // Record Pending Return Audit Log
        await tx.auditLog.create({
          data: {
            userId,
            action: 'ASSET_RETURN_INITIATE',
            entityType: 'AssetReturn',
            entityId: returnRec.id,
            newValue: JSON.stringify({ returnCode, assetId: asset.id, status: WorkflowStatus.PENDING }),
          },
        });
      }

      return returnRec;
    });
  }

  /**
   * Receive Return: Physical Receipt Confirmation (Advances PENDING -> RECEIVED)
   */
  static async receiveReturn(id: string, data: unknown, userId: string) {
    const ret = await prisma.assetReturn.findUnique({ where: { id } });
    if (!ret) throw new Error('Return record not found.');

    if (ret.status !== WorkflowStatus.PENDING) {
      throw new Error(`Only pending returns can be received. Current status is ${ret.status}.`);
    }

    const validated = AssetReturnReceiveSchema.parse(data);

    const updated = await prisma.assetReturn.update({
      where: { id },
      data: {
        status: WorkflowStatus.RECEIVED,
        receivedById: userId,
        locationId: validated.locationId || ret.locationId,
        remarks: validated.remarks ? (ret.remarks ? `${ret.remarks} | Received: ${validated.remarks}` : validated.remarks) : ret.remarks,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ASSET_RETURN_RECEIVE',
        entityType: 'AssetReturn',
        entityId: id,
        oldValue: JSON.stringify({ status: WorkflowStatus.PENDING }),
        newValue: JSON.stringify({ status: WorkflowStatus.RECEIVED, receivedById: userId }),
      },
    });

    return updated;
  }

  /**
   * Inspect Return: Physical Diagnostic & Checklist (Advances RECEIVED -> INSPECTED)
   */
  static async inspectReturn(id: string, data: unknown, userId: string) {
    const ret = await prisma.assetReturn.findUnique({ where: { id } });
    if (!ret) throw new Error('Return record not found.');

    if (ret.status !== WorkflowStatus.RECEIVED && ret.status !== WorkflowStatus.PENDING) {
      throw new Error(`Cannot perform inspection on a return with status ${ret.status}.`);
    }

    const validated = AssetReturnInspectSchema.parse(data);

    const updated = await prisma.assetReturn.update({
      where: { id },
      data: {
        status: WorkflowStatus.INSPECTED,
        conditionAtReturn: validated.conditionAtReturn || ret.conditionAtReturn,
        inspectionResult: validated.inspectionResult,
        damageReported: validated.damageReported !== undefined ? validated.damageReported : ret.damageReported,
        damageCategory: validated.damageCategory !== undefined ? validated.damageCategory : ret.damageCategory,
        damageDescription: validated.damageDescription !== undefined ? validated.damageDescription : ret.damageDescription,
        accessoriesChecklist: (validated.accessoriesChecklist as any) || ret.accessoriesChecklist,
        missingAccessories: validated.missingAccessories !== undefined ? validated.missingAccessories : ret.missingAccessories,
        dataWipeStatus: validated.dataWipeStatus || ret.dataWipeStatus,
        maintenanceRequired: validated.maintenanceRequired !== undefined ? validated.maintenanceRequired : ret.maintenanceRequired,
        disposition: validated.disposition || ret.disposition || 'AVAILABLE',
        inspectedById: userId,
        inspectedAt: new Date(),
        inspectionRemarks: validated.inspectionRemarks || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ASSET_RETURN_INSPECT',
        entityType: 'AssetReturn',
        entityId: id,
        oldValue: JSON.stringify({ status: ret.status, condition: ret.conditionAtReturn }),
        newValue: JSON.stringify({
          status: WorkflowStatus.INSPECTED,
          inspectionResult: validated.inspectionResult,
          condition: validated.conditionAtReturn,
          maintenanceRequired: validated.maintenanceRequired,
        }),
      },
    });

    return updated;
  }

  /**
   * Complete Return: Finalize Workflow & Synchronize Asset/Assignment State
   */
  static async completeReturn(id: string, data: unknown, userId: string) {
    const ret = await prisma.assetReturn.findUnique({
      where: { id },
      include: { asset: { include: { locationRel: true } }, employee: true },
    });
    if (!ret) throw new Error('Return record not found.');

    if (ret.status === WorkflowStatus.COMPLETED) {
      throw new Error('This return is already completed.');
    }
    if (ret.status === WorkflowStatus.CANCELLED) {
      throw new Error('Cancelled returns cannot be completed.');
    }

    const validated = AssetReturnCompleteSchema.parse(data);
    const asset = ret.asset;
    const returnDate = new Date();
    const finalDisposition = validated.disposition || ret.disposition || 'AVAILABLE';
    const maintenanceRequired = validated.maintenanceRequired !== undefined ? validated.maintenanceRequired : ret.maintenanceRequired;
    const finalCondition = validated.conditionAtReturn || ret.conditionAtReturn;
    const targetLocId = validated.locationId || ret.locationId || asset.locationId;

    return await prisma.$transaction(async (tx) => {
      // 1. Create Maintenance Record if flagged and not already created
      let maintenanceId = ret.maintenanceId;
      if (maintenanceRequired && !maintenanceId) {
        const mRecord = await tx.maintenanceRecord.create({
          data: {
            assetId: asset.id,
            reportedById: userId,
            issueTitle: `Maintenance Required on Return (${ret.returnCode || ret.id})`,
            issueDescription: ret.damageDescription || ret.returnReason || 'Hardware damage/fault detected on return',
            repairStatus: MaintenanceStatus.REPORTED,
            remarks: validated.remarks || ret.remarks,
          },
        });
        maintenanceId = mRecord.id;
      }

      // 2. Update Return record
      const updatedReturn = await tx.assetReturn.update({
        where: { id },
        data: {
          status: WorkflowStatus.COMPLETED,
          disposition: finalDisposition,
          maintenanceRequired,
          maintenanceId,
          conditionAtReturn: finalCondition,
          locationId: targetLocId,
          approvedById: validated.approvedById || userId,
          remarks: validated.remarks ? (ret.remarks ? `${ret.remarks} | ${validated.remarks}` : validated.remarks) : ret.remarks,
        },
      });

      // 3. Close Active Assignment
      await tx.assetAssignment.updateMany({
        where: {
          assetId: asset.id,
          status: WorkflowStatus.ACTIVE,
        },
        data: {
          status: WorkflowStatus.RETURNED,
          actualReturnDate: returnDate,
          conditionAtReturn: finalCondition,
        },
      });

      // 4. Update Asset Allocation & Custody
      const nextAssetStatus = maintenanceRequired
        ? AssetStatus.UNDER_REPAIR
        : finalDisposition === 'RETIRED'
        ? AssetStatus.RETIRED
        : AssetStatus.AVAILABLE;

      await tx.asset.update({
        where: { id: asset.id },
        data: {
          allocationStatus: AllocationStatus.NOT_ALLOCATED,
          sourceAllocationStatus: 'Not Allocated',
          currentHolderId: null,
          employeeNameSource: null,
          locationId: targetLocId,
          condition: finalCondition,
          status: nextAssetStatus,
          dateOfDeallocation: returnDate,
        },
      });

      // 5. Record Immutable Asset History
      const prevHolder = ret.employeeId ? await tx.employee.findUnique({ where: { id: ret.employeeId } }) : null;
      const prevDept = asset.departmentId ? await tx.department.findUnique({ where: { id: asset.departmentId } }) : null;
      const targetLoc = targetLocId ? await tx.location.findUnique({ where: { id: targetLocId } }) : null;

      await HistoryService.recordEvent(tx, {
        assetId: asset.id,
        action: maintenanceRequired ? AssetAction.MAINTENANCE_STARTED : AssetAction.RETURNED,
        previousStatus: asset.status,
        newStatus: nextAssetStatus,
        previousHolderId: ret.employeeId,
        previousHolderName: prevHolder?.fullName || 'Employee',
        newHolderName: 'IT STOCK',
        previousDepartmentId: asset.departmentId,
        previousDepartmentName: prevDept?.name || asset.location,
        newDepartmentName: 'IT STOCK',
        previousLocationId: asset.locationId,
        previousLocationName: asset.locationRel?.name || asset.location,
        newLocationId: targetLocId,
        newLocationName: targetLoc?.name || 'IT STOCK',
        previousCondition: asset.condition,
        newCondition: finalCondition,
        performedById: userId,
        eventDate: returnDate,
        reason: ret.returnReason || 'Asset Return Finalized',
        remarks: `Return completed (${ret.returnCode || ret.id}). Disposition: ${finalDisposition}. Condition: ${finalCondition}`,
      });

      // 6. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_RETURN_COMPLETE',
          entityType: 'AssetReturn',
          entityId: id,
          oldValue: JSON.stringify({ status: ret.status, currentHolderId: asset.currentHolderId }),
          newValue: JSON.stringify({ status: WorkflowStatus.COMPLETED, disposition: finalDisposition, nextAssetStatus }),
        },
      });

      return updatedReturn;
    });
  }

  /**
   * Cancel Return: Revoke Pending or Received Return Request
   */
  static async cancelReturn(id: string, data: unknown, userId: string) {
    const ret = await prisma.assetReturn.findUnique({ where: { id } });
    if (!ret) throw new Error('Return record not found.');

    if (ret.status === WorkflowStatus.COMPLETED) {
      throw new Error('Completed returns cannot be cancelled. Use controlled reversal procedures.');
    }
    if (ret.status === WorkflowStatus.CANCELLED) {
      throw new Error('This return is already cancelled.');
    }

    const validated = AssetReturnCancelSchema.parse(data);

    const updated = await prisma.assetReturn.update({
      where: { id },
      data: {
        status: WorkflowStatus.CANCELLED,
        remarks: (ret.remarks ? `${ret.remarks} | ` : '') + `Cancelled: ${validated.reason}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ASSET_RETURN_CANCEL',
        entityType: 'AssetReturn',
        entityId: id,
        oldValue: JSON.stringify({ status: ret.status }),
        newValue: JSON.stringify({ status: WorkflowStatus.CANCELLED, reason: validated.reason }),
      },
    });

    return {
      returnRecord: updated,
      message: `Return request ${ret.returnCode || ret.id} has been cancelled.`,
    };
  }

  /**
   * Safe Update of Editable Fields on a Return
   */
  static async updateReturn(id: string, data: unknown, userId: string) {
    const existing = await prisma.assetReturn.findUnique({ where: { id } });
    if (!existing) throw new Error('Return record not found.');

    if (existing.status === WorkflowStatus.COMPLETED) {
      throw new Error('Historical completed returns cannot be modified.');
    }

    const validated = AssetReturnUpdateSchema.parse(data);

    const updated = await prisma.assetReturn.update({
      where: { id },
      data: {
        returnReason: validated.returnReason !== undefined ? validated.returnReason : existing.returnReason,
        locationId: validated.locationId !== undefined ? validated.locationId : existing.locationId,
        conditionAtReturn: validated.conditionAtReturn || existing.conditionAtReturn,
        damageReported: validated.damageReported !== undefined ? validated.damageReported : existing.damageReported,
        damageCategory: validated.damageCategory !== undefined ? validated.damageCategory : existing.damageCategory,
        damageDescription: validated.damageDescription !== undefined ? validated.damageDescription : existing.damageDescription,
        missingAccessories: validated.missingAccessories !== undefined ? validated.missingAccessories : existing.missingAccessories,
        accessoriesChecklist: (validated.accessoriesChecklist as any) || existing.accessoriesChecklist,
        dataWipeStatus: validated.dataWipeStatus !== undefined ? validated.dataWipeStatus : existing.dataWipeStatus,
        inspectionRequired: validated.inspectionRequired !== undefined ? validated.inspectionRequired : existing.inspectionRequired,
        inspectionResult: validated.inspectionResult !== undefined ? validated.inspectionResult : existing.inspectionResult,
        maintenanceRequired: validated.maintenanceRequired !== undefined ? validated.maintenanceRequired : existing.maintenanceRequired,
        disposition: validated.disposition !== undefined ? validated.disposition : existing.disposition,
        remarks: validated.remarks !== undefined ? validated.remarks : existing.remarks,
        approvedById: validated.approvedById !== undefined ? validated.approvedById : existing.approvedById,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ASSET_RETURN_UPDATE',
        entityType: 'AssetReturn',
        entityId: id,
        oldValue: JSON.stringify({ condition: existing.conditionAtReturn, remarks: existing.remarks }),
        newValue: JSON.stringify({ condition: updated.conditionAtReturn, remarks: updated.remarks }),
      },
    });

    return updated;
  }
}
