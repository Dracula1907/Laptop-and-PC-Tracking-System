import prisma from '../config/prisma';
import {
  AssetStatus,
  AllocationStatus,
  WorkflowStatus,
  MaintenanceStatus,
  DataQualityStatus,
  ClearanceStatus,
  RetirementStatus,
  Prisma,
} from '@prisma/client';

export class ReportService {
  /**
   * 1. Management KPIs
   */
  static async getSummaryKPIs() {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      totalAssets,
      allocatedAssets,
      unallocatedAssets,
      activeAssets,
      inactiveAssets,
      underMaintenance,
      overdueReturns,
      warrantyExpiring,
      criticalDataQuality,
      activeClearances,
      retiredAssets,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { allocationStatus: AllocationStatus.ALLOCATED } }),
      prisma.asset.count({ where: { allocationStatus: AllocationStatus.NOT_ALLOCATED } }),
      prisma.asset.count({ where: { sourceAssetStatus: 'Active' } }),
      prisma.asset.count({ where: { sourceAssetStatus: 'Inactive' } }),
      prisma.asset.count({ where: { status: AssetStatus.UNDER_REPAIR } }),
      prisma.assetAssignment.count({
        where: {
          status: WorkflowStatus.ACTIVE,
          expectedReturnDate: { not: null, lt: now },
        },
      }),
      prisma.warranty.count({
        where: {
          endDate: { gte: now, lte: thirtyDaysFromNow },
        },
      }),
      prisma.asset.count({
        where: { dataQualityStatus: DataQualityStatus.NEEDS_REVIEW },
      }),
      prisma.clearance.count({
        where: {
          status: { in: [ClearanceStatus.IN_PROGRESS, ClearanceStatus.PENDING_REVIEW, ClearanceStatus.PENDING_APPROVAL] },
        },
      }),
      prisma.asset.count({ where: { status: AssetStatus.RETIRED } }),
    ]);

    return {
      totalAssets,
      allocatedAssets,
      unallocatedAssets,
      activeAssets,
      inactiveAssets,
      underMaintenance,
      overdueReturns,
      warrantyExpiring,
      criticalDataQuality,
      activeClearances,
      retiredAssets,
      timestamp: now.toISOString(),
    };
  }

  /**
   * 2. Asset Analytics (Aggregations by Type, Status, Allocation, Criticality, Department, Location)
   */
  static async getAssetAnalytics(filters: any = {}) {
    const where: any = {};
    if (filters.departmentId) where.departmentId = filters.departmentId;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.assetType) where.assetType = filters.assetType;

    const [byType, byStatus, byAllocation, byCriticality, byDepartment, byLocation] = await Promise.all([
      prisma.asset.groupBy({ by: ['assetType'], where, _count: { id: true } }),
      prisma.asset.groupBy({ by: ['status'], where, _count: { id: true } }),
      prisma.asset.groupBy({ by: ['allocationStatus'], where, _count: { id: true } }),
      prisma.asset.groupBy({ by: ['criticality'], where, _count: { id: true } }),
      prisma.department.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          _count: { select: { assets: true } },
        },
      }),
      prisma.location.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          _count: { select: { assets: true } },
        },
      }),
    ]);

    return {
      byType: byType.map((t) => ({ type: t.assetType, count: t._count.id })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      byAllocation: byAllocation.map((a) => ({ allocation: a.allocationStatus, count: a._count.id })),
      byCriticality: byCriticality.map((c) => ({ criticality: c.criticality || 'UNSPECIFIED', count: c._count.id })),
      byDepartment: byDepartment.map((d) => ({ id: d.id, name: d.name, code: d.code, count: d._count.assets })),
      byLocation: byLocation.map((l) => ({ id: l.id, name: l.name, code: l.code, count: l._count.assets })),
    };
  }

  /**
   * 3. Asset Utilization: (Eligible Allocated Active Assets / Eligible Active Assets) * 100
   */
  static async getUtilization(filters: any = {}) {
    // Active assets that are eligible for allocation (excluding retired or scrapped)
    const activeWhere: any = {
      status: { notIn: [AssetStatus.RETIRED, AssetStatus.SCRAPPED] },
    };
    if (filters.departmentId) activeWhere.departmentId = filters.departmentId;
    if (filters.locationId) activeWhere.locationId = filters.locationId;

    const totalEligible = await prisma.asset.count({ where: activeWhere });
    const allocatedEligible = await prisma.asset.count({
      where: { ...activeWhere, allocationStatus: AllocationStatus.ALLOCATED },
    });

    const overallRate = totalEligible > 0 ? Number(((allocatedEligible / totalEligible) * 100).toFixed(1)) : 0;

    // By Asset Type
    const [allByType, allocatedByType] = await Promise.all([
      prisma.asset.groupBy({ by: ['assetType'], where: activeWhere, _count: { id: true } }),
      prisma.asset.groupBy({
        by: ['assetType'],
        where: { ...activeWhere, allocationStatus: AllocationStatus.ALLOCATED },
        _count: { id: true },
      }),
    ]);

    const allocMap = new Map(allocatedByType.map((a) => [a.assetType, a._count.id]));
    const byType = allByType.map((t) => {
      const alloc = allocMap.get(t.assetType) || 0;
      const rate = t._count.id > 0 ? Number(((alloc / t._count.id) * 100).toFixed(1)) : 0;
      return { assetType: t.assetType, total: t._count.id, allocated: alloc, utilizationRate: rate };
    });

    return {
      formula: 'Eligible Allocated Active Assets / Eligible Active Assets * 100',
      totalEligible,
      allocatedEligible,
      overallRate,
      byType,
    };
  }

  /**
   * 4. Employee Accountability
   */
  static async getEmployeeAccountability(query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { employeeCode: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const now = new Date();

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          department: { select: { name: true, code: true } },
          location: { select: { name: true, code: true } },
          _count: { select: { heldAssets: true, assignments: true, clearances: true } },
          assignments: {
            where: { status: WorkflowStatus.ACTIVE },
            select: { id: true, expectedReturnDate: true },
          },
        },
        orderBy: { employeeCode: 'asc' },
        skip,
        take: limit,
      }),
      prisma.employee.count({ where }),
    ]);

    const rows = employees.map((emp) => {
      const activeAssignments = emp.assignments.length;
      const overdueAssignments = emp.assignments.filter(
        (a) => a.expectedReturnDate && new Date(a.expectedReturnDate) < now
      ).length;

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        email: emp.email,
        department: emp.department?.name || '—',
        location: emp.location?.name || '—',
        status: emp.status,
        assetsHeld: emp._count.heldAssets,
        activeAssignments,
        overdueAssignments,
        hasClearance: emp._count.clearances > 0,
      };
    });

    return { rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * 5. Overdue & Upcoming Returns
   */
  static async getReturnsReport() {
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [overdue, upcoming7, upcoming30, upcoming60] = await Promise.all([
      prisma.assetAssignment.findMany({
        where: {
          status: WorkflowStatus.ACTIVE,
          expectedReturnDate: { not: null, lt: now },
        },
        include: {
          asset: true,
          employee: { include: { department: true, location: true } },
        },
        orderBy: { expectedReturnDate: 'asc' },
      }),
      prisma.assetAssignment.count({
        where: {
          status: WorkflowStatus.ACTIVE,
          expectedReturnDate: { gte: now, lte: sevenDays },
        },
      }),
      prisma.assetAssignment.count({
        where: {
          status: WorkflowStatus.ACTIVE,
          expectedReturnDate: { gte: now, lte: thirtyDays },
        },
      }),
      prisma.assetAssignment.count({
        where: {
          status: WorkflowStatus.ACTIVE,
          expectedReturnDate: { gte: now, lte: sixtyDays },
        },
      }),
    ]);

    const formattedOverdue = overdue.map((a) => {
      const dueDate = a.expectedReturnDate ? new Date(a.expectedReturnDate) : now;
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000)));

      return {
        id: a.id,
        assignmentCode: a.assignmentCode,
        assetCode: a.asset.assetCode,
        assetName: a.asset.assetName || a.asset.model,
        assetType: a.asset.assetType,
        employeeName: a.employee.fullName,
        employeeCode: a.employee.employeeCode,
        department: a.employee.department?.name || '—',
        location: a.employee.location?.name || '—',
        assignedAt: a.assignedAt,
        expectedReturnDate: a.expectedReturnDate,
        daysOverdue,
        criticality: a.asset.criticality || 'MEDIUM',
      };
    });

    formattedOverdue.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return {
      overdue: formattedOverdue,
      overdueCount: formattedOverdue.length,
      upcoming7Count: upcoming7,
      upcoming30Count: upcoming30,
      upcoming60Count: upcoming60,
    };
  }

  /**
   * 6. Maintenance & Cost Analytics
   */
  static async getMaintenanceAnalytics() {
    const [byStatus, byPriority, byType, costs] = await Promise.all([
      prisma.maintenanceRecord.groupBy({ by: ['repairStatus'], _count: { id: true } }),
      prisma.maintenanceRecord.groupBy({ by: ['priority'], _count: { id: true } }),
      prisma.maintenanceRecord.groupBy({ by: ['maintenanceType'], _count: { id: true } }),
      prisma.maintenanceRecord.aggregate({
        _sum: {
          laborCost: true,
          partsCost: true,
          serviceCost: true,
          otherCost: true,
          repairCost: true,
        },
        _avg: {
          repairCost: true,
        },
        _count: { id: true },
      }),
    ]);

    const totalCost =
      (costs._sum.laborCost || 0) +
      (costs._sum.partsCost || 0) +
      (costs._sum.serviceCost || 0) +
      (costs._sum.otherCost || 0);

    return {
      byStatus: byStatus.map((s) => ({ status: s.repairStatus, count: s._count.id })),
      byPriority: byPriority.map((p) => ({ priority: p.priority, count: p._count.id })),
      byType: byType.map((t) => ({ type: t.maintenanceType, count: t._count.id })),
      costs: {
        totalTickets: costs._count.id,
        laborCost: costs._sum.laborCost || 0,
        partsCost: costs._sum.partsCost || 0,
        serviceCost: costs._sum.serviceCost || 0,
        otherCost: costs._sum.otherCost || 0,
        totalCost,
        avgCost: costs._avg.repairCost || (costs._count.id > 0 ? totalCost / costs._count.id : 0),
      },
    };
  }

  /**
   * 7. Warranty Analytics
   */
  static async getWarrantyAnalytics() {
    const now = new Date();
    const d7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const d60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const d90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [active, exp7, exp30, exp60, exp90, expired, claimsAgg] = await Promise.all([
      prisma.warranty.count({ where: { endDate: { gte: now } } }),
      prisma.warranty.count({ where: { endDate: { gte: now, lte: d7 } } }),
      prisma.warranty.count({ where: { endDate: { gte: now, lte: d30 } } }),
      prisma.warranty.count({ where: { endDate: { gte: now, lte: d60 } } }),
      prisma.warranty.count({ where: { endDate: { gte: now, lte: d90 } } }),
      prisma.warranty.count({ where: { endDate: { lt: now } } }),
      prisma.warrantyClaim.aggregate({
        _sum: { claimCost: true, coveredAmount: true, outOfPocketAmount: true },
        _count: { id: true },
      }),
    ]);

    return {
      activeWarranties: active,
      expiring7Days: exp7,
      expiring30Days: exp30,
      expiring60Days: exp60,
      expiring90Days: exp90,
      expiredWarranties: expired,
      claims: {
        totalClaims: claimsAgg._count.id,
        totalClaimCost: claimsAgg._sum.claimCost || 0,
        coveredAmount: claimsAgg._sum.coveredAmount || 0,
        outOfPocketAmount: claimsAgg._sum.outOfPocketAmount || 0,
      },
    };
  }

  /**
   * 8. Asset Aging (0-1y, 1-3y, 3-5y, 5-7y, 7+y, unknown) based strictly on purchaseDate
   */
  static async getAssetAging() {
    const assets = await prisma.asset.findMany({
      select: { id: true, purchaseDate: true },
    });

    const now = new Date();
    const brackets = {
      '0-1 Year': 0,
      '1-3 Years': 0,
      '3-5 Years': 0,
      '5-7 Years': 0,
      '7+ Years': 0,
      'Unknown': 0,
    };

    for (const a of assets) {
      if (!a.purchaseDate) {
        brackets['Unknown']++;
        continue;
      }
      const ageYears = (now.getTime() - new Date(a.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears < 1) brackets['0-1 Year']++;
      else if (ageYears < 3) brackets['1-3 Years']++;
      else if (ageYears < 5) brackets['3-5 Years']++;
      else if (ageYears < 7) brackets['5-7 Years']++;
      else brackets['7+ Years']++;
    }

    return Object.entries(brackets).map(([bracket, count]) => ({ bracket, count }));
  }

  /**
   * 9. Asset Health Classification (HEALTHY, ATTENTION, HIGH RISK)
   */
  static async getAssetHealthMatrix() {
    const assets = await prisma.asset.findMany({
      include: {
        maintenance: { where: { repairStatus: { not: MaintenanceStatus.COMPLETED } } },
      },
      take: 200,
      orderBy: { assetCode: 'asc' },
    });

    const now = new Date();

    const healthList = assets.map((a) => {
      let riskScore = 0;
      const issues: string[] = [];

      if (a.dataQualityStatus === DataQualityStatus.NEEDS_REVIEW) {
        riskScore += 2;
        issues.push('Critical Data Quality Issue');
      }
      if (a.condition === 'DAMAGED' || a.condition === 'CRITICAL') {
        riskScore += 3;
        issues.push(`Condition: ${a.condition}`);
      }
      if (a.maintenance.length > 0) {
        riskScore += 2;
        issues.push(`${a.maintenance.length} open maintenance ticket(s)`);
      }
      if (a.warrantyEnd && new Date(a.warrantyEnd) < now) {
        riskScore += 1;
        issues.push('Warranty Expired');
      }

      let category = 'HEALTHY';
      if (riskScore >= 3) category = 'HIGH RISK';
      else if (riskScore > 0) category = 'ATTENTION';

      return {
        id: a.id,
        assetCode: a.assetCode,
        assetName: a.assetName || a.model,
        assetType: a.assetType,
        status: a.status,
        condition: a.condition,
        criticality: a.criticality || 'MEDIUM',
        category,
        riskScore,
        issues,
      };
    });

    const summary = {
      healthy: healthList.filter((h) => h.category === 'HEALTHY').length,
      attention: healthList.filter((h) => h.category === 'ATTENTION').length,
      highRisk: healthList.filter((h) => h.category === 'HIGH RISK').length,
    };

    return { summary, assets: healthList };
  }

  /**
   * Saved Reports CRUD
   */
  static async getSavedReports(userId: string) {
    return prisma.savedReport.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createSavedReport(userId: string, data: { name: string; description?: string; reportType: string; filters: any; sortBy?: string; sortOrder?: string }) {
    return prisma.savedReport.create({
      data: {
        name: data.name,
        description: data.description,
        reportType: data.reportType,
        filters: JSON.stringify(data.filters || {}),
        sortBy: data.sortBy,
        sortOrder: data.sortOrder,
        createdById: userId,
      },
    });
  }

  static async deleteSavedReport(id: string, userId: string) {
    return prisma.savedReport.deleteMany({
      where: { id, createdById: userId },
    });
  }

  /**
   * Legacy report type data support
   */
  static async getReportData(reportType: string) {
    switch (reportType) {
      case 'inventory':
        return prisma.asset.findMany({
          include: { department: true, locationRel: true, currentHolder: true, specifications: true },
          orderBy: { assetCode: 'asc' },
        });

      case 'assigned':
        return prisma.asset.findMany({
          where: { status: 'ASSIGNED' },
          include: { department: true, locationRel: true, currentHolder: true },
          orderBy: { assetCode: 'asc' },
        });

      case 'available':
        return prisma.asset.findMany({
          where: { status: 'AVAILABLE' },
          include: { department: true, locationRel: true },
          orderBy: { assetCode: 'asc' },
        });

      case 'maintenance':
        return prisma.maintenanceRecord.findMany({
          include: { asset: true, reportedBy: true, parts: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'transfers':
        return prisma.assetTransfer.findMany({
          include: { asset: true, previousHolder: true, newHolder: true, previousDepartment: true, newDepartment: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'returns':
        return prisma.assetReturn.findMany({
          include: { asset: true, employee: true, receivedBy: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'warranty':
        return prisma.warranty.findMany({
          include: { asset: true, claims: true },
          orderBy: { endDate: 'asc' },
        });

      case 'audit':
        return prisma.auditLog.findMany({
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });

      default:
        throw new Error(`Report type '${reportType}' is not supported.`);
    }
  }
}
