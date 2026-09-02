import prisma from '../config/prisma';
import {
  WarrantyType,
  CoverageStatus,
  ClaimStatus,
  AssetAction,
  Prisma,
} from '@prisma/client';
import { HistoryService } from './history.service';

export class WarrantyService {
  /**
   * Calculate real-time dynamic coverage status, days remaining, and expiry category
   */
  public static calculateCoverage(startDate: Date, endDate: Date, isCancelled: boolean) {
    const now = new Date();
    // Normalize to midnight
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    const diffMs = end.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const daysSinceExpiry = daysRemaining < 0 ? Math.abs(daysRemaining) : 0;

    if (isCancelled) {
      return {
        status: CoverageStatus.CANCELLED,
        daysRemaining: 0,
        daysSinceExpiry: 0,
        category: 'CANCELLED',
        badgeColor: 'slate',
      };
    }

    if (daysRemaining < 0) {
      return {
        status: CoverageStatus.EXPIRED,
        daysRemaining,
        daysSinceExpiry,
        category: 'EXPIRED',
        badgeColor: 'rose',
      };
    }

    if (daysRemaining <= 7) {
      return {
        status: CoverageStatus.EXPIRING_SOON,
        daysRemaining,
        daysSinceExpiry: 0,
        category: 'EXPIRING_VERY_SOON',
        badgeColor: 'rose',
      };
    }

    if (daysRemaining <= 30) {
      return {
        status: CoverageStatus.EXPIRING_SOON,
        daysRemaining,
        daysSinceExpiry: 0,
        category: 'EXPIRING_HIGH_PRIORITY',
        badgeColor: 'amber',
      };
    }

    if (daysRemaining <= 90) {
      return {
        status: CoverageStatus.EXPIRING_SOON,
        daysRemaining,
        daysSinceExpiry: 0,
        category: 'EXPIRING_NOTICE',
        badgeColor: 'yellow',
      };
    }

    return {
      status: CoverageStatus.ACTIVE,
      daysRemaining,
      daysSinceExpiry: 0,
      category: 'ACTIVE',
      badgeColor: 'emerald',
    };
  }

