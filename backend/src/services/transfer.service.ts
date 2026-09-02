import prisma from '../config/prisma';
import {
  WorkflowStatus,
  AssetStatus,
  AllocationStatus,
  AssetCondition,
  AssetAction,
  Prisma,
} from '@prisma/client';
import {
  AssetTransferSchema,
  AssetTransferUpdateSchema,
  AssetTransferCancelSchema,
  AssetTransferReverseSchema,
} from '../validators/schemas';
import { HistoryService } from './history.service';

export class TransferService {
  /**
   * Helper for generating sequential transfer codes: TRF-000001
   */
  private static async generateTransferCode(): Promise<string> {
    const trfRecords = await prisma.assetTransfer.findMany({
      where: { transferCode: { startsWith: 'TRF-' } },
      select: { transferCode: true },
    });

    let maxNum = 0;
    for (const t of trfRecords) {
      if (t.transferCode) {
        const match = t.transferCode.match(/^TRF-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    return `TRF-${String(maxNum + 1).padStart(6, '0')}`;
  }

  /**
   * Get transfers with server-backed search, dynamic filtering, sorting, and pagination
   */
  static async getTransfers(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    assetType?: string;
    fromEmployeeId?: string;
    toEmployeeId?: string;
    fromDepartmentId?: string;
    toDepartmentId?: string;
    fromLocationId?: string;
    toLocationId?: string;
    fromDate?: string;
    toDate?: string;
    reason?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(1000, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AssetTransferWhereInput = {};

    // Status Filter
    if (query.status && query.status !== 'ALL') {
      const s = query.status.toUpperCase();
      if (Object.values(WorkflowStatus).includes(s as any)) {
        where.status = s as WorkflowStatus;
      }
    }

    // Asset Type Filter
    if (query.assetType && query.assetType.trim()) {
      const type = query.assetType.trim();
      where.asset = {
        OR: [
          { assetType: type as any },
          { sourceAssetType: { equals: type, mode: 'insensitive' } },
        ],
      };
    }

    // From Employee Filter
    if (query.fromEmployeeId && query.fromEmployeeId.trim()) {
      where.previousHolderId = query.fromEmployeeId.trim();
    }

    // To Employee Filter
    if (query.toEmployeeId && query.toEmployeeId.trim()) {
      where.newHolderId = query.toEmployeeId.trim();
    }

    // From Department Filter
    if (query.fromDepartmentId && query.fromDepartmentId.trim()) {
      where.previousDepartmentId = query.fromDepartmentId.trim();
    }

    // To Department Filter
    if (query.toDepartmentId && query.toDepartmentId.trim()) {
      where.newDepartmentId = query.toDepartmentId.trim();
    }

    // From Location Filter
    if (query.fromLocationId && query.fromLocationId.trim()) {
      where.previousLocationId = query.fromLocationId.trim();
    }

    // To Location Filter
    if (query.toLocationId && query.toLocationId.trim()) {
      where.newLocationId = query.toLocationId.trim();
    }

    // Reason Filter
    if (query.reason && query.reason.trim()) {
      where.reason = { contains: query.reason.trim(), mode: 'insensitive' };
    }

    // Date Range (transferDate)
    if (query.fromDate || query.toDate) {
      where.transferDate = {};
      if (query.fromDate) where.transferDate.gte = new Date(query.fromDate);
      if (query.toDate) where.transferDate.lte = new Date(query.toDate);
    }

    // Multi-Field Search
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const sNormalized = s.replace(/\s+/g, '');

      where.OR = [
        { transferCode: { contains: s, mode: 'insensitive' } },
        { transferCode: { contains: sNormalized, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } },
        { asset: { companyAssetId: { contains: s, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: s, mode: 'insensitive' } } },
        { asset: { assetName: { contains: s, mode: 'insensitive' } } },
        { asset: { model: { contains: s, mode: 'insensitive' } } },
        { asset: { serialNumber: { contains: s, mode: 'insensitive' } } },
        { previousHolder: { fullName: { contains: s, mode: 'insensitive' } } },
        { previousHolder: { employeeCode: { contains: s, mode: 'insensitive' } } },
        { newHolder: { fullName: { contains: s, mode: 'insensitive' } } },
        { newHolder: { employeeCode: { contains: s, mode: 'insensitive' } } },
        { previousDepartment: { name: { contains: s, mode: 'insensitive' } } },
        { newDepartment: { name: { contains: s, mode: 'insensitive' } } },
        { previousLocation: { name: { contains: s, mode: 'insensitive' } } },
        { newLocation: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    const order: 'asc' | 'desc' = query.sortOrder === 'desc' ? 'desc' : 'asc';
    let orderBy: any = { transferDate: 'desc' };

    if (query.sortBy) {
      switch (query.sortBy) {
        case 'transferCode':
        case 'id':
          orderBy = [{ transferCode: { sort: order, nulls: 'last' } }, { createdAt: order }];
          break;
        case 'assetId':
        case 'assetCode':
          orderBy = { asset: { companyAssetId: order } };
          break;
        case 'assetName':
          orderBy = { asset: { assetName: order } };
          break;
        case 'fromEmployee':
        case 'previousHolder':
          orderBy = { previousHolder: { fullName: order } };
          break;
        case 'toEmployee':
        case 'newHolder':
          orderBy = { newHolder: { fullName: order } };
          break;
        case 'fromDepartment':
          orderBy = { previousDepartment: { name: order } };
          break;
        case 'toDepartment':
          orderBy = { newDepartment: { name: order } };
          break;
        case 'fromLocation':
          orderBy = { previousLocation: { name: order } };
          break;
        case 'toLocation':
          orderBy = { newLocation: { name: order } };
          break;
        case 'transferDate':
          orderBy = { transferDate: order };
          break;
        case 'status':
          orderBy = { status: order };
          break;
        default:
          orderBy = { transferDate: 'desc' };
      }
    }

    const [total, transfers] = await Promise.all([
      prisma.assetTransfer.count({ where }),
      prisma.assetTransfer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          asset: {
            include: {
              department: { select: { id: true, name: true } },
              locationRel: { select: { id: true, name: true } },
            },
          },
          previousHolder: {
            include: {
              department: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
          newHolder: {
            include: {
              department: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
          previousDepartment: { select: { id: true, name: true } },
          newDepartment: { select: { id: true, name: true } },
          previousLocation: { select: { id: true, name: true } },
          newLocation: { select: { id: true, name: true } },
          requestedBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
        },
      }),
    ]);

    const formatted = transfers.map((t) => {
      const prevDeptName =
        t.previousDepartment?.name ||
        t.previousHolder?.department?.name ||
        t.asset.department?.name ||
        'IT STOCK';

      const newDeptName =
        t.newDepartment?.name ||
        t.newHolder?.department?.name ||
        (t.newHolder ? 'Staff Assigned' : 'IT STOCK');

      const prevLocName =
        t.previousLocation?.name ||
        t.previousHolder?.location?.name ||
        t.asset.locationRel?.name ||
        t.asset.location ||
        'HQ';

      const newLocName =
        t.newLocation?.name ||
        t.newHolder?.location?.name ||
        t.previousLocation?.name ||
        'HQ';

      return {
        id: t.id,
        transferCode: t.transferCode || `TRF-${t.id.slice(0, 8).toUpperCase()}`,
        assetId: t.assetId,
        assetCode: t.asset.companyAssetId || t.asset.assetCode,
        assetName: t.asset.assetName || t.asset.model,
        model: t.asset.model || t.asset.assetName,
        manufacturer: t.asset.manufacturer || 'Dell',
        serialNumber: t.asset.serialNumber || '—',
        assetType: t.asset.sourceAssetType || t.asset.assetType,
        previousHolderId: t.previousHolderId,
        previousHolderName: t.previousHolder?.fullName || (t.previousHolderId ? 'Staff' : 'IT STOCK'),
        previousHolderCode: t.previousHolder?.employeeCode || '—',
        newHolderId: t.newHolderId,
        newHolderName: t.newHolder?.fullName || (t.newHolderId ? 'Staff' : 'IT STOCK (Deallocated)'),
        newHolderCode: t.newHolder?.employeeCode || '—',
        previousDepartmentId: t.previousDepartmentId,
        previousDepartmentName: prevDeptName,
        newDepartmentId: t.newDepartmentId,
        newDepartmentName: newDeptName,
        previousLocationId: t.previousLocationId,
        previousLocationName: prevLocName,
        newLocationId: t.newLocationId,
        newLocationName: newLocName,
        transferDate: t.transferDate,
        effectiveDate: t.effectiveDate || t.transferDate,
        conditionBefore: t.conditionBefore || t.asset.condition || 'GOOD',
        conditionAfter: t.conditionAfter || t.conditionBefore || 'GOOD',
        reason: t.reason || 'Organizational asset movement',
        remarks: t.remarks || '—',
        status: t.status,
        requestedById: t.requestedById,
        performedByName: t.requestedBy?.username || 'admin',
        approvedById: t.approvedById,
        approvedByName: t.approvedBy?.username || '—',
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });

    return {
      transfers: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get dynamic transfer counters directly from PostgreSQL
   */
  static async getTransferCounts() {
    const [all, pending, completed, cancelled] = await Promise.all([
      prisma.assetTransfer.count(),
      prisma.assetTransfer.count({ where: { status: WorkflowStatus.PENDING } }),
      prisma.assetTransfer.count({ where: { status: WorkflowStatus.COMPLETED } }),
      prisma.assetTransfer.count({ where: { status: WorkflowStatus.CANCELLED } }),
    ]);

    return {
      all,
      pending,
      completed,
      cancelled,
    };
  }

  /**
   * Get full details of a specific transfer
   */
  static async getTransferById(id: string) {
    const transfer = await prisma.assetTransfer.findFirst({
      where: {
        OR: [{ id }, { transferCode: id }],
      },
      include: {
        asset: {
          include: {
            specifications: true,
            department: true,
            locationRel: true,
            currentHolder: true,
          },
        },
        previousHolder: {
          include: { department: true, location: true },
        },
        newHolder: {
          include: { department: true, location: true },
        },
        previousDepartment: true,
        newDepartment: true,
        previousLocation: true,
        newLocation: true,
        requestedBy: {
          select: { id: true, username: true, role: { select: { name: true } } },
        },
        approvedBy: {
          select: { id: true, username: true, role: { select: { name: true } } },
        },
      },
    });

    if (!transfer) throw new Error('Transfer record not found.');

    const historyEvents = await prisma.assetStatusHistory.findMany({
      where: { assetId: transfer.assetId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { performedBy: { select: { username: true } } },
    });

    return {
      ...transfer,
      historyEvents,
    };
  }

  /**
   * Create a new asset transfer with Concurrency & Assignment Lifecycle Integration
   */
  static async createTransfer(data: unknown, userId: string) {
    const validated = AssetTransferSchema.parse(data);

    // 1. Verify asset exists & eligibility
    const asset = await prisma.asset.findUnique({
      where: { id: validated.assetId },
      include: { department: true, locationRel: true, currentHolder: true },
    });
    if (!asset) throw new Error('Selected asset does not exist.');

    if (asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.SCRAPPED) {
      throw new Error('Cannot transfer a retired or scrapped asset.');
    }

    if (asset.status === AssetStatus.UNDER_REPAIR) {
      throw new Error('Cannot transfer an asset that is currently under maintenance / repair. Complete or cancel maintenance first.');
    }

    // 2. Concurrency Conflict Protection
    if (validated.expectedSourceState) {
      const { holderId, departmentId, locationId } = validated.expectedSourceState;
      const holderMismatch = holderId !== undefined && (asset.currentHolderId || null) !== (holderId || null);
      const deptMismatch = departmentId !== undefined && (asset.departmentId || null) !== (departmentId || null);
      const locMismatch = locationId !== undefined && (asset.locationId || null) !== (locationId || null);

      if (holderMismatch || deptMismatch || locMismatch) {
        throw new Error('This asset has changed since you opened this transfer. Refresh the asset and try again.');
      }
    }

    // 3. Verify destination employee if provided
    let newHolder: any = null;
    if (validated.newHolderId) {
      newHolder = await prisma.employee.findUnique({
        where: { id: validated.newHolderId },
        include: { department: true, location: true },
      });
      if (!newHolder) {
        throw new Error('Selected destination employee not found.');
      }
      if (newHolder.status !== 'ACTIVE') {
        throw new Error('This employee is not eligible for new asset assignment.');
      }
    }

    // 4. Determine state changes
    const transferCode = await TransferService.generateTransferCode();
    const transferDate = validated.transferDate || new Date();
    const effectiveDate = validated.effectiveDate || transferDate;
    const condBefore = validated.conditionBefore || asset.condition || AssetCondition.GOOD;
    const condAfter = validated.conditionAfter || condBefore;

    const previousHolderId = asset.currentHolderId;
    const previousDepartmentId = asset.departmentId;
    const previousLocationId = asset.locationId;

    const targetDepartmentId = validated.newDepartmentId || newHolder?.departmentId || asset.departmentId;
    const targetLocationId = validated.newLocationId || newHolder?.locationId || asset.locationId;

    if (targetDepartmentId) {
      const dept = await prisma.department.findUnique({ where: { id: targetDepartmentId } });
      if (!dept || !dept.isActive) {
        throw new Error('Cannot transfer asset to an inactive department.');
      }
    }
    if (targetLocationId) {
      const loc = await prisma.location.findUnique({ where: { id: targetLocationId } });
      if (!loc || !loc.isActive) {
        throw new Error('Cannot transfer asset to an inactive location.');
      }
    }

    // 5. If PENDING: create request record without altering asset state
    if (validated.status === WorkflowStatus.PENDING) {
      return await prisma.assetTransfer.create({
        data: {
          transferCode,
          assetId: asset.id,
          previousHolderId,
          newHolderId: validated.newHolderId || null,
          previousDepartmentId,
          newDepartmentId: targetDepartmentId,
          previousLocationId,
          newLocationId: targetLocationId,
          requestedById: userId,
          approvedById: validated.approvedById || null,
          transferDate,
          effectiveDate,
          conditionBefore: condBefore,
          conditionAfter: condAfter,
          reason: validated.reason || 'Routine organizational movement',
          remarks: validated.remarks,
          status: WorkflowStatus.PENDING,
        },
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
    }

    // 6. If COMPLETED: Atomic movement transaction
    return await prisma.$transaction(async (tx) => {
      // 6a. Create Transfer record
      const transfer = await tx.assetTransfer.create({
        data: {
          transferCode,
          assetId: asset.id,
          previousHolderId,
          newHolderId: validated.newHolderId || null,
          previousDepartmentId,
          newDepartmentId: targetDepartmentId,
          previousLocationId,
          newLocationId: targetLocationId,
          requestedById: userId,
          approvedById: validated.approvedById || userId,
          transferDate,
          effectiveDate,
          conditionBefore: condBefore,
          conditionAfter: condAfter,
          reason: validated.reason || 'Departmental project reallocation',
          remarks: validated.remarks,
          status: WorkflowStatus.COMPLETED,
        },
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

      // 6b. Assignment Interaction: Close previous active assignment if held by previous employee
      if (previousHolderId) {
        await tx.assetAssignment.updateMany({
          where: {
            assetId: asset.id,
            employeeId: previousHolderId,
            status: WorkflowStatus.ACTIVE,
          },
          data: {
            status: WorkflowStatus.RETURNED,
            actualReturnDate: transferDate,
            conditionAtReturn: condBefore,
          },
        });
      }

      // 6c. Assignment Interaction: Open new active assignment if assigned to new employee
      if (validated.newHolderId && newHolder) {
        // Generate code for assignment
        const asgRecords = await tx.assetAssignment.findMany({
          where: { assignmentCode: { startsWith: 'ASG-' } },
          select: { assignmentCode: true },
        });
        let maxAsgNum = 0;
        for (const a of asgRecords) {
          if (a.assignmentCode) {
            const m = a.assignmentCode.match(/^ASG-(\d+)$/);
            if (m) {
              const num = parseInt(m[1], 10);
              if (num > maxAsgNum) maxAsgNum = num;
            }
          }
        }
        const asgCode = `ASG-${String(maxAsgNum + 1).padStart(6, '0')}`;

        await tx.assetAssignment.create({
          data: {
            assignmentCode: asgCode,
            assetId: asset.id,
            employeeId: newHolder.id,
            departmentId: targetDepartmentId,
            locationId: targetLocationId,
            assignedById: userId,
            assignedAt: transferDate,
            conditionAtAssignment: condAfter,
            reason: validated.reason || 'Transferred via Asset Transfer',
            remarks: `Transferred from ${asset.currentHolder?.fullName || 'IT STOCK'}`,
            status: WorkflowStatus.ACTIVE,
          },
        });
      }

      // 6d. Update Asset State
      const isAllocated = !!validated.newHolderId;
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          currentHolderId: validated.newHolderId || null,
          employeeNameSource: newHolder?.fullName || null,
          departmentId: targetDepartmentId,
          locationId: targetLocationId,
          condition: condAfter,
          allocationStatus: isAllocated ? AllocationStatus.ALLOCATED : AllocationStatus.NOT_ALLOCATED,
          sourceAllocationStatus: isAllocated ? 'Allocated' : 'Not Allocated',
          dateOfAllocation: isAllocated ? transferDate : asset.dateOfAllocation,
          dateOfDeallocation: isAllocated ? null : transferDate,
        },
      });

      // 6e. Record Immutable Asset History Event
      const prevDept = previousDepartmentId ? await tx.department.findUnique({ where: { id: previousDepartmentId } }) : null;
      const targetDept = targetDepartmentId ? await tx.department.findUnique({ where: { id: targetDepartmentId } }) : null;
      const prevLoc = previousLocationId ? await tx.location.findUnique({ where: { id: previousLocationId } }) : null;
      const targetLoc = targetLocationId ? await tx.location.findUnique({ where: { id: targetLocationId } }) : null;

      await HistoryService.recordEvent(tx, {
        assetId: asset.id,
        action: AssetAction.TRANSFERRED,
        previousStatus: asset.status,
        newStatus: asset.status,
        previousHolderId,
        previousHolderName: asset.currentHolder?.fullName || asset.employeeNameSource || 'IT STOCK',
        newHolderId: validated.newHolderId || null,
        newHolderName: newHolder?.fullName || 'IT STOCK',
        previousDepartmentId,
        previousDepartmentName: prevDept?.name || asset.location || 'IT STOCK',
        newDepartmentId: targetDepartmentId,
        newDepartmentName: targetDept?.name || prevDept?.name || asset.location || 'IT STOCK',
        previousLocationId,
        previousLocationName: prevLoc?.name || asset.location || 'HQ',
        newLocationId: targetLocationId,
        newLocationName: targetLoc?.name || prevLoc?.name || asset.location || 'HQ',
        previousCondition: condBefore,
        newCondition: condAfter,
        performedById: userId,
        eventDate: transferDate,
        reason: validated.reason,
        remarks: validated.remarks
          ? `${validated.remarks} - ${asset.currentHolder?.fullName || 'IT STOCK'} -> ${newHolder?.fullName || 'IT STOCK'}`
          : `Movement: ${asset.currentHolder?.fullName || 'IT STOCK'} -> ${newHolder?.fullName || 'IT STOCK'}`,
      });

      // 6f. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_TRANSFER',
          entityType: 'AssetTransfer',
          entityId: transfer.id,
          oldValue: JSON.stringify({
            holderId: previousHolderId,
            departmentId: previousDepartmentId,
            locationId: previousLocationId,
          }),
          newValue: JSON.stringify({
            holderId: validated.newHolderId,
            departmentId: targetDepartmentId,
            locationId: targetLocationId,
          }),
        },
      });

      return transfer;
    });
  }

  /**
   * Complete a Pending Transfer
   */
  static async completeTransfer(id: string, userId: string) {
    const transfer = await prisma.assetTransfer.findUnique({
      where: { id },
      include: {
        asset: {
          include: { department: true, locationRel: true, currentHolder: true },
        },
        newHolder: {
          include: { department: true, location: true },
        },
      },
    });

    if (!transfer) throw new Error('Transfer record not found.');
    if (transfer.status !== WorkflowStatus.PENDING) {
      throw new Error(`Only pending transfers can be completed. Current status is ${transfer.status}.`);
    }

    const asset = transfer.asset;
    const newHolder = transfer.newHolder;
    const transferDate = new Date();
    const condAfter = transfer.conditionAfter || asset.condition || AssetCondition.GOOD;

    return await prisma.$transaction(async (tx) => {
      // 1. Close previous holder assignment if any
      if (transfer.previousHolderId) {
        await tx.assetAssignment.updateMany({
          where: {
            assetId: asset.id,
            employeeId: transfer.previousHolderId,
            status: WorkflowStatus.ACTIVE,
          },
          data: {
            status: WorkflowStatus.RETURNED,
            actualReturnDate: transferDate,
            conditionAtReturn: transfer.conditionBefore || asset.condition,
          },
        });
      }

      // 2. Open new assignment if assigned to an employee
      if (transfer.newHolderId && newHolder) {
        const asgRecords = await tx.assetAssignment.findMany({
          where: { assignmentCode: { startsWith: 'ASG-' } },
          select: { assignmentCode: true },
        });
        let maxAsgNum = 0;
        for (const a of asgRecords) {
          if (a.assignmentCode) {
            const m = a.assignmentCode.match(/^ASG-(\d+)$/);
            if (m) {
              const num = parseInt(m[1], 10);
              if (num > maxAsgNum) maxAsgNum = num;
            }
          }
        }
        const asgCode = `ASG-${String(maxAsgNum + 1).padStart(6, '0')}`;

        await tx.assetAssignment.create({
          data: {
            assignmentCode: asgCode,
            assetId: asset.id,
            employeeId: newHolder.id,
            departmentId: transfer.newDepartmentId,
            locationId: transfer.newLocationId,
            assignedById: userId,
            assignedAt: transferDate,
            conditionAtAssignment: condAfter,
            reason: transfer.reason || 'Completed pending transfer',
            remarks: `Transferred via Transfer ${transfer.transferCode || transfer.id}`,
            status: WorkflowStatus.ACTIVE,
          },
        });
      }

      // 3. Update Asset
      const isAllocated = !!transfer.newHolderId;
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          currentHolderId: transfer.newHolderId || null,
          employeeNameSource: newHolder?.fullName || null,
          departmentId: transfer.newDepartmentId,
          locationId: transfer.newLocationId,
          condition: condAfter,
          allocationStatus: isAllocated ? AllocationStatus.ALLOCATED : AllocationStatus.NOT_ALLOCATED,
          sourceAllocationStatus: isAllocated ? 'Allocated' : 'Not Allocated',
          dateOfAllocation: isAllocated ? transferDate : asset.dateOfAllocation,
          dateOfDeallocation: isAllocated ? null : transferDate,
        },
      });

      // 4. Mark Transfer as COMPLETED
      const updatedTransfer = await tx.assetTransfer.update({
        where: { id },
        data: {
          status: WorkflowStatus.COMPLETED,
          approvedById: userId,
          effectiveDate: transferDate,
        },
      });

      // 5. History & Audit
      await HistoryService.recordEvent(tx, {
        assetId: asset.id,
        action: AssetAction.TRANSFERRED,
        previousStatus: asset.status,
        newStatus: asset.status,
        previousHolderId: transfer.previousHolderId,
        previousHolderName: asset.currentHolder?.fullName || 'IT STOCK',
        newHolderId: transfer.newHolderId,
        newHolderName: newHolder?.fullName || 'IT STOCK',
        previousDepartmentId: transfer.previousDepartmentId,
        newDepartmentId: transfer.newDepartmentId,
        previousLocationId: transfer.previousLocationId,
        newLocationId: transfer.newLocationId,
        previousCondition: transfer.conditionBefore,
        newCondition: condAfter,
        performedById: userId,
        eventDate: transferDate,
        reason: transfer.reason,
        remarks: `Completed pending transfer ${transfer.transferCode || transfer.id}`,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'TRANSFER_COMPLETE',
          entityType: 'AssetTransfer',
          entityId: id,
          oldValue: JSON.stringify({ status: WorkflowStatus.PENDING }),
          newValue: JSON.stringify({ status: WorkflowStatus.COMPLETED, approvedById: userId }),
        },
      });

      return updatedTransfer;
    });
  }

  /**
   * Update Safe Editable Fields on a Pending Transfer
   */
  static async updateTransfer(id: string, data: unknown, userId: string) {
    const existing = await prisma.assetTransfer.findUnique({ where: { id } });
    if (!existing) throw new Error('Transfer record not found.');

    if (existing.status !== WorkflowStatus.PENDING) {
      throw new Error(`Only pending transfers can be edited. Current status is ${existing.status}.`);
    }

    const validated = AssetTransferUpdateSchema.parse(data);

    const updated = await prisma.assetTransfer.update({
      where: { id },
      data: {
        newHolderId: validated.newHolderId !== undefined ? validated.newHolderId : existing.newHolderId,
        newDepartmentId: validated.newDepartmentId !== undefined ? validated.newDepartmentId : existing.newDepartmentId,
        newLocationId: validated.newLocationId !== undefined ? validated.newLocationId : existing.newLocationId,
        effectiveDate: validated.effectiveDate !== undefined ? validated.effectiveDate : existing.effectiveDate,
        conditionAfter: validated.conditionAfter !== undefined ? validated.conditionAfter : existing.conditionAfter,
        reason: validated.reason !== undefined ? validated.reason : existing.reason,
        remarks: validated.remarks !== undefined ? validated.remarks : existing.remarks,
        approvedById: validated.approvedById !== undefined ? validated.approvedById : existing.approvedById,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TRANSFER_UPDATE',
        entityType: 'AssetTransfer',
        entityId: id,
        oldValue: JSON.stringify({ reason: existing.reason, remarks: existing.remarks }),
        newValue: JSON.stringify({ reason: updated.reason, remarks: updated.remarks }),
      },
    });

    return updated;
  }

  /**
   * Cancel a Pending Transfer
   */
  static async cancelTransfer(id: string, data: unknown, userId: string) {
    const transfer = await prisma.assetTransfer.findUnique({ where: { id } });
    if (!transfer) throw new Error('Transfer record not found.');

    if (transfer.status !== WorkflowStatus.PENDING) {
      throw new Error(`Only pending transfers can be cancelled. Current status is ${transfer.status}.`);
    }

    const validated = AssetTransferCancelSchema.parse(data);

    const updated = await prisma.assetTransfer.update({
      where: { id },
      data: {
        status: WorkflowStatus.CANCELLED,
        remarks: (transfer.remarks ? transfer.remarks + ' | ' : '') + `Cancelled: ${validated.reason}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'TRANSFER_CANCEL',
        entityType: 'AssetTransfer',
        entityId: id,
        oldValue: JSON.stringify({ status: WorkflowStatus.PENDING }),
        newValue: JSON.stringify({ status: WorkflowStatus.CANCELLED, reason: validated.reason }),
      },
    });

    return {
      transfer: updated,
      message: `Transfer ${transfer.transferCode || transfer.id} has been cancelled.`,
    };
  }

  /**
   * Reverse a Completed Transfer (Creates Reverse Movement B → A, Preserving Chain of Custody)
   */
  static async reverseTransfer(id: string, data: unknown, userId: string) {
    const original = await prisma.assetTransfer.findUnique({
      where: { id },
      include: {
        asset: { include: { currentHolder: true } },
        previousHolder: true,
        newHolder: true,
        previousDepartment: true,
        newDepartment: true,
        previousLocation: true,
        newLocation: true,
      },
    });

    if (!original) throw new Error('Original transfer record not found.');
    if (original.status !== WorkflowStatus.COMPLETED) {
      throw new Error('Only completed transfers can be reversed.');
    }

    const validated = AssetTransferReverseSchema.parse(data);
    const asset = original.asset;

    // Check if asset is still at the newHolder location
    if (original.newHolderId && asset.currentHolderId !== original.newHolderId) {
      throw new Error('Asset has moved since this transfer occurred. Cannot perform automatic reversal.');
    }

    const reverseCode = await TransferService.generateTransferCode();
    const reverseDate = new Date();

    return await prisma.$transaction(async (tx) => {
      // 1. Create Reverse Transfer record (B → A)
      const reverseTransfer = await tx.assetTransfer.create({
        data: {
          transferCode: reverseCode,
          assetId: asset.id,
          previousHolderId: original.newHolderId,
          newHolderId: original.previousHolderId,
          previousDepartmentId: original.newDepartmentId,
          newDepartmentId: original.previousDepartmentId,
          previousLocationId: original.newLocationId,
          newLocationId: original.previousLocationId,
          requestedById: userId,
          approvedById: userId,
          transferDate: reverseDate,
          effectiveDate: reverseDate,
          conditionBefore: asset.condition,
          conditionAfter: asset.condition,
          reason: `Reversal of ${original.transferCode || original.id}: ${validated.reason}`,
          remarks: `Reversal executed by admin. Original transfer: ${original.transferCode || original.id}`,
          status: WorkflowStatus.COMPLETED,
        },
      });

      // 2. Close newHolder assignment
      if (original.newHolderId) {
        await tx.assetAssignment.updateMany({
          where: {
            assetId: asset.id,
            employeeId: original.newHolderId,
            status: WorkflowStatus.ACTIVE,
          },
          data: {
            status: WorkflowStatus.RETURNED,
            actualReturnDate: reverseDate,
            conditionAtReturn: asset.condition,
          },
        });
      }

      // 3. Re-open previousHolder assignment if there was one
      if (original.previousHolderId) {
        const asgRecords = await tx.assetAssignment.findMany({
          where: { assignmentCode: { startsWith: 'ASG-' } },
          select: { assignmentCode: true },
        });
        let maxAsgNum = 0;
        for (const a of asgRecords) {
          if (a.assignmentCode) {
            const m = a.assignmentCode.match(/^ASG-(\d+)$/);
            if (m) {
              const num = parseInt(m[1], 10);
              if (num > maxAsgNum) maxAsgNum = num;
            }
          }
        }
        const asgCode = `ASG-${String(maxAsgNum + 1).padStart(6, '0')}`;

        await tx.assetAssignment.create({
          data: {
            assignmentCode: asgCode,
            assetId: asset.id,
            employeeId: original.previousHolderId,
            departmentId: original.previousDepartmentId,
            locationId: original.previousLocationId,
            assignedById: userId,
            assignedAt: reverseDate,
            conditionAtAssignment: asset.condition,
            reason: `Restored via Transfer Reversal ${reverseCode}`,
            status: WorkflowStatus.ACTIVE,
          },
        });
      }

      // 4. Revert Asset State
      const isAllocated = !!original.previousHolderId;
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          currentHolderId: original.previousHolderId || null,
          employeeNameSource: original.previousHolder?.fullName || null,
          departmentId: original.previousDepartmentId,
          locationId: original.previousLocationId,
          allocationStatus: isAllocated ? AllocationStatus.ALLOCATED : AllocationStatus.NOT_ALLOCATED,
          sourceAllocationStatus: isAllocated ? 'Allocated' : 'Not Allocated',
          dateOfAllocation: isAllocated ? reverseDate : null,
          dateOfDeallocation: isAllocated ? null : reverseDate,
        },
      });

      // 5. History & Audit
      await HistoryService.recordEvent(tx, {
        assetId: asset.id,
        action: AssetAction.TRANSFERRED,
        previousStatus: asset.status,
        newStatus: asset.status,
        previousHolderId: original.newHolderId,
        previousHolderName: original.newHolder?.fullName || 'IT STOCK',
        newHolderId: original.previousHolderId,
        newHolderName: original.previousHolder?.fullName || 'IT STOCK',
        previousDepartmentId: original.newDepartmentId,
        newDepartmentId: original.previousDepartmentId,
        previousLocationId: original.newLocationId,
        newLocationId: original.previousLocationId,
        performedById: userId,
        eventDate: reverseDate,
        reason: `Reversal of ${original.transferCode || original.id}`,
        remarks: `Reversal: ${validated.reason}`,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'TRANSFER_REVERSE',
          entityType: 'AssetTransfer',
          entityId: original.id,
          newValue: JSON.stringify({ reverseTransferId: reverseTransfer.id, reason: validated.reason }),
        },
      });

      return {
        reverseTransfer,
        message: `Transfer ${original.transferCode || original.id} successfully reversed by movement ${reverseCode}.`,
      };
    });
  }

  /**
   * Get dynamic options with full current asset state preview
   */
  static async getOptions() {
    const [assets, employees, departments, locations, approvers] = await Promise.all([
      prisma.asset.findMany({
        where: {
          status: { notIn: [AssetStatus.RETIRED, AssetStatus.SCRAPPED] },
        },
        select: {
          id: true,
          companyAssetId: true,
          assetCode: true,
          assetName: true,
          model: true,
          manufacturer: true,
          serialNumber: true,
          sourceAssetType: true,
          assetType: true,
          status: true,
          condition: true,
          allocationStatus: true,
          currentHolderId: true,
          employeeNameSource: true,
          departmentId: true,
          locationId: true,
          location: true,
          currentHolder: {
            select: { id: true, fullName: true, employeeCode: true, designation: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
          locationRel: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: [{ companyAssetId: { sort: 'asc', nulls: 'last' } }, { assetCode: 'asc' }],
      }),

      prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          designation: true,
          departmentId: true,
          locationId: true,
          department: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { fullName: 'asc' },
      }),

      prisma.department.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),

      prisma.location.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),

      prisma.user.findMany({
        where: {
          isActive: true,
          role: { code: { in: ['ADMIN', 'MANAGER'] } },
        },
        select: {
          id: true,
          username: true,
          role: { select: { name: true, code: true } },
        },
        orderBy: { username: 'asc' },
      }),
    ]);

    return {
      assets,
      employees,
      departments,
      locations,
      approvers,
    };
  }
}
