import prisma from '../config/prisma';
import { MaintenanceStatus, AssetStatus, AssetAction, AssetCondition, WorkflowStatus } from '@prisma/client';
import {
  MaintenanceCreateSchema,
  MaintenanceUpdateSchema,
  MaintenanceAssignSchema,
  MaintenanceDiagnosticSchema,
  MaintenanceRepairSchema,
  MaintenanceCompleteSchema,
  MaintenanceCancelSchema,
} from '../validators/schemas';

export class MaintenanceService {
  /**
   * Generate sequential maintenance code: MNT-000001, MNT-000002...
   */
  private static async generateMaintenanceCode(tx: any): Promise<string> {
    const last = await tx.maintenanceRecord.findFirst({
      where: { maintenanceCode: { startsWith: 'MNT-' } },
      orderBy: { maintenanceCode: 'desc' },
      select: { maintenanceCode: true },
    });

    let nextNum = 1;
    if (last && last.maintenanceCode) {
      const parts = last.maintenanceCode.split('-');
      if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
        nextNum = parseInt(parts[1], 10) + 1;
      }
    }
    return `MNT-${String(nextNum).padStart(6, '0')}`;
  }

  /**
   * Get dynamic PostgreSQL telemetry counters and aging indicators
   */
  static async getMaintenanceCounts() {
    const now = new Date();

    const [all, open, assigned, inProgress, waitingParts, waitingVendor, completed, cancelled, critical, overdue] =
      await Promise.all([
        prisma.maintenanceRecord.count(),
        prisma.maintenanceRecord.count({
          where: { repairStatus: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.REPORTED] } },
        }),
        prisma.maintenanceRecord.count({
          where: { repairStatus: { in: [MaintenanceStatus.ASSIGNED, MaintenanceStatus.APPROVED] } },
        }),
        prisma.maintenanceRecord.count({
          where: { repairStatus: MaintenanceStatus.IN_PROGRESS },
        }),
        prisma.maintenanceRecord.count({
          where: { repairStatus: { in: [MaintenanceStatus.WAITING_PARTS, MaintenanceStatus.WAITING_FOR_PARTS] } },
        }),
        prisma.maintenanceRecord.count({
          where: { repairStatus: MaintenanceStatus.WAITING_VENDOR },
        }),
        prisma.maintenanceRecord.count({
          where: { repairStatus: MaintenanceStatus.COMPLETED },
        }),
        prisma.maintenanceRecord.count({
          where: { repairStatus: MaintenanceStatus.CANCELLED },
        }),
        prisma.maintenanceRecord.count({
          where: {
            priority: 'CRITICAL',
            repairStatus: { notIn: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] },
          },
        }),
        prisma.maintenanceRecord.count({
          where: {
            expectedCompletionDate: { lt: now },
            repairStatus: { notIn: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] },
          },
        }),
      ]);

    return {
      all,
      open,
      assigned,
      inProgress,
      waitingParts,
      waitingVendor,
      completed,
      cancelled,
      critical,
      overdue,
    };
  }

  /**
   * Get maintenance records with search across 11 fields, combined filters, and pagination
   */
  static async getMaintenanceRecords(query: {
    page?: string | number;
    limit?: string | number;
    search?: string;
    status?: string;
    priority?: string;
    maintenanceType?: string;
    assetType?: string;
    technician?: string;
    serviceProvider?: string;
    departmentId?: string;
    locationId?: string;
    underWarranty?: string;
    isOverdue?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, parseInt(String(query.page || 1), 10));
    const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || 25), 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    const now = new Date();

    // Status filter
    if (query.status && query.status !== 'ALL') {
      if (query.status === 'OPEN') {
        where.repairStatus = { in: [MaintenanceStatus.OPEN, MaintenanceStatus.REPORTED] };
      } else if (query.status === 'ASSIGNED') {
        where.repairStatus = { in: [MaintenanceStatus.ASSIGNED, MaintenanceStatus.APPROVED] };
      } else if (query.status === 'WAITING_PARTS') {
        where.repairStatus = { in: [MaintenanceStatus.WAITING_PARTS, MaintenanceStatus.WAITING_FOR_PARTS] };
      } else {
        where.repairStatus = query.status as MaintenanceStatus;
      }
    }

    // Priority filter
    if (query.priority && query.priority !== 'ALL') {
      where.priority = query.priority;
    }

    // Maintenance Type filter
    if (query.maintenanceType) {
      where.maintenanceType = query.maintenanceType;
    }

    // Asset Type filter
    if (query.assetType) {
      where.asset = { ...where.asset, assetType: query.assetType };
    }

    // Department filter
    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    // Location filter
    if (query.locationId) {
      where.locationId = query.locationId;
    }

    // Warranty filter
    if (query.underWarranty !== undefined && query.underWarranty !== '') {
      where.underWarranty = query.underWarranty === 'true' || query.underWarranty === '1';
    }

    // Overdue filter
    if (query.isOverdue === 'true') {
      where.expectedCompletionDate = { lt: now };
      where.repairStatus = { notIn: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] };
    }

    // Search across 11 fields
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { maintenanceCode: { contains: s, mode: 'insensitive' } },
        { issueTitle: { contains: s, mode: 'insensitive' } },
        { issueDescription: { contains: s, mode: 'insensitive' } },
        { technician: { contains: s, mode: 'insensitive' } },
        { serviceProvider: { contains: s, mode: 'insensitive' } },
        { diagnosis: { contains: s, mode: 'insensitive' } },
        { rootCause: { contains: s, mode: 'insensitive' } },
        { repairAction: { contains: s, mode: 'insensitive' } },
        { resolution: { contains: s, mode: 'insensitive' } },
        { asset: { companyAssetId: { contains: s, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: s, mode: 'insensitive' } } },
        { asset: { assetName: { contains: s, mode: 'insensitive' } } },
        { asset: { model: { contains: s, mode: 'insensitive' } } },
        { asset: { serialNumber: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    const sortBy = query.sortBy || 'reportedAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const orderBy: any = {};
    if (sortBy === 'assetId') {
      orderBy.asset = { companyAssetId: sortOrder };
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [total, records] = await Promise.all([
      prisma.maintenanceRecord.count({ where }),
      prisma.maintenanceRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              companyAssetId: true,
              assetName: true,
              assetType: true,
              manufacturer: true,
              model: true,
              serialNumber: true,
              status: true,
              condition: true,
              location: true,
              locationRel: { select: { id: true, name: true } },
              currentHolder: { select: { id: true, fullName: true, employeeCode: true } },
              department: { select: { id: true, name: true } },
            },
          },
          reportedBy: { select: { id: true, username: true } },
          technicianEmployee: { select: { id: true, fullName: true, employeeCode: true } },
          assignedTo: { select: { id: true, username: true } },
          approvedBy: { select: { id: true, username: true } },
          department: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true } },
          parts: true,
        },
      }),
    ]);

    const formatted = records.map((r) => {
      const reportedAtDate = new Date(r.reportedAt);
      const daysOpen = Math.max(0, Math.floor((now.getTime() - reportedAtDate.getTime()) / (1000 * 60 * 60 * 24)));

      let isOverdue = false;
      let overdueDays = 0;
      if (r.expectedCompletionDate && r.repairStatus !== MaintenanceStatus.COMPLETED && r.repairStatus !== MaintenanceStatus.CANCELLED) {
        const expectedDate = new Date(r.expectedCompletionDate);
        if (now.getTime() > expectedDate.getTime()) {
          isOverdue = true;
          overdueDays = Math.max(0, Math.floor((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }

      return {
        id: r.id,
        maintenanceCode: r.maintenanceCode || 'MNT-000000',
        assetId: r.assetId,
        assetCode: r.asset.companyAssetId || r.asset.assetCode,
        assetName: r.asset.assetName || r.asset.model || r.asset.manufacturer,
        assetType: r.asset.assetType,
        serialNumber: r.asset.serialNumber,
        employeeName: r.asset.currentHolder?.fullName || 'IT STOCK',
        departmentName: r.department?.name || r.asset.department?.name || 'IT',
        locationName: r.location?.name || r.asset.locationRel?.name || r.asset.location || 'HQ',
        maintenanceType: r.maintenanceType || 'CORRECTIVE',
        issueTitle: r.issueTitle,
        issueDescription: r.issueDescription,
        reportedAt: r.reportedAt,
        priority: r.priority || 'MEDIUM',
        repairStatus: r.repairStatus,
        technician: r.technician || (r.technicianEmployee?.fullName ? r.technicianEmployee.fullName : '—'),
        technicianId: r.technicianId,
        serviceProvider: r.serviceProvider || 'Internal IT',
        assignedToId: r.assignedToId,
        assignedToName: r.assignedTo?.username || '—',
        diagnosis: r.diagnosis || '—',
        rootCause: r.rootCause || '—',
        recommendedAction: r.recommendedAction || '—',
        repairAction: r.repairAction || '—',
        partsReplaced: r.partsReplaced || '—',
        laborCost: r.laborCost || 0,
        partsCost: r.partsCost || 0,
        serviceCost: r.serviceCost || 0,
        otherCost: r.otherCost || 0,
        repairCost: r.repairCost || 0,
        underWarranty: r.underWarranty,
        warrantyProvider: r.warrantyProvider || '—',
        warrantyReference: r.warrantyReference || '—',
        warrantyClaimNumber: r.warrantyClaimNumber || '—',
        warrantyCoverage: r.warrantyCoverage || 'NOT_COVERED',
        warrantyExpiry: r.warrantyExpiry,
        repairStartDate: r.repairStartDate,
        expectedCompletionDate: r.expectedCompletionDate,
        repairEndDate: r.repairEndDate,
        conditionBefore: r.conditionBefore || r.asset.condition || 'GOOD',
        conditionAfter: r.conditionAfter || '—',
        resolution: r.resolution || '—',
        finalDisposition: r.finalDisposition || 'AVAILABLE',
        remarks: r.remarks || '—',
        reportedByName: r.reportedBy?.username || 'admin',
        approvedByName: r.approvedBy?.username || '—',
        parts: r.parts,
        daysOpen,
        isOverdue,
        overdueDays,
      };
    });

    return {
      records: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single maintenance record with full relation tree and timeline
   */
  static async getMaintenanceById(id: string) {
    const rec = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            currentHolder: true,
            specifications: true,
            locationRel: true,
            department: true,
            assignments: {
              where: { status: WorkflowStatus.ACTIVE },
              include: { employee: true },
            },
          },
        },
        reportedBy: true,
        technicianEmployee: true,
        assignedTo: true,
        approvedBy: true,
        department: true,
        location: true,
        parts: true,
        returns: true,
      },
    });

    if (!rec) throw new Error('Maintenance record not found');

    // Get asset movement history for timeline
    const history = await prisma.assetStatusHistory.findMany({
      where: { assetId: rec.assetId },
      orderBy: { eventDate: 'desc' },
      take: 8,
    });

    return {
      ...rec,
      historyEvents: history,
    };
  }

  /**
   * Dynamic dropdown options with CURRENT ASSET STATE preview
   */
  static async getOptions() {
    const [assets, employees, departments, locations, users] = await Promise.all([
      prisma.asset.findMany({
        where: { status: { notIn: [AssetStatus.RETIRED, AssetStatus.SCRAPPED] } },
        select: {
          id: true,
          companyAssetId: true,
          assetCode: true,
          assetName: true,
          assetType: true,
          manufacturer: true,
          model: true,
          serialNumber: true,
          status: true,
          allocationStatus: true,
          condition: true,
          location: true,
          locationId: true,
          locationRel: { select: { id: true, name: true } },
          currentHolderId: true,
          currentHolder: { select: { id: true, fullName: true, employeeCode: true } },
          departmentId: true,
          department: { select: { id: true, name: true } },
          assignments: {
            where: { status: WorkflowStatus.ACTIVE },
            select: { id: true, assignmentCode: true, assignedAt: true },
          },
        },
        orderBy: { companyAssetId: 'asc' },
      }),
      prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, fullName: true, employeeCode: true, designation: true },
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

    return { assets, employees, departments, locations, users };
  }

  /**
   * Create new maintenance ticket with concurrency check and asset state transition
   */
  static async createMaintenance(data: unknown, userId: string) {
    const validated = MaintenanceCreateSchema.parse(data);

    const asset = await prisma.asset.findUnique({
      where: { id: validated.assetId },
      include: { currentHolder: true, locationRel: true, department: true },
    });
    if (!asset) throw new Error('Asset not found');

    // Concurrency conflict protection
    if (validated.expectedSourceState) {
      const exp = validated.expectedSourceState;
      if (
        (exp.holderId !== undefined && exp.holderId !== asset.currentHolderId) ||
        (exp.departmentId !== undefined && exp.departmentId !== asset.departmentId) ||
        (exp.locationId !== undefined && exp.locationId !== asset.locationId)
      ) {
        throw new Error(
          'This asset has changed since you opened this maintenance ticket. Refresh the asset and try again.'
        );
      }
    }

    // Conflicting Transfer Protection: Cannot initiate maintenance if asset is in active transfer
    const activeTransfer = await prisma.assetTransfer.findFirst({
      where: {
        assetId: validated.assetId,
        status: WorkflowStatus.PENDING,
      },
    });
    if (activeTransfer) {
      throw new Error(
        `Cannot initiate maintenance: Asset is currently pending in an active transfer workflow (${activeTransfer.transferCode || activeTransfer.id}). Resolve the transfer first.`
      );
    }

    // Safe cost calculation: total = labor + parts + service + other
    const laborCost = Number(validated.laborCost) || 0;
    const partsCost = Number(validated.partsCost) || 0;
    const serviceCost = Number(validated.serviceCost) || 0;
    const otherCost = Number(validated.otherCost) || 0;
    const totalCost = laborCost + partsCost + serviceCost + otherCost || Number(validated.repairCost) || 0;

    return await prisma.$transaction(async (tx) => {
      const code = await MaintenanceService.generateMaintenanceCode(tx);

      const maintenance = await tx.maintenanceRecord.create({
        data: {
          maintenanceCode: code,
          assetId: validated.assetId,
          reportedById: userId,
          maintenanceType: validated.maintenanceType || 'CORRECTIVE',
          issueTitle: validated.issueTitle,
          issueDescription: validated.issueDescription,
          priority: validated.priority || 'MEDIUM',
          technician: validated.technician,
          technicianId: validated.technicianId || null,
          serviceProvider: validated.serviceProvider || 'Internal IT',
          assignedToId: validated.assignedToId || null,
          reportedAt: validated.reportedAt || new Date(),
          repairStartDate: validated.repairStartDate || null,
          expectedCompletionDate: validated.expectedCompletionDate || null,
          underWarranty: validated.underWarranty || false,
          warrantyProvider: validated.warrantyProvider || null,
          warrantyReference: validated.warrantyReference || null,
          warrantyClaimNumber: validated.warrantyClaimNumber || null,
          warrantyExpiry: validated.warrantyExpiry || null,
          warrantyCoverage: validated.warrantyCoverage || 'NOT_COVERED',
          conditionBefore: validated.conditionBefore || asset.condition || AssetCondition.GOOD,
          laborCost,
          partsCost,
          serviceCost,
          otherCost,
          repairCost: totalCost,
          repairStatus: validated.repairStatus || MaintenanceStatus.OPEN,
          departmentId: asset.departmentId || null,
          locationId: asset.locationId || null,
          remarks: validated.remarks || null,
        },
      });

      // Update asset status to UNDER_REPAIR (Preserves holder accountability)
      await tx.asset.update({
        where: { id: validated.assetId },
        data: { status: AssetStatus.UNDER_REPAIR },
      });

      // Immutable history log
      await tx.assetStatusHistory.create({
        data: {
          assetId: validated.assetId,
          action: AssetAction.MAINTENANCE_STARTED,
          previousStatus: asset.status,
          newStatus: AssetStatus.UNDER_REPAIR,
          performedById: userId,
          remarks: `[${code}] Maintenance logged: ${validated.issueTitle} (${validated.priority} priority)`,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_MAINTENANCE',
          entityType: 'MaintenanceRecord',
          entityId: maintenance.id,
          newValue: JSON.stringify({
            code,
            issueTitle: validated.issueTitle,
            assetCode: asset.companyAssetId,
            priority: validated.priority,
          }),
        },
      });

      return maintenance;
    });
  }

  /**
   * Assign technician / service provider
   */
  static async assignTechnician(id: string, data: unknown, userId: string) {
    const validated = MaintenanceAssignSchema.parse(data);
    const existing = await prisma.maintenanceRecord.findUnique({ where: { id }, include: { asset: true } });
    if (!existing) throw new Error('Maintenance record not found');

    const nextStatus =
      existing.repairStatus === MaintenanceStatus.OPEN || existing.repairStatus === MaintenanceStatus.REPORTED
        ? MaintenanceStatus.ASSIGNED
        : existing.repairStatus;

    const updated = await prisma.maintenanceRecord.update({
      where: { id },
      data: {
        technician: validated.technician,
        technicianId: validated.technicianId || null,
        serviceProvider: validated.serviceProvider,
        assignedToId: validated.assignedToId || null,
        assignedAt: validated.assignedAt || new Date(),
        repairStartDate: validated.repairStartDate || existing.repairStartDate,
        expectedCompletionDate: validated.expectedCompletionDate || existing.expectedCompletionDate,
        repairStatus: nextStatus,
        remarks: validated.remarks || existing.remarks,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ASSIGN_TECHNICIAN',
        entityType: 'MaintenanceRecord',
        entityId: id,
        oldValue: JSON.stringify({ technician: existing.technician }),
        newValue: JSON.stringify({ technician: validated.technician, serviceProvider: validated.serviceProvider }),
      },
    });

    return updated;
  }

  /**
   * Record technical diagnosis and root cause analysis
   */
  static async updateDiagnosis(id: string, data: unknown, userId: string) {
    const validated = MaintenanceDiagnosticSchema.parse(data);
    const existing = await prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!existing) throw new Error('Maintenance record not found');

    const nextStatus =
      existing.repairStatus === MaintenanceStatus.OPEN || existing.repairStatus === MaintenanceStatus.ASSIGNED
        ? MaintenanceStatus.IN_PROGRESS
        : existing.repairStatus;

    const updated = await prisma.maintenanceRecord.update({
      where: { id },
      data: {
        diagnosis: validated.diagnosis,
        rootCause: validated.rootCause || null,
        recommendedAction: validated.recommendedAction || null,
        priority: validated.priority || existing.priority,
        conditionBefore: validated.conditionBefore || existing.conditionBefore,
        repairStatus: nextStatus,
        remarks: validated.remarks || existing.remarks,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DIAGNOSIS_UPDATE',
        entityType: 'MaintenanceRecord',
        entityId: id,
        newValue: JSON.stringify({ diagnosis: validated.diagnosis, rootCause: validated.rootCause }),
      },
    });

    return updated;
  }

  /**
   * Record repair actions, replaced parts, and granular cost breakdown
   */
  static async updateRepair(id: string, data: unknown, userId: string) {
    const validated = MaintenanceRepairSchema.parse(data);
    const existing = await prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!existing) throw new Error('Maintenance record not found');

    const laborCost = Number(validated.laborCost ?? existing.laborCost ?? 0);
    const partsCost = Number(validated.partsCost ?? existing.partsCost ?? 0);
    const serviceCost = Number(validated.serviceCost ?? existing.serviceCost ?? 0);
    const otherCost = Number(validated.otherCost ?? existing.otherCost ?? 0);
    const totalCost = laborCost + partsCost + serviceCost + otherCost;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          repairAction: validated.repairAction,
          partsReplaced: validated.partsReplaced || null,
          laborCost,
          partsCost,
          serviceCost,
          otherCost,
          repairCost: totalCost,
          repairStatus: validated.repairStatus || existing.repairStatus,
          remarks: validated.remarks || existing.remarks,
        },
      });

      if (validated.parts && validated.parts.length > 0) {
        await tx.maintenancePart.deleteMany({ where: { maintenanceId: id } });
        await tx.maintenancePart.createMany({
          data: validated.parts.map((p) => ({
            maintenanceId: id,
            partName: p.partName,
            quantity: p.quantity,
            cost: p.cost,
            remarks: p.remarks || null,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'REPAIR_UPDATE',
          entityType: 'MaintenanceRecord',
          entityId: id,
          newValue: JSON.stringify({ repairAction: validated.repairAction, totalCost }),
        },
      });

      return updated;
    });
  }

  /**
   * Complete maintenance: syncs asset availability, updates condition, logs history
   */
  static async completeMaintenance(id: string, data: unknown, userId: string) {
    const validated = MaintenanceCompleteSchema.parse(data);
    const existing = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!existing) throw new Error('Maintenance record not found');

    const laborCost = Number(validated.laborCost ?? existing.laborCost ?? 0);
    const partsCost = Number(validated.partsCost ?? existing.partsCost ?? 0);
    const serviceCost = Number(validated.serviceCost ?? existing.serviceCost ?? 0);
    const otherCost = Number(validated.otherCost ?? existing.otherCost ?? 0);
    const totalCost = laborCost + partsCost + serviceCost + otherCost;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          repairStatus: MaintenanceStatus.COMPLETED,
          resolution: validated.resolution,
          conditionAfter: validated.conditionAfter,
          finalDisposition: validated.finalDisposition || 'AVAILABLE',
          repairEndDate: validated.repairEndDate || new Date(),
          laborCost,
          partsCost,
          serviceCost,
          otherCost,
          repairCost: totalCost,
          approvedById: validated.approvedById || userId,
          remarks: validated.remarks || existing.remarks,
        },
      });

      // Synchronize asset state
      let nextAssetStatus: AssetStatus = AssetStatus.AVAILABLE;
      if (validated.finalDisposition === 'RETIRED') {
        nextAssetStatus = AssetStatus.RETIRED;
      } else if (validated.finalDisposition === 'NEEDS_FURTHER_REPAIR') {
        nextAssetStatus = AssetStatus.UNDER_REPAIR;
      } else if (existing.asset.currentHolderId) {
        nextAssetStatus = AssetStatus.IN_USE;
      }

      await tx.asset.update({
        where: { id: existing.assetId },
        data: {
          status: nextAssetStatus,
          condition: validated.conditionAfter,
        },
      });

      // Immutable history
      await tx.assetStatusHistory.create({
        data: {
          assetId: existing.assetId,
          action: AssetAction.MAINTENANCE_COMPLETED,
          previousStatus: AssetStatus.UNDER_REPAIR,
          newStatus: nextAssetStatus,
          performedById: userId,
          remarks: `[${existing.maintenanceCode}] Repair finalized. Resolution: ${validated.resolution}. Condition: ${validated.conditionAfter}. Cost: INR ${totalCost.toLocaleString()}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'COMPLETE_MAINTENANCE',
          entityType: 'MaintenanceRecord',
          entityId: id,
          oldValue: JSON.stringify({ status: existing.repairStatus }),
          newValue: JSON.stringify({ status: 'COMPLETED', disposition: validated.finalDisposition, totalCost }),
        },
      });

      return updated;
    });
  }

  /**
   * Cancel maintenance ticket with mandatory rationale and asset restoration
   */
  static async cancelMaintenance(id: string, data: unknown, userId: string) {
    const validated = MaintenanceCancelSchema.parse(data);
    const existing = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!existing) throw new Error('Maintenance record not found');

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          repairStatus: MaintenanceStatus.CANCELLED,
          remarks: `[CANCELLED: ${validated.reason}] ${existing.remarks || ''}`.trim(),
        },
      });

      // Check if any other active maintenance records remain for this asset
      const remainingActive = await tx.maintenanceRecord.count({
        where: {
          assetId: existing.assetId,
          id: { not: id },
          repairStatus: {
            in: [
              MaintenanceStatus.OPEN,
              MaintenanceStatus.ASSIGNED,
              MaintenanceStatus.IN_PROGRESS,
              MaintenanceStatus.WAITING_PARTS,
              MaintenanceStatus.WAITING_VENDOR,
            ],
          },
        },
      });

      if (remainingActive === 0) {
        const nextStatus: AssetStatus = existing.asset.currentHolderId ? AssetStatus.IN_USE : AssetStatus.AVAILABLE;
        await tx.asset.update({
          where: { id: existing.assetId },
          data: { status: nextStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CANCEL_MAINTENANCE',
          entityType: 'MaintenanceRecord',
          entityId: id,
          newValue: JSON.stringify({ reason: validated.reason }),
        },
      });

      return updated;
    });
  }

  /**
   * Controlled update of maintenance information
   */
  static async updateMaintenance(id: string, data: unknown, userId: string) {
    const validated = MaintenanceUpdateSchema.parse(data);
    const existing = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!existing) throw new Error('Maintenance record not found');

    const laborCost = Number(validated.laborCost ?? existing.laborCost ?? 0);
    const partsCost = Number(validated.partsCost ?? existing.partsCost ?? 0);
    const serviceCost = Number(validated.serviceCost ?? existing.serviceCost ?? 0);
    const otherCost = Number(validated.otherCost ?? existing.otherCost ?? 0);
    const totalCost = laborCost + partsCost + serviceCost + otherCost;

    return await prisma.$transaction(async (tx) => {
      const { parts, ...recData } = validated;

      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: {
          ...recData,
          laborCost,
          partsCost,
          serviceCost,
          otherCost,
          repairCost: totalCost,
        },
      });

      if (parts && parts.length > 0) {
        await tx.maintenancePart.deleteMany({ where: { maintenanceId: id } });
        await tx.maintenancePart.createMany({
          data: parts.map((p) => ({
            maintenanceId: id,
            partName: p.partName,
            quantity: p.quantity,
            cost: p.cost,
            remarks: p.remarks || null,
          })),
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EDIT_MAINTENANCE',
          entityType: 'MaintenanceRecord',
          entityId: id,
          oldValue: JSON.stringify({ issueTitle: existing.issueTitle }),
          newValue: JSON.stringify({ issueTitle: validated.issueTitle || existing.issueTitle }),
        },
      });

      return updated;
    });
  }

  /**
   * Delete maintenance record
   */
  static async deleteMaintenance(id: string, userId: string) {
    const existing = await prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!existing) throw new Error('Maintenance record not found');

    return await prisma.$transaction(async (tx) => {
      await tx.maintenancePart.deleteMany({ where: { maintenanceId: id } });
      await tx.maintenanceRecord.delete({ where: { id } });

      const remaining = await tx.maintenanceRecord.count({
        where: {
          assetId: existing.assetId,
          repairStatus: {
            in: [
              MaintenanceStatus.OPEN,
              MaintenanceStatus.ASSIGNED,
              MaintenanceStatus.IN_PROGRESS,
              MaintenanceStatus.WAITING_PARTS,
              MaintenanceStatus.WAITING_VENDOR,
            ],
          },
        },
      });

      if (remaining === 0) {
        await tx.asset.update({
          where: { id: existing.assetId },
          data: { status: AssetStatus.AVAILABLE },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'DELETE_MAINTENANCE',
          entityType: 'MaintenanceRecord',
          entityId: id,
          oldValue: JSON.stringify({ maintenanceCode: existing.maintenanceCode }),
        },
      });

      return { id, message: 'Maintenance record deleted successfully.' };
    });
  }
}
