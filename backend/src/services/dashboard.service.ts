import prisma from '../config/prisma';
import {
  AssetType,
  AllocationStatus,
  DataQualityStatus,
} from '@prisma/client';

export class DashboardService {
  static async getSummaryStats() {
    const [
      totalAssets,
      activeCount,
      inactiveCount,
      allocatedCount,
      notAllocatedCount,
      laptopsCount,
      officePcsCount,
      workstationsCount,
      highCriticalityCount,
      needsReviewCount,
      warningsCount,
    ] = await Promise.all([
      // 1. Total Assets
      prisma.asset.count(),
      // 2. Active
      prisma.asset.count({ where: { sourceAssetStatus: 'Active' } }),
      // 3. Inactive
      prisma.asset.count({ where: { sourceAssetStatus: 'Inactive' } }),
      // 4. Allocated
      prisma.asset.count({ where: { allocationStatus: AllocationStatus.ALLOCATED } }),
      // 5. Not Allocated
      prisma.asset.count({ where: { allocationStatus: AllocationStatus.NOT_ALLOCATED } }),
      // 6. Laptops
      prisma.asset.count({ where: { assetType: AssetType.LAPTOP } }),
      // 7. Office PCs
      prisma.asset.count({ where: { assetType: AssetType.DESKTOP } }),
      // 8. Workstations
      prisma.asset.count({ where: { assetType: AssetType.WORKSTATION } }),
      // 9. High Criticality
      prisma.asset.count({ where: { criticality: 'High' } }),
      // Quality
      prisma.asset.count({ where: { dataQualityStatus: DataQualityStatus.NEEDS_REVIEW } }),
      prisma.asset.count({ where: { dataQualityStatus: DataQualityStatus.WARNING } }),
    ]);

    return {
      top: {
        totalAssets,
        active: activeCount,
        inactive: inactiveCount,
        allocated: allocatedCount,
        notAllocated: notAllocatedCount,
        laptops: laptopsCount,
        officePcs: officePcsCount,
        workstations: workstationsCount,
        highCriticality: highCriticalityCount,
        needsReview: needsReviewCount,
        warnings: warningsCount,
      },
    };
  }

  static async getChartsData() {
    const [
      byTypeGroup,
      byStatusGroup,
      byAllocGroup,
      byCritGroup,
      byLocGroup,
      byCpuGroup,
    ] = await Promise.all([
      // Chart 1: Assets by Type
      prisma.asset.groupBy({
        by: ['assetType'],
        _count: { _all: true },
      }),
      // Chart 2: Assets by Status
      prisma.asset.groupBy({
        by: ['sourceAssetStatus'],
        _count: { _all: true },
      }),
      // Chart 3: Assets by Allocation
      prisma.asset.groupBy({
        by: ['allocationStatus'],
        _count: { _all: true },
      }),
      // Chart 4: Assets by Criticality
      prisma.asset.groupBy({
        by: ['criticality'],
        _count: { _all: true },
      }),
      // Chart 5: Assets by Location
      prisma.asset.groupBy({
        by: ['location'],
        _count: { _all: true },
        orderBy: { _count: { location: 'desc' } },
      }),
      // Chart 6: Assets by CPU
      prisma.asset.groupBy({
        by: ['cpu'],
        _count: { _all: true },
        orderBy: { _count: { cpu: 'desc' } },
      }),
    ]);

    // Format Chart 1: Assets by Type
    const typeLabelMap: Record<string, string> = {
      LAPTOP: 'Laptop',
      DESKTOP: 'Office PC',
      WORKSTATION: 'Work Station',
    };
    const assetsByType = byTypeGroup.map((g) => ({
      type: typeLabelMap[g.assetType] || g.assetType,
      count: g._count._all,
    }));

    // Format Chart 2: Assets by Status
    const assetsByStatus = byStatusGroup.map((g) => ({
      status: g.sourceAssetStatus || 'Unknown',
      count: g._count._all,
    }));

    // Format Chart 3: Assets by Allocation
    const assetsByAllocation = byAllocGroup.map((g) => ({
      allocation: g.allocationStatus === AllocationStatus.ALLOCATED ? 'Allocated' : 'Not Allocated',
      count: g._count._all,
    }));

    // Format Chart 4: Assets by Criticality (High, Medium, Blank)
    const assetsByCriticality = byCritGroup.map((c) => ({
      criticality: c.criticality || 'Blank',
      count: c._count._all,
    }));

    // Format Chart 5: Assets by Location
    const assetsByLocation = byLocGroup.map((l) => ({
      location: l.location || 'Unspecified',
      count: l._count._all,
    }));

    // Format Chart 6: Assets by CPU
    const assetsByCpu = byCpuGroup.map((c) => ({
      cpu: c.cpu || 'Unspecified',
      count: c._count._all,
    }));

    return {
      assetsByType,
      assetsByStatus,
      assetsByAllocation,
      assetsByCriticality,
      assetsByLocation,
      assetsByCpu,
    };
  }

  static async getRecentActivity() {
    const statusHistory = await prisma.assetStatusHistory.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { asset: true, performedBy: true },
    });

    return {
      timeline: statusHistory,
    };
  }

  static async getDashboardAlerts() {
    const [needsReviewAssets, warningsAssets] = await Promise.all([
      prisma.asset.findMany({
        where: { dataQualityStatus: DataQualityStatus.NEEDS_REVIEW },
        include: { currentHolder: true, department: true },
        take: 10,
      }),
      prisma.asset.findMany({
        where: { dataQualityStatus: DataQualityStatus.WARNING },
        include: { currentHolder: true, department: true },
        take: 10,
      }),
    ]);

    return {
      needsReviewAssets,
      warningsAssets,
    };
  }
}
