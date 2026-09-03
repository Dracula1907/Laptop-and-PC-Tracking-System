import prisma from '../config/prisma';
import {
  RetirementStatus,
  RetirementReason,
  DisposalMethod,
  DataSanitizationStatus,
  ReplacementStatus,
  AssetStatus,
  AllocationStatus,
  AssetAction,
  NotificationCategory,
  NotificationPriority,
  ApprovalRequestType,
  ApprovalStatus,
  ApprovalPriority,
} from '@prisma/client';
import { NotificationService } from './notification.service';
import { DocumentService } from './document.service';
import { DocumentType } from '@prisma/client';
import { logger } from '../utils/logger';

export class RetirementService {
  private static async generateRetirementCode(): Promise<string> {
    const count = await prisma.retirement.count();
    return `RTM-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * 1. Identify Retirement Candidates with Transparent Scoring
   */
  static async getRetirementCandidates() {
    const now = new Date();

    const assets = await prisma.asset.findMany({
      where: {
        status: { notIn: [AssetStatus.RETIRED, AssetStatus.SCRAPPED] },
      },
      include: {
        department: true,
        locationRel: true,
        currentHolder: true,
        maintenance: true,
        warranties: { orderBy: { endDate: 'desc' }, take: 1 },
      },
      take: 200,
    });

    const candidates = [];

    for (const a of assets) {
      const reasons: string[] = [];
      let recommendation = 'RETAIN';

      // 1. Age Check
      let ageYears: number | null = null;
      if (a.purchaseDate) {
        ageYears = Number(((now.getTime() - new Date(a.purchaseDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1));
        if (ageYears >= 5) {
          reasons.push(`Asset age is ${ageYears} years (Threshold: 5.0y)`);
        }
      }

      // 2. Condition Check
      if (a.condition === 'DAMAGED' || a.condition === 'CRITICAL') {
        reasons.push(`Current condition is rated ${a.condition}`);
      }

      // 3. Maintenance Burden & Costs
      const maintenanceCount = a.maintenance.length;
      const totalMaintenanceCost = a.maintenance.reduce((acc, m) => acc + (m.repairCost || 0), 0);

      if (maintenanceCount >= 4) {
        reasons.push(`Repeated repairs: ${maintenanceCount} service tickets logged`);
      }
      if (totalMaintenanceCost >= 20000) {
        reasons.push(`High repair expenditure: Rs. ${totalMaintenanceCost.toLocaleString('en-IN')}`);
      }

      // 4. Warranty Status
      const latestWarranty = a.warranties[0];
      const isWarrantyExpired = (a.warrantyEnd && new Date(a.warrantyEnd) < now) || (latestWarranty && latestWarranty.endDate < now);
      if (isWarrantyExpired) {
        reasons.push('Manufacturer & contract warranty coverage has expired');
      }

      // Recommendation logic
      if (reasons.length >= 2 || (ageYears && ageYears >= 6) || a.condition === 'CRITICAL') {
        recommendation = 'REPLACEMENT_RECOMMENDED';
      } else if (reasons.length >= 1) {
        recommendation = 'REVIEW_RECOMMENDED';
      }

      if (recommendation !== 'RETAIN') {
        candidates.push({
          assetId: a.id,
          assetCode: a.assetCode,
          assetName: a.assetName || a.model,
          assetType: a.assetType,
          serialNumber: a.serialNumber,
          department: a.department?.name || '—',
          location: a.locationRel?.name || '—',
          currentHolder: a.currentHolder?.fullName || null,
          allocationStatus: a.allocationStatus,
          status: a.status,
          condition: a.condition,
          criticality: a.criticality || 'MEDIUM',
          ageYears: ageYears !== null ? `${ageYears} years` : 'Age Unknown',
          maintenanceCount,
          maintenanceCost: totalMaintenanceCost,
          warrantyStatus: isWarrantyExpired ? 'EXPIRED' : 'ACTIVE',
          recommendation,
          reasons,
        });
      }
    }

    return candidates;
  }

  /**
   * 2. Propose or Request Asset Retirement
   */
  static async requestRetirement(
    data: {
      assetId: string;
      reason: RetirementReason;
      overrideReason?: string;
      finalCondition?: any;
      finalLocation?: string;
      replacementAssetId?: string;
      remarks?: string;
    },
    userId: string
  ) {
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
      include: { assignments: { where: { status: 'ACTIVE' } } },
    });

    if (!asset) throw new Error('Asset not found');
    if (asset.status === AssetStatus.RETIRED) {
      throw new Error('This asset is already retired.');
    }

    // Guard: Prevent retirement of actively assigned assets
    if (asset.allocationStatus === AllocationStatus.ALLOCATED || asset.assignments.length > 0) {
      throw new Error(
        'Cannot retire an actively assigned asset. Please process an asset return or offboarding clearance first.'
      );
    }

    const retirementCode = await this.generateRetirementCode();

    // Check approval policy
    const policy = await prisma.approvalPolicy.findUnique({
      where: { operationType: ApprovalRequestType.ASSET_RETIREMENT },
    });

    const requiresApproval = policy ? policy.requiresApproval : true;

    return prisma.$transaction(async (tx) => {
      let approvalRequestId: string | null = null;

      if (requiresApproval) {
        const count = await tx.approvalRequest.count();
        const requestCode = `APR-${String(count + 1).padStart(6, '0')}`;

        const appReq = await tx.approvalRequest.create({
          data: {
            requestCode,
            requestType: ApprovalRequestType.ASSET_RETIREMENT,
            relatedEntityType: 'Retirement',
            assetId: asset.id,
            requestedById: userId,
            status: ApprovalStatus.PENDING,
            priority: ApprovalPriority.HIGH,
            reason: `Asset Retirement Request for ${asset.assetCode}: ${data.reason}`,
            comments: data.remarks,
            proposedChanges: JSON.stringify({
              retirementCode,
              reason: data.reason,
              overrideReason: data.overrideReason,
            }),
            expectedSourceState: JSON.stringify({ status: asset.status }),
          },
        });
        approvalRequestId = appReq.id;
      }

      const retirement = await tx.retirement.create({
        data: {
          retirementCode,
          assetId: asset.id,
          status: requiresApproval ? RetirementStatus.PENDING_APPROVAL : RetirementStatus.APPROVED,
          reason: data.reason,
          overrideReason: data.overrideReason,
          finalCondition: data.finalCondition || asset.condition,
          finalLocation: data.finalLocation,
          requestedById: userId,
          approvalRequestId,
          replacementAssetId: data.replacementAssetId,
          replacementStatus: data.replacementAssetId
            ? ReplacementStatus.REQUESTED
            : ReplacementStatus.NOT_REQUIRED,
          remarks: data.remarks,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'RETIREMENT_REQUESTED',
          entityType: 'Retirement',
          entityId: retirement.id,
          newValue: JSON.stringify({ retirementCode, assetCode: asset.assetCode, reason: data.reason }),
        },
      });

      return retirement;
    });
  }

  /**
   * 3. Complete and Execute Retirement
   */
  static async completeRetirement(
    retirementId: string,
    data: {
      dataSanitizationStatus?: DataSanitizationStatus;
      disposalMethod?: DisposalMethod;
      disposalVendor?: string;
      disposalReference?: string;
      residualValue?: number;
      finalLocation?: string;
      remarks?: string;
    },
    userId: string
  ) {
    const rtm = await prisma.retirement.findUnique({
      where: { id: retirementId },
      include: { asset: true, approvalRequest: true },
    });

    if (!rtm) throw new Error('Retirement record not found');
    if (rtm.status === RetirementStatus.COMPLETED) {
      throw new Error('Retirement has already been completed.');
    }

    if (rtm.approvalRequest && rtm.approvalRequest.status === ApprovalStatus.PENDING) {
      throw new Error('Retirement request is still pending approval in Approval Center.');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Update Retirement record
      const updated = await tx.retirement.update({
        where: { id: retirementId },
        data: {
          status: RetirementStatus.COMPLETED,
          retirementDate: new Date(),
          approvedById: userId,
          dataSanitizationStatus: data.dataSanitizationStatus || rtm.dataSanitizationStatus,
          disposalMethod: data.disposalMethod,
          disposalVendor: data.disposalVendor,
          disposalReference: data.disposalReference,
          disposalDate: data.disposalMethod ? new Date() : null,
          residualValue: data.residualValue,
          finalLocation: data.finalLocation || rtm.finalLocation,
          remarks: data.remarks || rtm.remarks,
        },
      });

      // 2. Update Asset State
      await tx.asset.update({
        where: { id: rtm.assetId },
        data: {
          status: AssetStatus.RETIRED,
          allocationStatus: AllocationStatus.NOT_ALLOCATED,
          currentHolderId: null,
        },
      });

      // 3. Create Asset Status History
      await tx.assetStatusHistory.create({
        data: {
          assetId: rtm.assetId,
          action: AssetAction.RETIRED,
          previousStatus: rtm.asset.status,
          newStatus: AssetStatus.RETIRED,
          previousAllocationStatus: rtm.asset.allocationStatus,
          newAllocationStatus: AllocationStatus.NOT_ALLOCATED,
          performedById: userId,
          reason: `Asset Retired: ${rtm.reason}`,
          remarks: `Retirement Code: ${rtm.retirementCode}. Final location: ${data.finalLocation || 'Decommissioned'}`,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'RETIREMENT_COMPLETED',
          entityType: 'Retirement',
          entityId: retirementId,
          newValue: JSON.stringify({
            retirementCode: rtm.retirementCode,
            assetCode: rtm.asset.assetCode,
            disposalMethod: data.disposalMethod,
          }),
        },
      });

      return updated;
    });
  }

  /**
   * 4. Side-by-side Replacement Comparison
   */
  static async compareReplacement(oldAssetId: string, replacementAssetId: string) {
    const [oldAsset, replacement] = await Promise.all([
      prisma.asset.findUnique({
        where: { id: oldAssetId },
        include: { specifications: true, department: true, locationRel: true },
      }),
      prisma.asset.findUnique({
        where: { id: replacementAssetId },
        include: { specifications: true, department: true, locationRel: true },
      }),
    ]);

    if (!oldAsset || !replacement) {
      throw new Error('One or both assets not found for comparison.');
    }

    return {
      oldAsset: {
        id: oldAsset.id,
        assetCode: oldAsset.assetCode,
        assetName: oldAsset.assetName || oldAsset.model,
        assetType: oldAsset.assetType,
        model: oldAsset.model,
        manufacturer: oldAsset.manufacturer,
        status: oldAsset.status,
        condition: oldAsset.condition,
        specs: oldAsset.specifications,
        purchaseDate: oldAsset.purchaseDate,
      },
      replacement: {
        id: replacement.id,
        assetCode: replacement.assetCode,
        assetName: replacement.assetName || replacement.model,
        assetType: replacement.assetType,
        model: replacement.model,
        manufacturer: replacement.manufacturer,
        status: replacement.status,
        condition: replacement.condition,
        specs: replacement.specifications,
        purchaseDate: replacement.purchaseDate,
      },
    };
  }

  /**
   * 5. Query Retirements
   */
  static async getRetirements(query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) where.status = query.status as RetirementStatus;
    if (query.reason) where.reason = query.reason as RetirementReason;
    if (query.search) {
      where.OR = [
        { retirementCode: { contains: query.search, mode: 'insensitive' } },
        { asset: { assetCode: { contains: query.search, mode: 'insensitive' } } },
        { asset: { model: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [retirements, total] = await Promise.all([
      prisma.retirement.findMany({
        where,
        include: {
          asset: { select: { assetCode: true, model: true, assetType: true, serialNumber: true } },
          requestedBy: { select: { username: true } },
          approvedBy: { select: { username: true } },
          replacementAsset: { select: { assetCode: true, model: true } },
        },
        orderBy: { requestedDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.retirement.count({ where }),
    ]);

    return { retirements, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