  /**
   * Helper for generating sequential warranty codes: WRN-000001
   */
  public static async generateWarrantyCode(): Promise<string> {
    const records = await prisma.warranty.findMany({
      where: { warrantyCode: { startsWith: 'WRN-' } },
      select: { warrantyCode: true },
    });

    let maxNum = 0;
    for (const r of records) {
      if (r.warrantyCode) {
        const match = r.warrantyCode.match(/^WRN-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    return `WRN-${String(maxNum + 1).padStart(6, '0')}`;
  }

  /**
   * Get dynamic telemetry counters from PostgreSQL
   */
  public static async getWarrantyCounts() {
    await this.syncInitialAssetWarranties();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const in90Days = new Date(today);
    in90Days.setDate(in90Days.getDate() + 90);

    const [total, cancelled, expired, expiringIn30Days, expiringIn90Days, openClaims, resolvedClaims] =
      await Promise.all([
        prisma.warranty.count(),
        prisma.warranty.count({ where: { status: CoverageStatus.CANCELLED } }),
        prisma.warranty.count({
          where: {
            status: { not: CoverageStatus.CANCELLED },
            endDate: { lt: today },
          },
        }),
        prisma.warranty.count({
          where: {
            status: { not: CoverageStatus.CANCELLED },
            endDate: { gte: today, lte: in30Days },
          },
        }),
        prisma.warranty.count({
          where: {
            status: { not: CoverageStatus.CANCELLED },
            endDate: { gte: today, lte: in90Days },
          },
        }),
        prisma.warrantyClaim.count({
          where: {
            status: { in: [ClaimStatus.DRAFT, ClaimStatus.SUBMITTED, ClaimStatus.UNDER_REVIEW, ClaimStatus.APPROVED, ClaimStatus.IN_SERVICE] },
          },
        }),
        prisma.warrantyClaim.count({
          where: { status: ClaimStatus.RESOLVED },
        }),
      ]);

    // Active = Total - (Expired + ExpiringIn30Days + Cancelled)
    const active = Math.max(0, total - (expired + expiringIn30Days + cancelled));

    return {
      total,
      active,
      expiringSoon: expiringIn30Days,
      expiringIn30Days,
      expiringIn90Days,
      expired,
      cancelled,
      openClaims,
      resolvedClaims,
    };
  }

  /**
   * Search, filter, and paginate warranty records
   */
  public static async getWarranties(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    warrantyType?: string;
    provider?: string;
    assetType?: string;
    departmentId?: string;
    locationId?: string;
    expiryRange?: string;
    hasClaims?: string;
    sortBy?: 'soonestExpiry' | 'latestExpiry' | 'criticality' | 'newest';
  }) {
    await this.syncInitialAssetWarranties();

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.WarrantyWhereInput = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Status filter
    if (query.status && query.status !== 'ALL') {
      if (query.status === 'CANCELLED') {
        where.status = CoverageStatus.CANCELLED;
      } else if (query.status === 'EXPIRED') {
        where.status = { not: CoverageStatus.CANCELLED };
        where.endDate = { lt: today };
      } else if (query.status === 'EXPIRING_SOON') {
        const in30 = new Date(today);
        in30.setDate(in30.getDate() + 30);
        where.status = { not: CoverageStatus.CANCELLED };
        where.endDate = { gte: today, lte: in30 };
      } else if (query.status === 'ACTIVE') {
        const in30 = new Date(today);
        in30.setDate(in30.getDate() + 30);
        where.status = { not: CoverageStatus.CANCELLED };
        where.endDate = { gt: in30 };
      }
    }

    // Expiry Range filter
    if (query.expiryRange && query.expiryRange !== 'ALL') {
      where.status = { not: CoverageStatus.CANCELLED };
      if (query.expiryRange === 'EXPIRED') {
        where.endDate = { lt: today };
      } else {
        const days =
          query.expiryRange === '7_DAYS'
            ? 7
            : query.expiryRange === '15_DAYS'
            ? 15
            : query.expiryRange === '30_DAYS'
            ? 30
            : query.expiryRange === '60_DAYS'
            ? 60
            : 90;
        const targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + days);
        where.endDate = { gte: today, lte: targetDate };
      }
    }

    // Warranty Type filter
    if (query.warrantyType && query.warrantyType !== 'ALL') {
      where.warrantyType = query.warrantyType as WarrantyType;
    }

    // Provider filter
    if (query.provider && query.provider !== 'ALL') {
      where.provider = { contains: query.provider, mode: 'insensitive' };
    }

    // Asset Type, Department, Location filters
    const assetWhere: Prisma.AssetWhereInput = {};
    if (query.assetType && query.assetType !== 'ALL') {
      assetWhere.assetType = query.assetType as any;
    }
    if (query.departmentId && query.departmentId !== 'ALL') {
      assetWhere.departmentId = query.departmentId;
    }
    if (query.locationId && query.locationId !== 'ALL') {
      assetWhere.locationId = query.locationId;
    }
    if (Object.keys(assetWhere).length > 0) {
      where.asset = assetWhere;
    }

    // Has Claims filter
    if (query.hasClaims === 'YES') {
      where.claims = { some: {} };
    } else if (query.hasClaims === 'NO') {
      where.claims = { none: {} };
    }

    // Multi-search across 8 fields
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { warrantyCode: { contains: s, mode: 'insensitive' } },
        { provider: { contains: s, mode: 'insensitive' } },
        { policyNumber: { contains: s, mode: 'insensitive' } },
        { coverageDescription: { contains: s, mode: 'insensitive' } },
        { asset: { companyAssetId: { contains: s, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: s, mode: 'insensitive' } } },
        { asset: { model: { contains: s, mode: 'insensitive' } } },
        { asset: { serialNumber: { contains: s, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    let orderBy: Prisma.WarrantyOrderByWithRelationInput[] = [{ createdAt: 'desc' }];
    if (query.sortBy === 'soonestExpiry') {
      orderBy = [{ endDate: 'asc' }];
    } else if (query.sortBy === 'latestExpiry') {
      orderBy = [{ endDate: 'desc' }];
    } else if (query.sortBy === 'criticality') {
      orderBy = [{ asset: { criticality: 'desc' } }, { endDate: 'asc' }];
    }

    const [total, records] = await Promise.all([
      prisma.warranty.count({ where }),
      prisma.warranty.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          asset: {
            include: {
              department: true,
              locationRel: true,
              currentHolder: true,
            },
          },
          createdBy: {
            include: { employee: true },
          },
          _count: {
            select: { claims: true, maintenanceRecords: true },
          },
        },
      }),
    ]);

    // Decorate with real-time calculated status and days remaining
    const decorated = records.map((r) => {
      const calc = this.calculateCoverage(r.startDate, r.endDate, r.status === CoverageStatus.CANCELLED);
      return {
        ...r,
        computedStatus: calc.status,
        daysRemaining: calc.daysRemaining,
        daysSinceExpiry: calc.daysSinceExpiry,
        expiryCategory: calc.category,
        badgeColor: calc.badgeColor,
      };
    });

    return {
      warranties: decorated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single warranty record by ID with full relations & financial analysis
   */
  public static async getWarrantyById(id: string) {
    const record = await prisma.warranty.findUnique({
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
        createdBy: {
          include: { employee: true },
        },
        claims: {
          orderBy: { claimDate: 'desc' },
          include: {
            createdBy: { include: { employee: true } },
            maintenance: true,
          },
        },
        maintenanceRecords: {
          orderBy: { reportedAt: 'desc' },
          include: { technicianEmployee: true },
        },
        previousWarranty: true,
        extensionWarranties: true,
      },
    });

    if (!record) throw new Error('Warranty record not found.');

    const calc = this.calculateCoverage(
      record.startDate,
      record.endDate,
      record.status === CoverageStatus.CANCELLED
    );

    // Financial calculations
    const claimsList = (record as any).claims || [];
    const totalClaimCost = claimsList.reduce((acc: number, c: any) => acc + (c.claimCost || 0), 0);
    const totalCoveredAmount = claimsList.reduce((acc: number, c: any) => acc + (c.coveredAmount || 0), 0);
    const totalOutOfPocket = claimsList.reduce((acc: number, c: any) => acc + (c.outOfPocketAmount || 0), 0);

    return {
      ...record,
      computedStatus: calc.status,
      daysRemaining: calc.daysRemaining,
      daysSinceExpiry: calc.daysSinceExpiry,
      expiryCategory: calc.category,
      badgeColor: calc.badgeColor,
      financials: {
        warrantyCost: record.warrantyCost || 0,
        totalClaimCost,
        totalCoveredAmount,
        totalOutOfPocket,
      },
    };
  }

  /**
   * Get all warranties for a specific asset (active first, then historical)
   */
  public static async getWarrantyByAssetId(assetId: string) {
    const warranties = await prisma.warranty.findMany({
      where: { assetId },
      orderBy: { endDate: 'desc' },
      include: {
        claims: true,
        _count: { select: { claims: true, maintenanceRecords: true } },
      },
    });

    return warranties.map((w) => {
      const calc = this.calculateCoverage(w.startDate, w.endDate, w.status === CoverageStatus.CANCELLED);
      return {
        ...w,
        computedStatus: calc.status,
        daysRemaining: calc.daysRemaining,
        daysSinceExpiry: calc.daysSinceExpiry,
        expiryCategory: calc.category,
        badgeColor: calc.badgeColor,
      };
    });
  }

  /**
   * Create a new warranty record
   */
  public static async createWarranty(
    data: {
      assetId: string;
      warrantyType?: WarrantyType;
      provider: string;
      policyNumber?: string | null;
      coverageDescription?: string | null;
      startDate: Date;
      endDate: Date;
      claimContact?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      purchaseDate?: Date | null;
      purchaseReference?: string | null;
      warrantyCost?: number | null;
      coverageNotes?: string | null;
      attachmentRef?: string | null;
    },
    userId: string
  ) {
    if (data.endDate < data.startDate) {
      throw new Error('Warranty End Date cannot be earlier than Start Date.');
    }
    if (data.purchaseDate && data.purchaseDate > data.startDate) {
      throw new Error('Purchase Date cannot be after the Warranty Start Date.');
    }

    const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
    if (!asset) throw new Error('Target asset not found.');

    const warrantyCode = await this.generateWarrantyCode();
    const calc = this.calculateCoverage(data.startDate, data.endDate, false);

    return await prisma.$transaction(async (tx) => {
      const warranty = await tx.warranty.create({
        data: {
          warrantyCode,
          assetId: data.assetId,
          warrantyType: data.warrantyType || WarrantyType.STANDARD,
          provider: data.provider,
          policyNumber: data.policyNumber || null,
          coverageDescription: data.coverageDescription || null,
          startDate: data.startDate,
          endDate: data.endDate,
          status: calc.status,
          claimContact: data.claimContact || null,
          contactEmail: data.contactEmail || null,
          contactPhone: data.contactPhone || null,
          purchaseDate: data.purchaseDate || null,
          purchaseReference: data.purchaseReference || null,
          warrantyCost: data.warrantyCost || null,
          coverageNotes: data.coverageNotes || null,
          attachmentRef: data.attachmentRef || null,
          createdById: userId,
        },
        include: {
          asset: true,
          createdBy: { include: { employee: true } },
        },
      });

      // Synchronize root Asset warranty dates
      await tx.asset.update({
        where: { id: data.assetId },
        data: {
          warrantyStart: data.startDate,
          warrantyEnd: data.endDate,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_WARRANTY',
          entityType: 'Warranty',
          entityId: warranty.id,
          newValue: JSON.stringify({
            warrantyCode,
            provider: data.provider,
            startDate: data.startDate,
            endDate: data.endDate,
            assetId: data.assetId,
          }),
        },
      });

      // Asset Status History Event
      await HistoryService.recordEvent(tx, {
        assetId: data.assetId,
        action: AssetAction.STATUS_CHANGED,
        performedById: userId,
        eventDate: new Date(),
        remarks: `Warranty coverage established: ${data.provider} (${warrantyCode}), valid until ${data.endDate.toLocaleDateString('en-GB')}`,
      });

      return warranty;
    });
  }

  /**
   * Update an existing warranty record
   */
  public static async updateWarranty(
    id: string,
    data: {
      warrantyType?: WarrantyType;
      provider?: string;
      policyNumber?: string | null;
      coverageDescription?: string | null;
      startDate?: Date;
      endDate?: Date;
      claimContact?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      purchaseDate?: Date | null;
      purchaseReference?: string | null;
      warrantyCost?: number | null;
      coverageNotes?: string | null;
      attachmentRef?: string | null;
    },
    userId: string
  ) {
    const existing = await prisma.warranty.findUnique({ where: { id } });
    if (!existing) throw new Error('Warranty record not found.');

    const start = data.startDate || existing.startDate;
    const end = data.endDate || existing.endDate;

    if (end < start) {
      throw new Error('Warranty End Date cannot be earlier than Start Date.');
    }

    const calc = this.calculateCoverage(start, end, existing.status === CoverageStatus.CANCELLED);

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.warranty.update({
        where: { id },
        data: {
          ...data,
          status: calc.status,
        },
      });

      if (data.startDate || data.endDate) {
        await tx.asset.update({
          where: { id: existing.assetId },
          data: {
            warrantyStart: start,
            warrantyEnd: end,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE_WARRANTY',
          entityType: 'Warranty',
          entityId: id,
          oldValue: JSON.stringify({
            provider: existing.provider,
            endDate: existing.endDate,
            policyNumber: existing.policyNumber,
          }),
          newValue: JSON.stringify({
            provider: data.provider || existing.provider,
            endDate: end,
            policyNumber: data.policyNumber || existing.policyNumber,
          }),
        },
      });

      return updated;
    });
  }

  /**
   * Controlled Warranty Extension Workflow (preserves historical timeline)
   */
  public static async extendWarranty(
    id: string,
    data: {
      newEndDate: Date;
      extensionReason: string;
      provider?: string | null;
      warrantyCost?: number | null;
      policyNumber?: string | null;
    },
    userId: string
  ) {
    const existing = await prisma.warranty.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!existing) throw new Error('Warranty record not found.');

    if (data.newEndDate <= existing.endDate) {
      throw new Error('New extension end date must be strictly after the current end date.');
    }

    const extensionCode = await this.generateWarrantyCode();
    const calc = this.calculateCoverage(existing.endDate, data.newEndDate, false);

    return await prisma.$transaction(async (tx) => {
      // 1. Mark existing warranty as extended
      await tx.warranty.update({
        where: { id },
        data: { isExtended: true },
      });

      // 2. Create extension warranty linked to previous warranty
      const extension = await tx.warranty.create({
        data: {
          warrantyCode: extensionCode,
          assetId: existing.assetId,
          warrantyType: WarrantyType.EXTENDED,
          provider: data.provider || existing.provider,
          policyNumber: data.policyNumber || existing.policyNumber,
          coverageDescription: existing.coverageDescription,
          startDate: existing.endDate,
          endDate: data.newEndDate,
          status: calc.status,
          claimContact: existing.claimContact,
          contactEmail: existing.contactEmail,
          contactPhone: existing.contactPhone,
          warrantyCost: data.warrantyCost || null,
          previousWarrantyId: id,
          extensionReason: data.extensionReason,
          createdById: userId,
        },
      });

      // 3. Update root Asset warranty end date
      await tx.asset.update({
        where: { id: existing.assetId },
        data: { warrantyEnd: data.newEndDate },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'EXTEND_WARRANTY',
          entityType: 'Warranty',
          entityId: extension.id,
          oldValue: JSON.stringify({ previousEndDate: existing.endDate }),
          newValue: JSON.stringify({
            newEndDate: data.newEndDate,
            extensionReason: data.extensionReason,
          }),
        },
      });

      // 5. Asset Status History Event
      await HistoryService.recordEvent(tx, {
        assetId: existing.assetId,
        action: AssetAction.STATUS_CHANGED,
        performedById: userId,
        eventDate: new Date(),
        remarks: `Warranty extended by ${data.extensionReason}: new validity through ${data.newEndDate.toLocaleDateString('en-GB')}`,
      });

      return extension;
    });
  }

  /**
   * Cancel warranty record (non-destructive)
   */
  public static async cancelWarranty(
    id: string,
    data: { cancellationReason: string },
    userId: string
  ) {
    const existing = await prisma.warranty.findUnique({ where: { id } });
    if (!existing) throw new Error('Warranty record not found.');

    return await prisma.$transaction(async (tx) => {
      const cancelled = await tx.warranty.update({
        where: { id },
        data: {
          status: CoverageStatus.CANCELLED,
          coverageNotes: existing.coverageNotes
            ? `${existing.coverageNotes} | Cancellation Reason: ${data.cancellationReason}`
            : `Cancellation Reason: ${data.cancellationReason}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CANCEL_WARRANTY',
          entityType: 'Warranty',
          entityId: id,
          newValue: JSON.stringify({ cancellationReason: data.cancellationReason }),
        },
      });

      return cancelled;
    });
  }

  /**
   * Get distinct providers list from database
   */
  public static async getProviders(): Promise<string[]> {
    const warranties = await prisma.warranty.findMany({
      select: { provider: true },
      distinct: ['provider'],
      orderBy: { provider: 'asc' },
    });
    return warranties.map((w) => w.provider).filter(Boolean);
  }

  /**
   * Get asset search options for warranty creation wizard
   */
  public static async getAssetOptions(search?: string) {
    const where: Prisma.AssetWhereInput = {};
    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { companyAssetId: { contains: s, mode: 'insensitive' } },
        { assetCode: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
        { serialNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    return await prisma.asset.findMany({
      where,
      take: 20,
      include: {
        department: true,
        locationRel: true,
        currentHolder: true,
        warranties: {
          orderBy: { endDate: 'desc' },
          take: 1,
        },
      },
    });
  }

  /**
   * Safe initial backfill helper: creates warranty records for any asset that has
   * warrantyStart and warrantyEnd set in PostgreSQL but no Warranty record.
   */
  public static async syncInitialAssetWarranties(fallbackUserId?: string) {
    const assetsNeedingSync = await prisma.asset.findMany({
      where: {
        warrantyStart: { not: null },
        warrantyEnd: { not: null },
        warranties: { none: {} },
      },
      take: 50,
    });

    if (!assetsNeedingSync.length) return;

    let defaultUser = null;
    if (fallbackUserId) {
      defaultUser = await prisma.user.findUnique({ where: { id: fallbackUserId } });
    }
    if (!defaultUser) {
      defaultUser = await prisma.user.findFirst({ where: { role: { code: 'ADMIN' } } });
    }
    if (!defaultUser) return;

    for (const asset of assetsNeedingSync) {
      if (asset.warrantyStart && asset.warrantyEnd) {
        const code = await this.generateWarrantyCode();
        const provider = asset.manufacturer || 'Dell Technologies';
        const calc = this.calculateCoverage(asset.warrantyStart, asset.warrantyEnd, false);

        await prisma.warranty.create({
          data: {
            warrantyCode: code,
            assetId: asset.id,
            warrantyType: WarrantyType.STANDARD,
            provider,
            policyNumber: `POL-${asset.companyAssetId || asset.assetCode}`,
            coverageDescription: 'Standard OEM hardware warranty coverage and manufacturer support.',
            startDate: asset.warrantyStart,
            endDate: asset.warrantyEnd,
            status: calc.status,
            claimContact: `${provider} Support Desk`,
            contactEmail: `support@${provider.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            contactPhone: '1800-425-0088',
            createdById: defaultUser.id,
          },
        });
      }
    }
  }
}
