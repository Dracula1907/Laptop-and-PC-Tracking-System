import prisma from '../config/prisma';
import { ClaimStatus, AssetAction, Prisma } from '@prisma/client';
import { HistoryService } from './history.service';

export class WarrantyClaimService {
  /**
   * Helper for generating sequential claim numbers: CLM-000001
   */
  public static async generateClaimNumber(): Promise<string> {
    const records = await prisma.warrantyClaim.findMany({
      where: { claimNumber: { startsWith: 'CLM-' } },
      select: { claimNumber: true },
    });

    let maxNum = 0;
    for (const r of records) {
      if (r.claimNumber) {
        const match = r.claimNumber.match(/^CLM-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    return `CLM-${String(maxNum + 1).padStart(6, '0')}`;
  }

  /**
   * Search, filter, and paginate warranty claims
   */
  public static async getClaims(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    warrantyId?: string;
    assetId?: string;
    provider?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.WarrantyClaimWhereInput = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as ClaimStatus;
    }
    if (query.warrantyId && query.warrantyId !== 'ALL') {
      where.warrantyId = query.warrantyId;
    }
    if (query.assetId && query.assetId !== 'ALL') {
      where.assetId = query.assetId;
    }
    if (query.provider && query.provider !== 'ALL') {
      where.provider = { contains: query.provider, mode: 'insensitive' };
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { claimNumber: { contains: s, mode: 'insensitive' } },
        { issue: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { provider: { contains: s, mode: 'insensitive' } },
        { resolution: { contains: s, mode: 'insensitive' } },
        { warranty: { warrantyCode: { contains: s, mode: 'insensitive' } } },
        { asset: { companyAssetId: { contains: s, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: s, mode: 'insensitive' } } },
        { asset: { model: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, claims] = await Promise.all([
      prisma.warrantyClaim.count({ where }),
      prisma.warrantyClaim.findMany({
        where,
        skip,
        take: limit,
        orderBy: { claimDate: 'desc' },
        include: {
          warranty: true,
          asset: {
            include: {
              department: true,
              locationRel: true,
              currentHolder: true,
            },
          },
          maintenance: true,
          createdBy: {
            include: { employee: true },
          },
        },
      }),
    ]);

    return {
      claims,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Get single claim by ID
   */
  public static async getClaimById(id: string) {
    const claim = await prisma.warrantyClaim.findUnique({
      where: { id },
      include: {
        warranty: true,
        asset: {
          include: {
            department: true,
            locationRel: true,
            currentHolder: true,
          },
        },
        maintenance: {
          include: { technicianEmployee: true },
        },
        createdBy: {
          include: { employee: true },
        },
      },
    });

    if (!claim) throw new Error('Warranty claim not found.');
    return claim;
  }

  /**
   * Create a new warranty claim
   */
  public static async createClaim(
    data: {
      warrantyId: string;
      assetId: string;
      claimDate?: Date;
      issue: string;
      description: string;
      provider: string;
      claimCost?: number | null;
      warrantyCovered?: boolean;
      coveredAmount?: number | null;
      outOfPocketAmount?: number | null;
      maintenanceId?: string | null;
      remarks?: string | null;
    },
    userId: string
  ) {
    const warranty = await prisma.warranty.findUnique({ where: { id: data.warrantyId } });
    if (!warranty) throw new Error('Referenced warranty not found.');
    if (warranty.assetId !== data.assetId) {
      throw new Error('Warranty does not correspond to the specified asset.');
    }

    const claimNumber = await this.generateClaimNumber();

    return await prisma.$transaction(async (tx) => {
      const claim = await tx.warrantyClaim.create({
        data: {
          claimNumber,
          warrantyId: data.warrantyId,
          assetId: data.assetId,
          claimDate: data.claimDate || new Date(),
          issue: data.issue,
          description: data.description,
          provider: data.provider,
          status: ClaimStatus.SUBMITTED,
          submittedDate: new Date(),
          claimCost: data.claimCost || null,
          warrantyCovered: data.warrantyCovered !== undefined ? data.warrantyCovered : true,
          coveredAmount: data.coveredAmount || null,
          outOfPocketAmount: data.outOfPocketAmount || null,
          maintenanceId: data.maintenanceId || null,
          remarks: data.remarks || null,
          createdById: userId,
        },
        include: {
          warranty: true,
          asset: true,
          createdBy: { include: { employee: true } },
        },
      });

      // If linked to a MaintenanceRecord, synchronize its warranty coverage fields
      if (data.maintenanceId) {
        await tx.maintenanceRecord.update({
          where: { id: data.maintenanceId },
          data: {
            underWarranty: true,
            warrantyId: data.warrantyId,
            warrantyProvider: data.provider,
            warrantyClaimNumber: claimNumber,
            warrantyCoverage: 'FULL_COVERAGE',
            coveredAmount: data.coveredAmount || null,
            outOfPocketAmount: data.outOfPocketAmount || null,
          },
        });
      }

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_CLAIM',
          entityType: 'WarrantyClaim',
          entityId: claim.id,
          newValue: JSON.stringify({
            claimNumber,
            issue: data.issue,
            provider: data.provider,
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
        remarks: `Warranty claim filed: ${claimNumber} (${data.issue}) with ${data.provider}`,
      });

      return claim;
    });
  }

  /**
   * Update claim status or resolution
   */
  public static async updateClaim(
    id: string,
    data: {
      status?: ClaimStatus;
      serviceDate?: Date | null;
      resolvedDate?: Date | null;
      resolution?: string | null;
      claimCost?: number | null;
      coveredAmount?: number | null;
      outOfPocketAmount?: number | null;
      remarks?: string | null;
    },
    userId: string
  ) {
    const existing = await prisma.warrantyClaim.findUnique({
      where: { id },
      include: { asset: true, maintenance: true },
    });
    if (!existing) throw new Error('Warranty claim not found.');

    const isResolving = data.status === ClaimStatus.RESOLVED && existing.status !== ClaimStatus.RESOLVED;
    const resolvedDate = isResolving ? new Date() : data.resolvedDate || existing.resolvedDate;

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.warrantyClaim.update({
        where: { id },
        data: {
          ...data,
          resolvedDate,
        },
      });

      // If linked maintenance ticket, update costs if changed
      if (existing.maintenanceId && (data.coveredAmount !== undefined || data.outOfPocketAmount !== undefined)) {
        await tx.maintenanceRecord.update({
          where: { id: existing.maintenanceId },
          data: {
            coveredAmount: data.coveredAmount !== undefined ? data.coveredAmount : existing.coveredAmount,
            outOfPocketAmount: data.outOfPocketAmount !== undefined ? data.outOfPocketAmount : existing.outOfPocketAmount,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: data.status ? 'CLAIM_STATUS_CHANGE' : 'UPDATE_CLAIM',
          entityType: 'WarrantyClaim',
          entityId: id,
          oldValue: JSON.stringify({ status: existing.status, resolution: existing.resolution }),
          newValue: JSON.stringify({ status: data.status || existing.status, resolution: data.resolution || existing.resolution }),
        },
      });

      if (isResolving) {
        await HistoryService.recordEvent(tx, {
          assetId: existing.assetId,
          action: AssetAction.STATUS_CHANGED,
          performedById: userId,
          eventDate: new Date(),
          remarks: `Warranty claim resolved: ${existing.claimNumber} - ${data.resolution || 'Service completed by vendor'}`,
        });
      }

      return updated;
    });
  }
}
