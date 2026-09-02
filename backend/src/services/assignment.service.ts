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
  AssetAssignmentSchema,
  AssetAssignmentUpdateSchema,
  AssetAssignmentCancelSchema,
  AssetReturnSchema,
} from '../validators/schemas';
import { HistoryService } from './history.service';

export class AssignmentService {
  /**
   * Helper for generating sequential assignment codes: ASG-000001
   */
  private static async generateAssignmentCode(): Promise<string> {
    const asgRecords = await prisma.assetAssignment.findMany({
      where: { assignmentCode: { startsWith: 'ASG-' } },
      select: { assignmentCode: true },
    });

    let maxNum = 0;
    for (const a of asgRecords) {
      if (a.assignmentCode) {
        const match = a.assignmentCode.match(/^ASG-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    return `ASG-${String(maxNum + 1).padStart(6, '0')}`;
  }

  /**
   * Get assignments with server-backed search, dynamic filtering, sorting, and pagination
   */
  static async getAssignments(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    employeeId?: string;
    assetType?: string;
    departmentId?: string;
    department?: string;
    locationId?: string;
    location?: string;
    fromDate?: string;
    toDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(1000, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AssetAssignmentWhereInput = {};
    const now = new Date();

    // Status filter (Lifecycle & Overdue detection)
    if (query.status && query.status !== 'ALL') {
      const s = query.status.toUpperCase();
      if (s === 'OVERDUE') {
        where.status = WorkflowStatus.ACTIVE;
        where.expectedReturnDate = { lt: now };
      } else if (s === 'ACTIVE') {
        where.status = WorkflowStatus.ACTIVE;
        where.OR = [
          { expectedReturnDate: null },
          { expectedReturnDate: { gte: now } },
        ];
      } else if (s === 'RETURNED' || s === 'COMPLETED') {
        where.status = { in: [WorkflowStatus.RETURNED, WorkflowStatus.COMPLETED] };
      } else if (s === 'CANCELLED') {
        where.status = WorkflowStatus.CANCELLED;
      } else if (Object.values(WorkflowStatus).includes(s as any)) {
        where.status = s as WorkflowStatus;
      }
    }

    // Employee Filter
    if (query.employeeId && query.employeeId.trim()) {
      where.employeeId = query.employeeId.trim();
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

    // Department Filter
    const dept = query.departmentId || query.department;
    if (dept && dept.trim()) {
      const d = dept.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { departmentId: d },
            { department: { name: { equals: d, mode: 'insensitive' } } },
            { employee: { departmentId: d } },
            { employee: { department: { name: { equals: d, mode: 'insensitive' } } } },
            { asset: { location: { equals: d, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    // Location Filter
    const loc = query.locationId || query.location;
    if (loc && loc.trim()) {
      const l = loc.trim();
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { locationId: l },
            { location: { name: { equals: l, mode: 'insensitive' } } },
            { employee: { locationId: l } },
            { employee: { location: { name: { equals: l, mode: 'insensitive' } } } },
            { asset: { location: { equals: l, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    // Date Range Filter (assignedAt)
    if (query.fromDate || query.toDate) {
      where.assignedAt = {};
      if (query.fromDate) where.assignedAt.gte = new Date(query.fromDate);
      if (query.toDate) where.assignedAt.lte = new Date(query.toDate);
    }

    // Multi-Field Search across Assignment, Asset, Employee, Organization
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const sNormalized = s.replace(/\s+/g, '');

      where.OR = [
        { assignmentCode: { contains: s, mode: 'insensitive' } },
        { assignmentCode: { contains: sNormalized, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } },
        { asset: { companyAssetId: { contains: s, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: s, mode: 'insensitive' } } },
        { asset: { assetName: { contains: s, mode: 'insensitive' } } },
        { asset: { model: { contains: s, mode: 'insensitive' } } },
        { asset: { serialNumber: { contains: s, mode: 'insensitive' } } },
        { employee: { fullName: { contains: s, mode: 'insensitive' } } },
        { employee: { employeeCode: { contains: s, mode: 'insensitive' } } },
        { employee: { email: { contains: s, mode: 'insensitive' } } },
        { department: { name: { contains: s, mode: 'insensitive' } } },
        { location: { name: { contains: s, mode: 'insensitive' } } },
        { asset: { location: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    const order: 'asc' | 'desc' = query.sortOrder === 'desc' ? 'desc' : 'asc';
    let orderBy: any = { assignedAt: 'desc' };

    if (query.sortBy) {
      switch (query.sortBy) {
        case 'assignmentCode':
        case 'id':
          orderBy = [{ assignmentCode: { sort: order, nulls: 'last' } }, { createdAt: order }];
          break;
        case 'assetId':
        case 'assetCode':
          orderBy = { asset: { companyAssetId: order } };
          break;
        case 'assetName':
          orderBy = { asset: { assetName: order } };
          break;
        case 'employee':
        case 'employeeName':
          orderBy = { employee: { fullName: order } };
          break;
        case 'department':
        case 'departmentName':
          orderBy = { department: { name: order } };
          break;
        case 'location':
        case 'locationName':
          orderBy = { location: { name: order } };
          break;
        case 'assignedAt':
        case 'assignmentDate':
          orderBy = { assignedAt: order };
          break;
        case 'expectedReturnDate':
        case 'expectedReturn':
          orderBy = { expectedReturnDate: { sort: order, nulls: 'last' } };
          break;
        case 'actualReturnDate':
        case 'actualReturn':
          orderBy = { actualReturnDate: { sort: order, nulls: 'last' } };
          break;
        case 'status':
          orderBy = { status: order };
          break;
        default:
          orderBy = { assignedAt: 'desc' };
      }
    }

    const [total, assignments] = await Promise.all([
      prisma.assetAssignment.count({ where }),
      prisma.assetAssignment.findMany({
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
          employee: {
            include: {
              department: { select: { id: true, name: true } },
              location: { select: { id: true, name: true } },
            },
          },
          department: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          assignedBy: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          returns: {
            take: 1,
            orderBy: { returnDate: 'desc' },
            select: { id: true, returnDate: true, conditionAtReturn: true },
          },
        },
      }),
    ]);

    // Format records with derived overdue state and fallback descriptions
    const formatted = assignments.map((a) => {
      const isOverdue =
        a.status === WorkflowStatus.ACTIVE &&
        !!a.expectedReturnDate &&
        new Date(a.expectedReturnDate) < now;

      let displayStatus: string = a.status;
      if (isOverdue) {
        displayStatus = 'OVERDUE';
      } else if (a.status === WorkflowStatus.COMPLETED) {
        displayStatus = 'RETURNED';
      }

      const deptName =
        a.department?.name ||
        a.employee?.department?.name ||
        a.asset.department?.name ||
        a.asset.location ||
        '—';

      const locName =
        a.location?.name ||
        a.employee?.location?.name ||
        a.asset.locationRel?.name ||
        a.asset.location ||
        '—';

      return {
        id: a.id,
        assignmentCode: a.assignmentCode || `ASG-${a.id.slice(0, 8).toUpperCase()}`,
        assetId: a.assetId,
        assetCode: a.asset.companyAssetId || a.asset.assetCode,
        assetName: a.asset.assetName || a.asset.model,
        model: a.asset.model || a.asset.assetName,
        manufacturer: a.asset.manufacturer || 'Dell',
        assetType: a.asset.sourceAssetType || a.asset.assetType,
        serialNumber: a.asset.serialNumber || '—',
        employeeId: a.employeeId,
        employeeName: a.employee?.fullName || a.asset.employeeNameSource || '—',
        employeeCode: a.employee?.employeeCode || '—',
        employeeEmail: a.employee?.email || '—',
        departmentId: a.departmentId || a.employee?.departmentId,
        departmentName: deptName,
        locationId: a.locationId || a.employee?.locationId,
        locationName: locName,
        assignedAt: a.assignedAt,
        expectedReturnDate: a.expectedReturnDate,
        actualReturnDate: a.actualReturnDate || a.returns[0]?.returnDate || null,
        conditionAtAssignment: a.conditionAtAssignment,
        conditionAtReturn: a.conditionAtReturn || a.returns[0]?.conditionAtReturn || null,
        reason: a.reason || 'Corporate IT device deployment',
        remarks: a.remarks || '—',
        assignedById: a.assignedById,
        assignedByName: a.assignedBy?.username || 'admin',
        approvedById: a.approvedById,
        approvedByName: a.approvedBy?.username || null,
        status: a.status,
        displayStatus,
        isOverdue,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });

    return {
      assignments: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get dynamic assignment counters directly from PostgreSQL
   */
  static async getAssignmentCounts() {
    const now = new Date();

    const [all, active, overdue, returned, cancelled] = await Promise.all([
      prisma.assetAssignment.count(),
      prisma.assetAssignment.count({
        where: {
          status: WorkflowStatus.ACTIVE,
          OR: [
            { expectedReturnDate: null },
            { expectedReturnDate: { gte: now } },
          ],
        },
      }),
      prisma.assetAssignment.count({
        where: {
          status: WorkflowStatus.ACTIVE,
          expectedReturnDate: { lt: now },
        },
      }),
      prisma.assetAssignment.count({
        where: {
          status: { in: [WorkflowStatus.RETURNED, WorkflowStatus.COMPLETED] },
        },
      }),
      prisma.assetAssignment.count({
        where: {
          status: WorkflowStatus.CANCELLED,
        },
      }),
    ]);

    return {
      all,
      active,
      overdue,
      returned,
      cancelled,
    };
  }

  /**
   * Get full details of a specific assignment
   */
  static async getAssignmentById(id: string) {
    const assignment = await prisma.assetAssignment.findFirst({
      where: {
        OR: [{ id }, { assignmentCode: id }],
      },
      include: {
        asset: {
          include: {
            specifications: true,
            department: true,
            locationRel: true,
          },
        },
        employee: {
          include: {
            department: true,
            location: true,
          },
        },
        department: true,
        location: true,
        assignedBy: {
          select: { id: true, username: true, role: { select: { name: true } } },
        },
        approvedBy: {
          select: { id: true, username: true, role: { select: { name: true } } },
        },
        returns: {
          include: {
            receivedBy: { select: { id: true, username: true } },
          },
        },
      },
    });

    if (!assignment) throw new Error('Assignment record not found.');

    const now = new Date();
    const isOverdue =
      assignment.status === WorkflowStatus.ACTIVE &&
      !!assignment.expectedReturnDate &&
      new Date(assignment.expectedReturnDate) < now;

    // Fetch related asset lifecycle history events
    const historyEvents = await prisma.assetStatusHistory.findMany({
      where: { assetId: assignment.assetId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { performedBy: { select: { username: true } } },
    });

    return {
      ...assignment,
      displayStatus: isOverdue ? 'OVERDUE' : assignment.status === WorkflowStatus.COMPLETED ? 'RETURNED' : assignment.status,
      isOverdue,
      historyEvents,
    };
  }

  /**
   * Atomic Create Assignment Transaction
   */
  static async createAssignment(data: unknown, userId: string) {
    const validated = AssetAssignmentSchema.parse(data);

    if (!validated.assetId) {
      throw new Error('Asset selection is required for assignment.');
    }

    // 1. Verify asset exists & check eligibility
    const asset = await prisma.asset.findUnique({ where: { id: validated.assetId } });
    if (!asset) throw new Error('Selected asset does not exist.');

    if (asset.status === AssetStatus.RETIRED || asset.status === AssetStatus.SCRAPPED) {
      throw new Error('Cannot assign a retired or scrapped asset.');
    }
    if (asset.status === AssetStatus.UNDER_REPAIR) {
      throw new Error('Cannot assign an asset that is currently under repair.');
    }

    // 2. Conflict Protection: Check if already actively assigned
    const activeAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: validated.assetId,
        status: WorkflowStatus.ACTIVE,
      },
      include: { employee: true },
    });

    if (activeAssignment || (asset.allocationStatus === AllocationStatus.ALLOCATED && asset.currentHolderId)) {
      const holderName = activeAssignment?.employee?.fullName || asset.employeeNameSource || 'another employee';
      throw new Error(`This asset is already actively assigned to ${holderName}. Please process a return or transfer first.`);
    }

    // 3. Verify employee exists and is active
    const employee = await prisma.employee.findUnique({
      where: { id: validated.employeeId },
      include: { department: true, location: true },
    });
    if (!employee) {
      throw new Error('Employee not found.');
    }
    if (employee.status !== 'ACTIVE') {
      throw new Error('This employee is not eligible for new asset assignment.');
    }

    // 4. Validate dates
    const assignedDate = validated.assignedAt || new Date();
    if (validated.expectedReturnDate && new Date(validated.expectedReturnDate) < assignedDate) {
      throw new Error('Expected return date cannot be earlier than the assignment handover date.');
    }

    // 5. Generate Code
    const assignmentCode = await AssignmentService.generateAssignmentCode();

    const targetDeptId = validated.departmentId || employee.departmentId || asset.departmentId;
    const targetLocId = validated.locationId || employee.locationId || asset.locationId;

    if (targetDeptId) {
      const dept = await prisma.department.findUnique({ where: { id: targetDeptId } });
      if (!dept || !dept.isActive) {
        throw new Error('Cannot assign asset to an inactive department.');
      }
    }
    if (targetLocId) {
      const loc = await prisma.location.findUnique({ where: { id: targetLocId } });
      if (!loc || !loc.isActive) {
        throw new Error('Cannot assign asset to an inactive location.');
      }
    }

    // 6. Execute atomic transaction
    return await prisma.$transaction(async (tx) => {
      const assignment = await tx.assetAssignment.create({
        data: {
          assignmentCode,
          assetId: asset.id,
          employeeId: employee.id,
          departmentId: targetDeptId,
          locationId: targetLocId,
          assignedById: userId,
          approvedById: validated.approvedById || null,
          assignedAt: assignedDate,
          expectedReturnDate: validated.expectedReturnDate || null,
          conditionAtAssignment: validated.conditionAtAssignment,
          reason: validated.reason || 'Corporate IT device deployment',
          remarks: validated.remarks || `Assigned to ${employee.fullName} (${employee.employeeCode})`,
          status: WorkflowStatus.ACTIVE,
        },
        include: {
          asset: true,
          employee: true,
          department: true,
          location: true,
        },
      });

      // Update Asset allocation state
      await tx.asset.update({
        where: { id: asset.id },
        data: {
          status: AssetStatus.ASSIGNED,
          condition: validated.conditionAtAssignment,
          allocationStatus: AllocationStatus.ALLOCATED,
          sourceAllocationStatus: 'Allocated',
          currentHolderId: employee.id,
          employeeNameSource: employee.fullName,
          dateOfAllocation: assignedDate,
          departmentId: targetDeptId,
          locationId: targetLocId,
        },
      });

      // Record Asset History Event
      await HistoryService.recordEvent(tx, {
        assetId: asset.id,
        action: AssetAction.ASSIGNED,
        previousStatus: asset.status,
        newStatus: AssetStatus.ASSIGNED,
        previousHolderId: asset.currentHolderId,
        previousHolderName: asset.employeeNameSource || 'IT STOCK',
        newHolderId: employee.id,
        newHolderName: employee.fullName,
        previousDepartmentId: asset.departmentId,
        previousDepartmentName: asset.location || 'IT STOCK',
        newDepartmentId: targetDeptId,
        newDepartmentName: employee.department?.name || asset.location,
        previousLocationId: asset.locationId,
        previousLocationName: asset.location || 'HQ',
        newLocationId: targetLocId,
        newLocationName: employee.location?.name || asset.location,
        previousCondition: asset.condition,
        newCondition: validated.conditionAtAssignment,
        performedById: userId,
        eventDate: assignedDate,
        remarks: validated.reason
          ? `${validated.reason} — Assigned to ${employee.fullName} (${employee.employeeCode})`
          : `Assigned to ${employee.fullName} (${employee.employeeCode})`,
      });

      // Record Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_ASSIGN',
          entityType: 'AssetAssignment',
          entityId: assignment.id,
          newValue: JSON.stringify({
            assignmentCode,
            assetId: asset.id,
            employeeId: employee.id,
            expectedReturnDate: validated.expectedReturnDate,
            condition: validated.conditionAtAssignment,
          }),
        },
      });

      return assignment;
    });
  }

  /**
   * Update Safe Editable Fields on an Assignment
   */
  static async updateAssignment(id: string, data: unknown, userId: string) {
    const existing = await prisma.assetAssignment.findUnique({
      where: { id },
      include: { asset: true, employee: true },
    });
    if (!existing) throw new Error('Assignment record not found.');

    if (existing.status === WorkflowStatus.CANCELLED || existing.status === WorkflowStatus.RETURNED) {
      throw new Error(`Cannot modify an assignment that is already ${existing.status.toLowerCase()}.`);
    }

    const validated = AssetAssignmentUpdateSchema.parse(data);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.assetAssignment.update({
        where: { id },
        data: {
          expectedReturnDate: validated.expectedReturnDate !== undefined ? validated.expectedReturnDate : existing.expectedReturnDate,
          conditionAtAssignment: validated.conditionAtAssignment || existing.conditionAtAssignment,
          departmentId: validated.departmentId !== undefined ? validated.departmentId : existing.departmentId,
          locationId: validated.locationId !== undefined ? validated.locationId : existing.locationId,
          reason: validated.reason !== undefined ? validated.reason : existing.reason,
          remarks: validated.remarks !== undefined ? validated.remarks : existing.remarks,
          approvedById: validated.approvedById !== undefined ? validated.approvedById : existing.approvedById,
        },
        include: {
          asset: true,
          employee: true,
          department: true,
          location: true,
        },
      });

      // If condition was updated, sync asset condition
      if (validated.conditionAtAssignment && validated.conditionAtAssignment !== existing.conditionAtAssignment) {
        await tx.asset.update({
          where: { id: existing.assetId },
          data: { condition: validated.conditionAtAssignment },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSIGNMENT_UPDATE',
          entityType: 'AssetAssignment',
          entityId: id,
          oldValue: JSON.stringify({
            expectedReturnDate: existing.expectedReturnDate,
            departmentId: existing.departmentId,
            locationId: existing.locationId,
            remarks: existing.remarks,
          }),
          newValue: JSON.stringify({
            expectedReturnDate: updated.expectedReturnDate,
            departmentId: updated.departmentId,
            locationId: updated.locationId,
            remarks: updated.remarks,
          }),
        },
      });

      return updated;
    });
  }

  /**
   * Integrated Return Workflow via Assignment
   */
  static async returnAssignment(id: string, data: unknown, userId: string) {
    const assignment = await prisma.assetAssignment.findUnique({
      where: { id },
      include: { asset: true, employee: true },
    });
    if (!assignment) throw new Error('Assignment record not found.');

    if (assignment.status === WorkflowStatus.RETURNED || assignment.status === WorkflowStatus.COMPLETED) {
      throw new Error('This assignment has already been returned.');
    }
    if (assignment.status === WorkflowStatus.CANCELLED) {
      throw new Error('Cannot return a cancelled assignment.');
    }

    const validated = AssetReturnSchema.parse(data);
    const returnDate = new Date();
    const condition = validated.conditionAtReturn || AssetCondition.GOOD;
    const nextStatus = validated.damageReported ? AssetStatus.UNDER_REPAIR : AssetStatus.AVAILABLE;

    return await prisma.$transaction(async (tx) => {
      // 1. Create linked AssetReturn record
      const returnRec = await tx.assetReturn.create({
        data: {
          assignmentId: assignment.id,
          assetId: assignment.assetId,
          employeeId: assignment.employeeId,
          receivedById: userId,
          returnDate,
          conditionAtReturn: condition,
          accessoriesReturned: validated.accessoriesReturned ?? true,
          damageReported: validated.damageReported ?? false,
          missingAccessories: validated.missingAccessories || null,
          remarks: validated.remarks || 'Returned via ITAM Assignment portal',
          status: WorkflowStatus.COMPLETED,
        },
      });

      // 2. Mark Assignment as RETURNED
      const updatedAssignment = await tx.assetAssignment.update({
        where: { id },
        data: {
          status: WorkflowStatus.RETURNED,
          actualReturnDate: returnDate,
          conditionAtReturn: condition,
        },
      });

      // 3. Reset Asset to unallocated state in IT STOCK
      await tx.asset.update({
        where: { id: assignment.assetId },
        data: {
          status: nextStatus,
          condition,
          allocationStatus: AllocationStatus.NOT_ALLOCATED,
          sourceAllocationStatus: 'Not Allocated',
          currentHolderId: null,
          employeeNameSource: null,
          dateOfDeallocation: returnDate,
        },
      });

      // 4. Record Asset History
      await HistoryService.recordEvent(tx, {
        assetId: assignment.assetId,
        action: AssetAction.RETURNED,
        previousStatus: assignment.asset.status,
        newStatus: nextStatus,
        previousHolderId: assignment.employeeId,
        previousHolderName: assignment.employee.fullName,
        newHolderName: 'IT STOCK',
        previousDepartmentId: assignment.departmentId || assignment.employee.departmentId,
        previousDepartmentName: assignment.asset.location || 'Assigned Department',
        newDepartmentName: 'IT STOCK',
        previousCondition: assignment.conditionAtAssignment,
        newCondition: condition,
        performedById: userId,
        eventDate: returnDate,
        remarks: `Returned from ${assignment.employee.fullName}. Accessories: ${validated.accessoriesReturned}. Damage: ${validated.damageReported}${validated.remarks ? ' | ' + validated.remarks : ''}`,
      });

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSET_RETURN',
          entityType: 'AssetAssignment',
          entityId: assignment.id,
          newValue: JSON.stringify({
            returnId: returnRec.id,
            actualReturnDate: returnDate,
            conditionAtReturn: condition,
            nextAssetStatus: nextStatus,
          }),
        },
      });

      return {
        assignment: updatedAssignment,
        returnRecord: returnRec,
        message: `Asset ${assignment.asset.companyAssetId || assignment.asset.assetCode} has been successfully returned to inventory stock.`,
      };
    });
  }

  /**
   * Cancel an Active Assignment
   */
  static async cancelAssignment(id: string, data: unknown, userId: string) {
    const assignment = await prisma.assetAssignment.findUnique({
      where: { id },
      include: { asset: true, employee: true },
    });
    if (!assignment) throw new Error('Assignment record not found.');

    if (assignment.status !== WorkflowStatus.ACTIVE) {
      throw new Error(`Only active assignments can be cancelled. Current status is ${assignment.status}.`);
    }

    const validated = AssetAssignmentCancelSchema.parse(data);

    return await prisma.$transaction(async (tx) => {
      // 1. Mark Assignment as CANCELLED
      const updatedAssignment = await tx.assetAssignment.update({
        where: { id },
        data: {
          status: WorkflowStatus.CANCELLED,
          remarks: (assignment.remarks ? assignment.remarks + ' | ' : '') + `Cancelled: ${validated.reason}`,
        },
      });

      // 2. Revert Asset if holder matches
      if (assignment.asset.currentHolderId === assignment.employeeId) {
        await tx.asset.update({
          where: { id: assignment.assetId },
          data: {
            status: AssetStatus.AVAILABLE,
            allocationStatus: AllocationStatus.NOT_ALLOCATED,
            sourceAllocationStatus: 'Not Allocated',
            currentHolderId: null,
            employeeNameSource: null,
            dateOfDeallocation: new Date(),
          },
        });
      }

      // 3. Record Asset History
      await HistoryService.recordEvent(tx, {
        assetId: assignment.assetId,
        action: AssetAction.STATUS_CHANGED,
        previousStatus: assignment.asset.status,
        newStatus: AssetStatus.AVAILABLE,
        previousHolderId: assignment.employeeId,
        previousHolderName: assignment.employee.fullName,
        newHolderName: 'IT STOCK',
        performedById: userId,
        eventDate: new Date(),
        remarks: `Assignment ${assignment.assignmentCode || assignment.id} cancelled: ${validated.reason}`,
      });

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'ASSIGNMENT_CANCEL',
          entityType: 'AssetAssignment',
          entityId: assignment.id,
          oldValue: JSON.stringify({ status: WorkflowStatus.ACTIVE }),
          newValue: JSON.stringify({ status: WorkflowStatus.CANCELLED, reason: validated.reason }),
        },
      });

      return {
        assignment: updatedAssignment,
        message: `Assignment ${assignment.assignmentCode || assignment.id} has been cancelled. Asset returned to stock.`,
      };
    });
  }

  /**
   * Get dynamic options for creating and filtering assignments
   */
  static async getOptions() {
    const [availableAssets, employees, departments, locations, approvers] = await Promise.all([
      // Unallocated assets that are not retired, scrapped, or under repair
      prisma.asset.findMany({
        where: {
          AND: [
            {
              OR: [
                { currentHolderId: null },
                { allocationStatus: AllocationStatus.NOT_ALLOCATED },
              ],
            },
            {
              status: { in: [AssetStatus.AVAILABLE, AssetStatus.RETURNED] },
            },
            {
              status: { notIn: [AssetStatus.RETIRED, AssetStatus.SCRAPPED, AssetStatus.UNDER_REPAIR] },
            },
          ],
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
          allocationStatus: true,
          location: true,
        },
        orderBy: [{ companyAssetId: { sort: 'asc', nulls: 'last' } }, { assetCode: 'asc' }],
      }),

      // Active employees
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

      // Organization Departments
      prisma.department.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),

      // Organization Locations
      prisma.location.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),

      // Approver users (Admin / Manager)
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
      availableAssets,
      employees,
      departments,
      locations,
      approvers,
    };
  }
}
