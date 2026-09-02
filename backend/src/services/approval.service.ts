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
   * Get dynamic approval telemetry aggregates from PostgreSQL
   */
  public static async getApprovalCounts(user: { id: string; role?: { code: string } }) {
    const isAdmin = user?.role?.code === 'ADMIN';
    const isManager = user?.role?.code === 'MANAGER';

    const [total, pending, approved, rejected, changesRequested, myRequests, urgent] = await Promise.all([
      prisma.approvalRequest.count(),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.PENDING } }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.APPROVED } }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.REJECTED } }),
      prisma.approvalRequest.count({ where: { status: ApprovalStatus.CHANGES_REQUESTED } }),
      prisma.approvalRequest.count({ where: { requestedById: user.id } }),
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
          requestedById: { not: user.id },
        },
      });
    } else if (isManager) {
      pendingMyAction = await prisma.approvalRequest.count({
        where: {
          status: ApprovalStatus.PENDING,
          requestedById: { not: user.id },
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
    user: { id: string; role?: { code: string } }
  ) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.ApprovalRequestWhereInput = {};
    const isAdmin = user?.role?.code === 'ADMIN';

    // Queue filter
    if (query.queue === 'my_requests') {
      where.requestedById = user.id;
    } else if (query.queue === 'pending_my_approval') {
      where.status = ApprovalStatus.PENDING;
      where.requestedById = { not: user.id }; // Self-approval blocked
      if (!isAdmin) {
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

    return {
      requests,
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
  public static async getApprovalById(id: string, user: { id: string; role?: { code: string } }) {
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
    const policy = await ApprovalPolicyService.getPolicy(request.requestType);
    const allowSelf = policy?.allowSelfApproval || false;
    const isRequester = request.requestedById === user.id;
    const isAdmin = user?.role?.code === 'ADMIN';
    const isManager = user?.role?.code === 'MANAGER';

    // Capabilities
    const isPending = request.status === ApprovalStatus.PENDING;
    const isChangesReq = request.status === ApprovalStatus.CHANGES_REQUESTED;

    const canApprove =
      isPending &&
      (!isRequester || allowSelf) &&
      (isAdmin || (isManager && (request.targetRole === 'MANAGER' || !request.targetRole)));

    const canReject = canApprove;
    const canRequestChanges = canApprove;
    const canCancel = isRequester && (isPending || isChangesReq);
    const canResubmit = isRequester && isChangesReq;

    return {
      ...request,
      parsedChanges,
      permissions: {
        canApprove,
        canReject,
        canRequestChanges,
        canCancel,
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
  public static async approveRequest(
    id: string,
    data: { comment?: string },
    user: { id: string; role?: { code: string }; username: string }
  ) {
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

      // 2. Self-Approval Protection
      const policy = await ApprovalPolicyService.getPolicy(request.requestType);
      if (request.requestedById === user.id && !policy?.allowSelfApproval) {
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
          if (expected.status !== undefined && currentAsset.status !== expected.status) {
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
            approvedById: user.id,
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
          performedById: user.id,
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
              approvedById: user.id,
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
              approvedById: user.id,
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
          performedById: user.id,
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
          performedById: user.id,
          eventDate: now,
          remarks: `Asset retired/deactivated via approval ${request.requestCode}: ${data.comment || request.reason || ''}`,
        });
      }

      // 6. Update Approval Request State
      const updatedRequest = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.APPROVED,
          decisionById: user.id,
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
          performedById: user.id,
          comment: data.comment || 'Request reviewed and approved.',
        },
      });

      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'EXECUTED',
          performedById: user.id,
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
          userId: user.id,
          action: 'REQUEST_APPROVED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({
            decision: 'APPROVED',
            decisionBy: user.username,
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
    user: { id: string; role?: { code: string }; username: string }
  ) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Approval request not found.');
      if (request.status !== ApprovalStatus.PENDING) {
        throw new Error('This request has already been processed.');
      }

      const policy = await ApprovalPolicyService.getPolicy(request.requestType);
      if (request.requestedById === user.id && !policy?.allowSelfApproval) {
        throw new Error('You cannot reject your own request.');
      }

      const now = new Date();

      const updatedRequest = await tx.approvalRequest.update({
        where: { id },
        data: {
          status: ApprovalStatus.REJECTED,
          rejectionReason: data.rejectionReason,
          decisionById: user.id,
          decisionAt: now,
          decisionComment: data.comment || data.rejectionReason,
        },
      });

      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'REJECTED',
          performedById: user.id,
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
          userId: user.id,
          action: 'REQUEST_REJECTED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({
            decision: 'REJECTED',
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
    user: { id: string; role?: { code: string }; username: string }
  ) {
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
          decisionById: user.id,
          decisionAt: now,
          decisionComment: data.comment || data.changesRequested,
        },
      });

      await tx.approvalHistory.create({
        data: {
          approvalRequestId: id,
          step: request.currentStep,
          action: 'CHANGES_REQUESTED',
          performedById: user.id,
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
          userId: user.id,
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
    userId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Approval request not found.');
      if (request.status !== ApprovalStatus.CHANGES_REQUESTED) {
        throw new Error('Only requests with changes requested can be resubmitted.');
      }
      if (request.requestedById !== userId) {
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
          performedById: userId,
          comment: data.remarks || `Proposal revised (Version ${request.version + 1}).`,
          snapshot: newProposedChangesStr,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
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
   * Cancel an approval request by the requester
   */
  public static async cancelRequest(id: string, data: { cancellationReason: string }, userId: string) {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({ where: { id } });
      if (!request) throw new Error('Approval request not found.');
      if (
        request.status !== ApprovalStatus.PENDING &&
        request.status !== ApprovalStatus.CHANGES_REQUESTED
      ) {
        throw new Error(`Cannot cancel a request that is already ${request.status}.`);
      }
      if (request.requestedById !== userId) {
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
          performedById: userId,
          comment: `Cancelled by requester: ${data.cancellationReason}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'REQUEST_CANCELLED',
          entityType: 'ApprovalRequest',
          entityId: id,
          newValue: JSON.stringify({ cancellationReason: data.cancellationReason }),
        },
      });

      return updated;
    });
  }
}
