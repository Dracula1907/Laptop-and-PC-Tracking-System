import prisma from '../config/prisma';
import {
  ApprovalRequestType,
  ApprovalStatus,
  ApprovalPriority,
  AssetStatus,
  AllocationStatus,
  AssetCondition,
  AssetAction,
  WorkflowStatus,
  MaintenanceStatus,
  RetirementStatus,
  Prisma,
} from '@prisma/client';

import { HistoryService } from './history.service';
import { ApprovalPolicyService } from './approval-policy.service';

export class ApprovalService {
  /**
   * Helper for generating sequential approval codes: APR-000001
   */
  public static async generateRequestCode(): Promise<string> {
    const records = await prisma.approvalRequest.findMany({
      where: { requestCode: { startsWith: 'APR-' } },
      select: { requestCode: true },
    });

    let maxNum = 0;
    for (const r of records) {
      if (r.requestCode) {
        const match = r.requestCode.match(/^APR-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    return `APR-${String(maxNum + 1).padStart(6, '0')}`;
  }

  /**
   * Helper to normalize user payload across JWT and ORM user objects
   */
  public static normalizeUser(user: any): { id: string; userId: string; roleCode: string; username: string } {
    const id = user?.userId || user?.id || '';
    const roleCode = user?.roleCode || user?.role?.code || '';
    const username = user?.username || 'system';
    return { id, userId: id, roleCode, username };
  }

  /**
   * Get dynamic approval telemetry aggregates from PostgreSQL
   */
  public static async getApprovalCounts(user: any) {
    const { id, roleCode } = this.normalizeUser(user);
    const isAdmin = roleCode === 'ADMIN';
    const isDirector = roleCode === 'DIRECTOR';
    const isManager = roleCode === 'MANAGER';

    const [total, pending, approved, rejected, changesRequested, myRequests, urgent] = await Promise.all([
      prisma.approvalRequest.count(),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.PENDING } }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.APPROVED } }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.REJECTED } }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.CHANGES_REQUESTED } }),
      prisma.approvalRequest.count({ where: { requestedById: id } }),
      prisma.approvalRequest.count({
        where: {
          status: ApprovalStatus.PENDING,
          priority: ApprovalPriority.URGENT,
        },
      }),
    ]);

    // Pending My Action: Requests pending where user is authorized to approve (and not self unless allowed)
    let pendingMyAction = 0;
    if (isAdmin) {
      pendingMyAction = await prisma.approvalRequest.count({
        where: {
          status: ApprovalStatus.PENDING,
          requestedById: { not: id },
        },
      });
    } else if (isDirector) {
      pendingMyAction = await prisma.approvalRequest.count({
        where: {
          status: ApprovalStatus.PENDING,
          requestedById: { not: id },
          OR: [{ targetRole: 'DIRECTOR' }, { targetRole: 'MANAGER' }, { targetRole: null }],
        },
      });
    } else if (isManager) {
      pendingMyAction = await prisma.approvalRequest.count({
        where: {
          status: ApprovalStatus.PENDING,
          requestedById: { not: id },
          OR: [{ targetRole: 'MANAGER' }, { targetRole: null }],
        },
      });
    }

    return {
      total,
      pending,
      pendingMyAction,
      approved,
      rejected,
      changesRequested,
      myRequests,
      urgent,
    };
  }

  /**
   * Search, filter, and paginate approval requests
   */
  public static async getApprovals(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      queue?: 'pending_my_approval' | 'my_requests' | 'all';
      requestType?: string;
      status?: string;
      priority?: string;
      departmentId?: string;
      fromDate?: string;
      toDate?: string;
    },
    user: any
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.ApprovalRequestWhereInput = {};
    const { id, roleCode } = this.normalizeUser(user);
    const isAdmin = roleCode === 'ADMIN';
    const isDirector = roleCode === 'DIRECTOR';
    const isManager = roleCode === 'MANAGER';

    // Queue filter
    if (query.queue === 'my_requests') {
      where.requestedById = id;
    } else if (query.queue === 'pending_my_approval') {
      where.status = ApprovalStatus.PENDING;
      where.requestedById = { not: id }; // Self-approval blocked
      if (isAdmin) {
        // Admin sees all pending
      } else if (isDirector) {
        where.OR = [{ targetRole: 'DIRECTOR' }, { targetRole: 'MANAGER' }, { targetRole: null }];
      } else if (isManager) {
        where.OR = [{ targetRole: 'MANAGER' }, { targetRole: null }];
      }
    }

    // Type filter
    if (query.requestType && query.requestType !== 'ALL') {
      where.requestType = query.requestType as ApprovalRequestType;
    }

    // Status filter
    if (query.status && query.status !== 'ALL') {
      where.status = query.status as ApprovalStatus;
    }

    // Priority filter
    if (query.priority && query.priority !== 'ALL') {
      where.priority = query.priority as ApprovalPriority;
    }

    // Department filter
    if (query.departmentId && query.departmentId !== 'ALL') {
      where.targetDepartmentId = query.departmentId;
    }

    // Date Range
    if (query.fromDate || query.toDate) {
      where.requestedAt = {};
      if (query.fromDate) where.requestedAt.gte = new Date(query.fromDate);
      if (query.toDate) {
        const to = new Date(query.toDate);
        to.setHours(23, 59, 59, 999);
        where.requestedAt.lte = to;
      }
    }

    // Search across 8 fields
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { requestCode: { contains: s, mode: 'insensitive' } },
        { reason: { contains: s, mode: 'insensitive' } },
        { comments: { contains: s, mode: 'insensitive' } },
        { decisionComment: { contains: s, mode: 'insensitive' } },
        { asset: { companyAssetId: { contains: s, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: s, mode: 'insensitive' } } },
        { asset: { model: { contains: s, mode: 'insensitive' } } },
        { requestedBy: { username: { contains: s, mode: 'insensitive' } } },
        { requestedBy: { employee: { fullName: { contains: s, mode: 'insensitive' } } } },
      ];
    }

    const [total, requests] = await Promise.all([
      prisma.approvalRequest.count({ where }),
      prisma.approvalRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: query.queue === 'pending_my_approval' ? [{ priority: 'desc' }, { requestedAt: 'asc' }] : { createdAt: 'desc' },
        include: {
          asset: {
            include: {
              department: true,
              locationRel: true,
              currentHolder: true,
            },
          },
          requestedBy: {
            include: { employee: true },
          },
          decisionBy: {
            include: { employee: true },
          },
          targetDepartment: true,
        },
      }),
    ]);

    const formattedRequests = requests.map((r) => {
      let parsedChanges: any = null;
      try {
        parsedChanges = JSON.parse(r.proposedChanges);
      } catch {
        parsedChanges = r.proposedChanges;
      }
      return {
        ...r,
        parsedChanges,
      };
    });

    return {
      requests: formattedRequests,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single approval request by ID with complete diff, history, and capability flags
   */
  public static async getApprovalById(id: string, user: any) {
    const request = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            department: true,
            locationRel: true,
            currentHolder: true,
            specifications: true,
          },
        },
        requestedBy: {
          include: { employee: true, role: true },
        },
        decisionBy: {
          include: { employee: true, role: true },
        },
        targetDepartment: true,
        history: {
          orderBy: { createdAt: 'asc' },
          include: {
            performedBy: {
              include: { employee: true, role: true },
            },
          },
        },
      },
    });

    if (!request) throw new Error('Approval request not found.');

    // Parse proposed changes
    let parsedChanges: any = null;
    try {
      parsedChanges = JSON.parse(request.proposedChanges);
    } catch {
      parsedChanges = request.proposedChanges;
    }

    // Check policy for self-approval permission
    const { id: currentUserId, roleCode } = this.normalizeUser(user);
    const policy = await ApprovalPolicyService.getPolicy(request.requestType);
    const allowSelf = policy?.allowSelfApproval || false;
    const isRequester = request.requestedById === currentUserId;
    const isAdmin = roleCode === 'ADMIN';
    const isDirector = roleCode === 'DIRECTOR';
    const isManager = roleCode === 'MANAGER';

    // Capabilities
    const isPending = request.status === ApprovalStatus.PENDING;
    const isChangesReq = request.status === ApprovalStatus.CHANGES_REQUESTED;

    const canApprove =
      isPending &&
      (!isRequester || allowSelf) &&
      (isAdmin ||
        isDirector ||
        (isManager && request.targetRole !== 'DIRECTOR' && (request.targetRole === 'MANAGER' || !request.targetRole)));

    const canReject = canApprove;
    const canRequestChanges = canApprove;
    const canEdit = (isPending || isChangesReq) && (isRequester || isAdmin);
    const canCancel = (isPending || isChangesReq) && (isRequester || isAdmin);
    const canDelete =
      (isAdmin && (request.status === ApprovalStatus.CANCELLED || request.status === ApprovalStatus.REJECTED || isPending)) ||
      (isRequester && isPending);
    const canResubmit = isRequester && isChangesReq;

    return {
      ...request,
      parsedChanges,
      permissions: {
        canApprove,
        canReject,
        canRequestChanges,
        canEdit,
        canCancel,
        canDelete,
        canResubmit,
      },
    };
  }

  /**
   * Submit an operation for approval
   */
  public static async createApprovalRequest(
    data: {
      requestType: ApprovalRequestType;
      relatedEntityType?: string;
      relatedEntityId?: string;
      assetId?: string;
      priority?: ApprovalPriority;
      reason?: string;
      comments?: string;
      targetRole?: string;
      targetDepartmentId?: string;
      proposedChanges: any;
      expectedSourceState?: any;
    },
    userId: string
  ) {
    const policy = await ApprovalPolicyService.getPolicy(data.requestType);
    const requestCode = await this.generateRequestCode();

    let deadline: Date | null = null;
    if (policy?.autoExpireDays) {
      deadline = new Date();
      deadline.setDate(deadline.getDate() + policy.autoExpireDays);
    }

    const proposedChangesStr =
      typeof data.proposedChanges === 'string' ? data.proposedChanges : JSON.stringify(data.proposedChanges);
    const expectedSourceStateStr = data.expectedSourceState ? JSON.stringify(data.expectedSourceState) : null;

    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.create({
        data: {
          requestCode,
          requestType: data.requestType,
          relatedEntityType: data.relatedEntityType || null,
          relatedEntityId: data.relatedEntityId || null,
          assetId: data.assetId || null,
          requestedById: userId,
          requestedAt: new Date(),
          status: ApprovalStatus.PENDING,
          priority: data.priority || ApprovalPriority.MEDIUM,
          reason: data.reason || null,
          comments: data.comments || null,
          targetRole: data.targetRole || policy?.approverRole || 'MANAGER',
          targetDepartmentId: data.targetDepartmentId || null,
          proposedChanges: proposedChangesStr,
          expectedSourceState: expectedSourceStateStr,
          approvalDeadline: deadline,
          version: 1,
        },
        include: {
          asset: true,
          requestedBy: { include: { employee: true } },
          targetDepartment: true,
        },
      });

      // 1. Initial Timeline Entry
      await tx.approvalHistory.create({
        data: {
          approvalRequestId: request.id,
          step: 1,
          action: 'SUBMITTED',
          performedById: userId,
          comment: data.comments || 'Operation submitted for administrative approval.',
          snapshot: proposedChangesStr,
        },
      });

      // 2. Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'REQUEST_CREATED',
          entityType: 'ApprovalRequest',
          entityId: request.id,
          newValue: JSON.stringify({
            requestCode,
            requestType: request.requestType,
            assetId: request.assetId,
            priority: request.priority,
          }),
        },
      });

      // 3. System Notification for approvers
      const targetUsers = await tx.user.findMany({
        where: {
          isActive: true,
          id: { not: userId },
          role: { code: { in: ['ADMIN', request.targetRole || 'MANAGER'] } },
        },
        select: { id: true },
      });

      for (const u of targetUsers) {
        await tx.notification.create({
          data: {
            userId: u.id,
            type: 'NEW_APPROVAL_REQUEST',
            title: `New Approval Request: ${request.requestCode}`,
            message: `A new ${request.requestType} request (${request.requestCode}) requires your review.`,
            entityType: 'ApprovalRequest',
            entityId: request.id,
          },
        });
      }

      return request;
    });
  }

  /**
   * Approve and execute the underlying IT asset operation
   */
  /**
   * Approve and execute the underlying IT asset operation
   */
  public static async approveRequest(
    id: string,
    data: { comment?: string },
    user: any
  ) {
    const { id: effectiveUserId, username: effectiveUsername } = this.normalizeUser(user);

    return await prisma.$transaction(async (tx) => {
      // 1. Concurrency Check
      const request = await tx.approvalRequest.findUnique({
        where: { id },
        include: {
          asset: {
            include: { department: true, locationRel: true, currentHolder: true },
          },
        },
      });

      if (!request) throw new Error('Approval request not found.');
      if (request.status !== ApprovalStatus.PENDING) {
        throw new Error('This request has already been processed.');
      }

      // 2. Role Authorization & Self-Approval Protection
      const { roleCode } = this.normalizeUser(user);
      const isAdmin = roleCode === 'ADMIN';
      const isDirector = roleCode === 'DIRECTOR';

      if (request.targetRole === 'DIRECTOR' || request.requestType === ApprovalRequestType.MAINTENANCE) {
        if (!isAdmin && !isDirector) {
          throw new Error('Forbidden: Only Director or System Administrator can approve maintenance requests.');
        }
      }

      const policy = await ApprovalPolicyService.getPolicy(request.requestType);
      if (request.requestedById === effectiveUserId && !policy?.allowSelfApproval) {
        throw new Error('You cannot approve your own request.');
      }

      // 3. Stale Request Protection
      if (request.assetId && request.expectedSourceState && request.asset) {
        try {
          const expected = JSON.parse(request.expectedSourceState);
          const currentAsset = request.asset;
          if (expected.holderId !== undefined && (currentAsset.currentHolderId || null) !== (expected.holderId || null)) {
            throw new Error('This request is no longer valid because the asset state has changed.');
          }
          if (expected.departmentId !== undefined && (currentAsset.departmentId || null) !== (expected.departmentId || null)) {
            throw new Error('This request is no longer valid because the asset state has changed.');
          }
          if (expected.locationId !== undefined && (currentAsset.locationId || null) !== (expected.locationId || null)) {
            throw new Error('This request is no longer valid because the asset state has changed.');
          }
          if (
            expected.status !== undefined &&
            currentAsset.status !== expected.status &&
            !(request.requestType === ApprovalRequestType.MAINTENANCE && currentAsset.status === AssetStatus.UNDER_REPAIR)
          ) {
            throw new Error('This request is no longer valid because the asset state has changed.');
          }
        } catch (e: any) {
          if (e.message.includes('no longer valid')) throw e;
        }
      }

      // 4. Parse proposed changes
      let changes: any = {};
      try {
        changes = JSON.parse(request.proposedChanges);
      } catch {
        changes = {};
      }

      const now = new Date();

      // 5. Execute Business Action based on requestType
      if (request.requestType === ApprovalRequestType.ASSIGNMENT && request.assetId) {
        const { employeeId, departmentId, locationId, conditionAtAssignment, reason } = changes;
        const employee = await tx.employee.findUnique({ where: { id: employeeId } });
        if (!employee) throw new Error('Target employee not found for assignment.');

        const asgRecords = await tx.assetAssignment.findMany({
          where: { assignmentCode: { startsWith: 'ASG-' } },
          select: { assignmentCode: true },
        });
        let maxNum = 0;
        for (const a of asgRecords) {
          if (a.assignmentCode) {
            const m = a.assignmentCode.match(/^ASG-(\d+)$/);
            if (m) {
              const num = parseInt(m[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        }
        const assignmentCode = `ASG-${String(maxNum + 1).padStart(6, '0')}`;

        await tx.assetAssignment.create({
          data: {
            assignmentCode,
            assetId: request.assetId,
            employeeId,
            departmentId: departmentId || employee.departmentId,
            locationId: locationId || employee.locationId,
            assignedById: request.requestedById,
            approvedById: effectiveUserId,
            assignedAt: now,
            conditionAtAssignment: conditionAtAssignment || AssetCondition.GOOD,
            reason: reason || 'Approved through Approval Center',
            status: WorkflowStatus.ACTIVE,
          },
        });

        await tx.asset.update({
          where: { id: request.assetId },
          data: {
            status: AssetStatus.ASSIGNED,
            allocationStatus: AllocationStatus.ALLOCATED,
            sourceAllocationStatus: 'Allocated',
            currentHolderId: employeeId,
            employeeNameSource: employee.fullName,
            departmentId: departmentId || employee.departmentId,
            locationId: locationId || employee.locationId,
            dateOfAllocation: now,
          },
        });

        await HistoryService.recordEvent(tx, {
          assetId: request.assetId,
          action: AssetAction.ASSET_ASSIGNED,
          newStatus: AssetStatus.ASSIGNED,
          newHolderId: employeeId,
          newHolderName: employee.fullName,
          newDepartmentId: departmentId || employee.departmentId,
          newLocationId: locationId || employee.locationId,
          performedById: effectiveUserId,
          eventDate: now,
          remarks: `Assignment approved via request ${request.requestCode}`,
        });
      } else if (request.requestType === ApprovalRequestType.TRANSFER && request.assetId) {
        const { newHolderId, newDepartmentId, newLocationId, reason, conditionAfter } = changes;
        const newHolder = newHolderId ? await tx.employee.findUnique({ where: { id: newHolderId } }) : null;

        // Close previous assignment
        if (request.asset?.currentHolderId) {
          await tx.assetAssignment.updateMany({
            where: {
              assetId: request.assetId,
              employeeId: request.asset.currentHolderId,
              status: WorkflowStatus.ACTIVE,
            },
            data: {
              status: WorkflowStatus.RETURNED,
              actualReturnDate: now,
            },
          });
        }

        // Open new assignment if assigned to person
        if (newHolder) {
          const asgRecords = await tx.assetAssignment.findMany({
            where: { assignmentCode: { startsWith: 'ASG-' } },
            select: { assignmentCode: true },
          });
          let maxNum = 0;
          for (const a of asgRecords) {
            if (a.assignmentCode) {
              const m = a.assignmentCode.match(/^ASG-(\d+)$/);
              if (m) {
                const num = parseInt(m[1], 10);
                if (num > maxNum) maxNum = num;
              }
            }
          }
          const asgCode = `ASG-${String(maxNum + 1).padStart(6, '0')}`;

          await tx.assetAssignment.create({
            data: {
              assignmentCode: asgCode,
              assetId: request.assetId,
              employeeId: newHolder.id,
              departmentId: newDepartmentId || newHolder.departmentId,
              locationId: newLocationId || newHolder.locationId,
              assignedById: request.requestedById,
              approvedById: effectiveUserId,
              assignedAt: now,
              reason: reason || 'Approved transfer assignment',
              status: WorkflowStatus.ACTIVE,
            },
          });
        }

        // Update transfer record if one exists
        if (request.relatedEntityId) {
          await tx.assetTransfer.updateMany({
            where: { id: request.relatedEntityId },
            data: {
              status: WorkflowStatus.COMPLETED,
              approvedById: effectiveUserId,
            },
          });
        }

        const isAllocated = !!newHolder;
        await tx.asset.update({
          where: { id: request.assetId },
          data: {
            currentHolderId: newHolder ? newHolder.id : null,
            employeeNameSource: newHolder ? newHolder.fullName : null,
            departmentId: newDepartmentId || (newHolder ? newHolder.departmentId : null),
            locationId: newLocationId || (newHolder ? newHolder.locationId : null),
            condition: conditionAfter || request.asset?.condition || AssetCondition.GOOD,
            allocationStatus: isAllocated ? AllocationStatus.ALLOCATED : AllocationStatus.NOT_ALLOCATED,
            sourceAllocationStatus: isAllocated ? 'Allocated' : 'Not Allocated',
            dateOfAllocation: isAllocated ? now : request.asset?.dateOfAllocation,
            dateOfDeallocation: isAllocated ? null : now,
          },
        });

        await HistoryService.recordEvent(tx, {
          assetId: request.assetId,
          action: AssetAction.TRANSFERRED,
          previousHolderId: request.asset?.currentHolderId || null,
          previousHolderName: request.asset?.currentHolder?.fullName || request.asset?.employeeNameSource || 'IT STOCK',
          newHolderId: newHolder ? newHolder.id : null,
          newHolderName: newHolder ? newHolder.fullName : 'IT STOCK',
          previousDepartmentId: request.asset?.departmentId || null,
          newDepartmentId: newDepartmentId || null,
          previousLocationId: request.asset?.locationId || null,
          newLocationId: newLocationId || null,
          performedById: effectiveUserId,
          eventDate: now,
          remarks: `Transfer approved via request ${request.requestCode}`,
        });
      } else if (
        (request.requestType === ApprovalRequestType.ASSET_RETIREMENT ||
          request.requestType === ApprovalRequestType.ASSET_DEACTIVATION) &&
        request.assetId
      ) {
        await tx.asset.update({
          where: { id: request.assetId },
          data: {
            status: AssetStatus.RETIRED,
            allocationStatus: AllocationStatus.NOT_ALLOCATED,
            sourceAllocationStatus: 'Not Allocated',
            currentHolderId: null,
            employeeNameSource: null,
            dateOfDeallocation: now,
          },
        });

        await HistoryService.recordEvent(tx, {
          assetId: request.assetId,
          action: AssetAction.RETIRED,
          previousStatus: request.asset?.status,
          newStatus: AssetStatus.RETIRED,
          performedById: effectiveUserId,
          eventDate: now,
          remarks: `Asset retired/deactivated via approval ${request.requestCode}: ${data.comment || request.reason || ''}`,
        });

        // Update linked Retirement record status
        await tx.retirement.updateMany({
          where: { approvalRequestId: request.id },
          data: { status: RetirementStatus.APPROVED },
        });
      } else if (request.requestType === ApprovalRequestType.RETURN_DISPOSITION && request.assetId) {
        const { disposition, conditionAtReturn } = changes;
        const nextStatus =
          disposition === 'RETIRED' || disposition === 'SCRAPPED'
            ? AssetStatus.RETIRED
            : AssetStatus.AVAILABLE;

        await tx.asset.update({
          where: { id: request.assetId },
          data: {
            status: nextStatus,
            allocationStatus: AllocationStatus.NOT_ALLOCATED,
            sourceAllocationStatus: 'Not Allocated',
            currentHolderId: null,
            employeeNameSource: null,
            condition: conditionAtReturn || request.asset?.condition || AssetCondition.GOOD,
            dateOfDeallocation: now,
          },
        });

        if (request.relatedEntityId) {
          await tx.assetReturn.updateMany({
            where: { id: request.relatedEntityId },
            data: {
              status: WorkflowStatus.COMPLETED,
              disposition: disposition || 'RETURN_TO_STOCK',
              approvedById: effectiveUserId,
            },
          });
        }

        await HistoryService.recordEvent(tx, {
          assetId: request.assetId,
          action: AssetAction.RETURNED,
          previousStatus: request.asset?.status,
          newStatus: nextStatus,
          performedById: effectiveUserId,
          eventDate: now,
          remarks: `Return disposition approved via request ${request.requestCode}: ${disposition || 'Completed'}`,
        });
      } else if (request.requestType === ApprovalRequestType.ASSET_STATUS_CHANGE && request.assetId) {
        const { targetStatus, reason } = changes;
        if (targetStatus) {
          await tx.asset.update({
            where: { id: request.assetId },
            data: { status: targetStatus },
          });

          await HistoryService.recordEvent(tx, {
            assetId: request.assetId,
            action: AssetAction.STATUS_CHANGED,
            previousStatus: request.asset?.status,
            newStatus: targetStatus,
            performedById: effectiveUserId,
            eventDate: now,
            remarks: `Asset status changed via approval ${request.requestCode}: ${reason || ''}`,
          });
        }
      } else if (request.requestType === ApprovalRequestType.MAINTENANCE_COMPLETION) {
        if (request.relatedEntityId) {
          await tx.maintenanceRecord.updateMany({
            where: { id: request.relatedEntityId },
            data: {
              repairStatus: MaintenanceStatus.COMPLETED,
              repairEndDate: now,
              approvedById: effectiveUserId,
            },
          });
        }
        if (request.assetId) {
          await tx.asset.update({
            where: { id: request.assetId },
            data: { status: AssetStatus.AVAILABLE },
          });

          await HistoryService.recordEvent(tx, {
            assetId: request.assetId,
            action: AssetAction.MAINTENANCE_COMPLETED,
            previousStatus: AssetStatus.UNDER_REPAIR,
            newStatus: AssetStatus.AVAILABLE,
            performedById: effectiveUserId,
            eventDate: now,
            remarks: `Maintenance ticket completed via approval ${request.requestCode}`,
          });
        }
      } else if (request.requestType === ApprovalRequestType.MAINTENANCE) {
        if (request.relatedEntityId) {
          await tx.maintenanceRecord.updateMany({
            where: { id: request.relatedEntityId },
            data: {
              approvalStatus: 'APPROVED',
              approvedById: effectiveUserId,
            },
          });
        }
        if (request.assetId) {
          await HistoryService.recordEvent(tx, {
            assetId: request.assetId,
            action: AssetAction.MAINTENANCE_UPDATED,
            performedById: effectiveUserId,
            eventDate: now,
            remarks: `Maintenance approved by Director (${effectiveUsername}): ${request.requestCode}. Proposed cost: INR ${(changes.proposedCost || changes.estimatedCost || 0).toLocaleString()}`,
          });
        }
      } else if (request.requestType === ApprovalRequestType.SENSITIVE_UPDATE && request.assetId) {
        const updatePayload: any = {};
        if (changes.serialNumber !== undefined) updatePayload.serialNumber = changes.serialNumber;
        if (changes.companyAssetId !== undefined) updatePayload.companyAssetId = changes.companyAssetId;
        if (changes.assetName !== undefined) updatePayload.assetName = changes.assetName;
        if (changes.model !== undefined) updatePayload.model = changes.model;

        if (Object.keys(updatePayload).length > 0) {
          await tx.asset.update({
            where: { id: request.assetId },
            data: updatePayload,
          });

          await HistoryService.recordEvent(tx, {
            assetId: request.assetId,
            action: AssetAction.HARDWARE_CHANGED,
            performedById: effectiveUserId,
            eventDate: now,
            remarks: `Sensitive asset details updated via approval ${request.requestCode}`,
          });
        }
      }

      // 6. Update Approval Request State
      const updatedRequest = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          decisionById: effectiveUserId,
          decisionAt: now,
          decisionComment: data.comment || null,
        },
      });

      // 7. Timeline Entry
      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'APPROVED',
          performedById: effectiveUserId,
          comment: data.comment || 'Request reviewed and approved.',
        },
      });

      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'EXECUTED',
          performedById: effectiveUserId,
          comment: 'Operation executed and state synchronized in inventory.',
        },
      });

      // 8. Notification to Requester
      await tx.notification.create({
        data: {
          userId: request.requestedById,
          type: 'APPROVAL_APPROVED',
          title: `Request Approved: ${request.requestCode}`,
          message: `Your ${request.requestType} request (${request.requestCode}) has been approved and executed.`,
          entityType: 'ApprovalRequest',
          entityId: request.id,
        },
      });

      // 9. Audit Log
      await tx.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: 'REQUEST_APPROVED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({
            decision: 'APPROVED',
            decisionBy: effectiveUsername,
            comment: data.comment,
          }),
        },
      });

      return updatedRequest;
    });
  }

  /**
   * Reject an approval request
   */
  public static async rejectRequest(
    id: string,
    data: { rejectionReason: string; comment?: string },
    user: any
  ) {
    const { id: effectiveUserId, username: effectiveUsername } = this.normalizeUser(user);

    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Approval request not found.');
      if (request.status !== ApprovalStatus.PENDING) {
        throw new Error('This request has already been processed.');
      }

      // 2. Role Authorization & Self-Approval Protection
      const { roleCode } = this.normalizeUser(user);
      const isAdmin = roleCode === 'ADMIN';
      const isDirector = roleCode === 'DIRECTOR';

      if (request.targetRole === 'DIRECTOR' || request.requestType === ApprovalRequestType.MAINTENANCE) {
        if (!isAdmin && !isDirector) {
          throw new Error('Forbidden: Only Director or System Administrator can reject maintenance requests.');
        }
      }

      const policy = await ApprovalPolicyService.getPolicy(request.requestType);
      if (request.requestedById === effectiveUserId && !policy?.allowSelfApproval) {
        throw new Error('You cannot reject your own request.');
      }

      const now = new Date();

      const updatedRequest = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          rejectionReason: data.rejectionReason,
          decisionById: effectiveUserId,
          decisionAt: now,
          decisionComment: data.comment || data.rejectionReason,
        },
      });

      // Update linked Retirement record status if applicable
      if (request.requestType === ApprovalRequestType.ASSET_RETIREMENT) {
        await tx.retirement.updateMany({
          where: { approvalRequestId: request.id },
          data: { status: RetirementStatus.REJECTED },
        });
      }

      // Update linked Transfer record status if applicable
      if (request.requestType === ApprovalRequestType.TRANSFER && request.relatedEntityId) {
        await tx.assetTransfer.updateMany({
          where: { id: request.relatedEntityId },
          data: { status: WorkflowStatus.CANCELLED },
        });
      }

      // Update linked Maintenance record status if applicable
      if (request.requestType === ApprovalRequestType.MAINTENANCE && request.relatedEntityId) {
        await tx.maintenanceRecord.updateMany({
          where: { id: request.relatedEntityId },
          data: {
            approvalStatus: 'REJECTED',
            rejectionReason: data.rejectionReason,
          },
        });
        if (request.assetId) {
          await HistoryService.recordEvent(tx, {
            assetId: request.assetId,
            action: AssetAction.MAINTENANCE_UPDATED,
            performedById: effectiveUserId,
            eventDate: now,
            remarks: `Maintenance rejected by Director (${effectiveUsername}): ${request.requestCode}. Reason: ${data.rejectionReason}`,
          });
        }
      }

      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'REJECTED',
          performedById: effectiveUserId,
          comment: `Rejected: ${data.rejectionReason}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: request.requestedById,
          type: 'APPROVAL_REJECTED',
          title: `Request Rejected: ${request.requestCode}`,
          message: `Your ${request.requestType} request (${request.requestCode}) was rejected: ${data.rejectionReason}`,
          entityType: 'ApprovalRequest',
          entityId: request.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: 'REQUEST_REJECTED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({
            decision: 'REJECTED',
            decisionBy: effectiveUsername,
            rejectionReason: data.rejectionReason,
          }),
        },
      });

      return updatedRequest;
    });
  }

  /**
   * Request changes on a pending proposal
   */
  public static async requestChanges(
    id: string,
    data: { changesRequested: string; comment?: string },
    user: any
  ) {
    const { id: effectiveUserId } = this.normalizeUser(user);

    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Approval request not found.');
      if (request.status !== ApprovalStatus.PENDING) {
        throw new Error('This request has already been processed.');
      }

      const now = new Date();

      const updated = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.CHANGES_REQUESTED,
          changesRequested: data.changesRequested,
          decisionById: effectiveUserId,
          decisionAt: now,
          decisionComment: data.comment || data.changesRequested,
        },
      });

      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'CHANGES_REQUESTED',
          performedById: effectiveUserId,
          comment: `Changes Requested: ${data.changesRequested}`,
        },
      });

      await tx.notification.create({
        data: {
          userId: request.requestedById,
          type: 'CHANGES_REQUESTED',
          title: `Modifications Requested: ${request.requestCode}`,
          message: `Reviewer requested changes on ${request.requestCode}: ${data.changesRequested}`,
          entityType: 'ApprovalRequest',
          entityId: request.id,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: 'REQUEST_CHANGES_REQUESTED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({ changesRequested: data.changesRequested }),
        },
      });

      return updated;
    });
  }

  /**
   * Resubmit proposal with modified changes
   */
  public static async resubmitRequest(
    id: string,
    data: { proposedChanges?: any; remarks?: string },
    user: any
  ) {
    const { id: effectiveUserId } = this.normalizeUser(user);

    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Approval request not found.');
      if (request.status !== ApprovalStatus.CHANGES_REQUESTED) {
        throw new Error('Only requests with changes requested can be resubmitted.');
      }
      if (request.requestedById !== effectiveUserId) {
        throw new Error('Only the original requester can resubmit this proposal.');
      }

      let newProposedChangesStr = request.proposedChanges;
      if (data.proposedChanges) {
        newProposedChangesStr =
          typeof data.proposedChanges === 'string'
            ? data.proposedChanges
            : JSON.stringify(data.proposedChanges);
      }

      const updated = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.PENDING,
          proposedChanges: newProposedChangesStr,
          version: request.version + 1,
          changesRequested: null,
          decisionById: null,
          decisionAt: null,
          decisionComment: null,
        },
      });

      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'RESUBMITTED',
          performedById: effectiveUserId,
          comment: data.remarks || `Proposal revised (Version ${request.version + 1}).`,
          snapshot: newProposedChangesStr,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: 'REQUEST_RESUBMITTED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({ version: request.version + 1 }),
        },
      });

      return updated;
    });
  }

  /**
   * Cancel an approval request by the requester or admin
   */
  public static async cancelRequest(id: string, data: { cancellationReason: string }, user: any) {
    const { id: effectiveUserId, roleCode } = this.normalizeUser(user);
    const isAdmin = roleCode === 'ADMIN';

    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Approval request not found.');
      if (
        request.status !== ApprovalStatus.PENDING &&
        request.status !== ApprovalStatus.CHANGES_REQUESTED
      ) {
        throw new Error(`Cannot cancel a request that is already ${request.status}.`);
      }
      if (request.requestedById !== effectiveUserId && !isAdmin) {
        throw new Error('You are not authorized to cancel this request.');
      }

      const now = new Date();

      const updated = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.CANCELLED,
          cancellationReason: data.cancellationReason,
          cancelledAt: now,
        },
      });

      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'CANCELLED',
          performedById: effectiveUserId,
          comment: `Cancelled: ${data.cancellationReason}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: 'REQUEST_CANCELLED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({ cancellationReason: data.cancellationReason }),
        },
      });

      return updated;
    });
  }

  /**
   * Edit an existing approval request (PENDING or CHANGES_REQUESTED)
   */
  public static async updateApprovalRequest(
    id: string,
    data: {
      priority?: ApprovalPriority;
      reason?: string;
      comments?: string;
      targetDepartmentId?: string | null;
      proposedChanges?: any;
    },
    user: any
  ) {
    const { id: effectiveUserId, roleCode } = this.normalizeUser(user);
    const isAdmin = roleCode === 'ADMIN';

    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Approval request not found.');

      if (request.status === ApprovalStatus.APPROVED) {
        throw new Error(
          'Cannot edit an approved request because its lifecycle workflow has already been executed.'
        );
      }
      if (request.status === ApprovalStatus.REJECTED || request.status === ApprovalStatus.CANCELLED) {
        throw new Error(`Cannot edit a request that is already ${request.status}.`);
      }

      const isRequester = request.requestedById === effectiveUserId;
      if (!isRequester && !isAdmin) {
        throw new Error('You are not authorized to edit this approval request.');
      }

      const updateData: Prisma.ApprovalRequestUpdateInput = {};
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.reason !== undefined) updateData.reason = data.reason;
      if (data.comments !== undefined) updateData.comments = data.comments;
      if (data.targetDepartmentId !== undefined) {
        updateData.targetDepartment = data.targetDepartmentId
          ? { connect: { id: data.targetDepartmentId } }
          : { disconnect: true };
      }
      if (data.proposedChanges !== undefined) {
        updateData.proposedChanges =
          typeof data.proposedChanges === 'string'
            ? data.proposedChanges
            : JSON.stringify(data.proposedChanges);
      }

      const updated = await tx.approvalRequest.update({
        where: { id },
        data: updateData,
        include: {
          asset: true,
          requestedBy: { include: { employee: true } },
          targetDepartment: true,
        },
      });

      // Timeline entry
      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'EDITED',
          performedById: effectiveUserId,
          comment: `Request details modified: ${data.reason || 'Updated proposal parameters.'}`,
          snapshot: updateData.proposedChanges ? String(updateData.proposedChanges) : undefined,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: 'REQUEST_EDITED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({
            priority: data.priority,
            reason: data.reason,
            targetDepartmentId: data.targetDepartmentId,
          }),
        },
      });

      return updated;
    });
  }

  /**
   * Delete or Cancel an approval request safely
   */
  public static async deleteApprovalRequest(
    id: string,
    data: { reason?: string; forceDelete?: boolean } = {},
    user: any
  ) {
    const { id: effectiveUserId, roleCode } = this.normalizeUser(user);
    const isAdmin = roleCode === 'ADMIN';

    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id },
        include: { retirements: true, gateMovements: true },
      });
      if (!request) throw new Error('Approval request not found.');

      if (request.status === ApprovalStatus.APPROVED) {
        throw new Error(
          'Cannot delete an approved request. The underlying asset lifecycle operation has already executed and must remain part of the immutable compliance audit trail.'
        );
      }

      const isRequester = request.requestedById === effectiveUserId;
      if (!isRequester && !isAdmin) {
        throw new Error('You are not authorized to delete or cancel this approval request.');
      }

      const now = new Date();
      const cancellationReason = data.reason || 'Cancelled by user';

      // If hard delete requested by ADMIN for unlinked cancelled/rejected/pending requests:
      const canHardDelete =
        isAdmin &&
        data.forceDelete &&
        request.retirements.length === 0 &&
        request.gateMovements.length === 0;

      if (canHardDelete) {
        await tx.approvalHistory.deleteMany({ where: { approvalRequestId: id } });
        await tx.approvalRequest.delete({ where: { id } });

        await tx.auditLog.create({
          data: {
            userId: effectiveUserId,
            action: 'REQUEST_DELETED',
            entityType: 'ApprovalRequest',
            entityId: id,
            newValue: JSON.stringify({ requestCode: request.requestCode, reason: cancellationReason }),
          },
        });

        return {
          success: true,
          message: `Approval request ${request.requestCode} permanently deleted.`,
          deleted: true,
        };
      }

      // Default safe operation: Soft cancellation
      const updated = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.CANCELLED,
          cancellationReason,
          cancelledAt: now,
        },
      });

      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'CANCELLED',
          performedById: effectiveUserId,
          comment: cancellationReason,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: effectiveUserId,
          action: 'REQUEST_CANCELLED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({ requestCode: request.requestCode, cancellationReason }),
        },
      });

      return {
        success: true,
        message: `Approval request ${request.requestCode} cancelled.`,
        deleted: false,
        data: updated,
      };
    });
  }
}
