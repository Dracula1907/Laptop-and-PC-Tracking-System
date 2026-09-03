import crypto from 'crypto';
import prisma from '../config/prisma';
import { QrCodeStatus } from '@prisma/client';

export class QrService {
  /**
   * Generates a safe, non-sensitive opaque token.
   * Never contains hardware specs, employee personal info, IPs, MACs, or credentials.
   */
  public static generateSafeToken(assetCode: string): string {
    const cleanCode = assetCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const nonce = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `FAITH-QR-${cleanCode}-${nonce}`;
  }

  /**
   * Generate an active QR code for an asset.
   * If an active QR already exists, it is returned without duplicate generation.
   */
  public static async generateAssetQr(assetId: string, userId?: string) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new Error('Asset not found.');
    }

    // Check for existing active QR
    const existingActive = await prisma.assetQrCode.findFirst({
      where: {
        assetId,
        status: QrCodeStatus.ACTIVE,
      },
    });

    if (existingActive) {
      return existingActive;
    }

    const token = this.generateSafeToken(asset.companyAssetId || asset.assetCode);

    const qr = await prisma.assetQrCode.create({
      data: {
        assetId,
        token,
        status: QrCodeStatus.ACTIVE,
        generatedById: userId || null,
      },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            companyAssetId: true,
            assetName: true,
            model: true,
            gatePresence: true,
          },
        },
      },
    });

    // Record audit log
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'QR_GENERATED',
          entityType: 'AssetQrCode',
          entityId: qr.id,
          newValue: JSON.stringify({
            assetCode: asset.companyAssetId || asset.assetCode,
            token: qr.token,
          }),
        },
      }).catch(() => {});
    }

    return qr;
  }

  /**
   * Fetch active QR code and all historical tags for an asset.
   */
  public static async getAssetQrs(assetId: string) {
    const [activeQr, history] = await Promise.all([
      prisma.assetQrCode.findFirst({
        where: { assetId, status: QrCodeStatus.ACTIVE },
        include: {
          generatedBy: { select: { id: true, username: true } },
        },
      }),
      prisma.assetQrCode.findMany({
        where: { assetId, status: { not: QrCodeStatus.ACTIVE } },
        orderBy: { createdAt: 'desc' },
        include: {
          generatedBy: { select: { id: true, username: true } },
          revokedBy: { select: { id: true, username: true } },
          replacedBy: { select: { id: true, username: true } },
        },
      }),
    ]);

    return { activeQr, history };
  }

  /**
   * Replace a damaged or worn active QR code with a fresh unique code.
   * Marks previous active tag as REPLACED.
   */
  public static async replaceQr(assetId: string, reason: string, userId?: string) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error('Asset not found.');

    const activeQr = await prisma.assetQrCode.findFirst({
      where: { assetId, status: QrCodeStatus.ACTIVE },
    });

    const newToken = this.generateSafeToken(asset.companyAssetId || asset.assetCode);

    return await prisma.$transaction(async (tx) => {
      if (activeQr) {
        await tx.assetQrCode.update({
          where: { id: activeQr.id },
          data: {
            status: QrCodeStatus.REPLACED,
            replacedAt: new Date(),
            replacedById: userId || null,
            replacementReason: reason || 'Physical tag replacement',
          },
        });
      }

      const freshQr = await tx.assetQrCode.create({
        data: {
          assetId,
          token: newToken,
          status: QrCodeStatus.ACTIVE,
          generatedById: userId || null,
        },
      });

      if (userId) {
        await tx.auditLog.create({
          data: {
            userId,
            action: 'QR_REPLACED',
            entityType: 'AssetQrCode',
            entityId: freshQr.id,
            oldValue: activeQr ? activeQr.token : undefined,
            newValue: freshQr.token,
          },
        }).catch(() => {});
      }

      return freshQr;
    });
  }

  /**
   * Revoke an active QR tag.
   * Once revoked, it cannot be scanned for security gate movements.
   */
  public static async revokeQr(assetId: string, reason: string, userId?: string) {
    const activeQr = await prisma.assetQrCode.findFirst({
      where: { assetId, status: QrCodeStatus.ACTIVE },
    });

    if (!activeQr) {
      throw new Error('No active QR code exists for this asset to revoke.');
    }

    const updated = await prisma.assetQrCode.update({
      where: { id: activeQr.id },
      data: {
        status: QrCodeStatus.REVOKED,
        revokedAt: new Date(),
        revokedById: userId || null,
        revocationReason: reason || 'Tag revoked by administrator',
      },
    });

    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'QR_REVOKED',
          entityType: 'AssetQrCode',
          entityId: updated.id,
          newValue: JSON.stringify({ token: updated.token, reason }),
        },
      }).catch(() => {});
    }

    return updated;
  }

  /**
   * Bulk generate QR codes for assets that do not currently possess an active tag.
   */
  public static async bulkGenerateQrs(assetIds?: string[], userId?: string) {
    const where: any = {};
    if (assetIds && assetIds.length > 0) {
      where.id = { in: assetIds };
    }

    // Find eligible assets that do not have an active QR
    const assets = await prisma.asset.findMany({
      where: {
        ...where,
        qrCodes: {
          none: { status: QrCodeStatus.ACTIVE },
        },
      },
      select: { id: true, assetCode: true, companyAssetId: true },
    });

    const createdList = [];
    for (const a of assets) {
      const token = this.generateSafeToken(a.companyAssetId || a.assetCode);
      const qr = await prisma.assetQrCode.create({
        data: {
          assetId: a.id,
          token,
          status: QrCodeStatus.ACTIVE,
          generatedById: userId || null,
        },
      });
      createdList.push(qr);
    }

    return {
      totalCreated: createdList.length,
      createdList,
    };
  }

  /**
   * Resolves a scanned QR token.
   * Returns limited, non-sensitive asset fields permitted for Security Guards.
   * Strictly filters out LAN IP, MAC address, detailed specs, and financial data.
   */
  public static async resolveQrToken(token: string, user?: { userId?: string; roleCode?: string }) {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid scan payload.');
    }

    const trimmed = token.trim();
    const qr = await prisma.assetQrCode.findUnique({
      where: { token: trimmed },
      include: {
        asset: {
          include: {
            currentHolder: {
              select: {
                id: true,
                employeeCode: true,
                fullName: true,
                designation: true,
              },
            },
            department: {
              select: { id: true, name: true, code: true },
            },
            locationRel: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!qr) {
      throw new Error('Unknown QR code. This tag is not registered in the system.');
    }

    if (qr.status === QrCodeStatus.REVOKED) {
      throw new Error(`This QR code was revoked on ${qr.revokedAt?.toISOString().slice(0, 10)}. Movement is prohibited.`);
    }

    if (qr.status === QrCodeStatus.REPLACED) {
      throw new Error('This QR code was replaced by a newer tag. Please scan the replacement QR code.');
    }

    const asset = qr.asset;

    // Check if there is an active open OUT movement
    const openOutMovement = await prisma.gateMovement.findFirst({
      where: {
        assetId: asset.id,
        movementType: 'OUT',
        status: 'OPEN',
      },
      include: {
        gate: { select: { id: true, name: true, code: true } },
        guardUser: { select: { id: true, username: true } },
      },
      orderBy: { movementDateTime: 'desc' },
    });

    // Check if caller is Admin or Manager to provide full rich asset details
    const isAdminOrManager = user?.roleCode === 'ADMIN' || user?.roleCode === 'MANAGER';
    let fullDetails: any = null;
    if (isAdminOrManager) {
      const fullAsset: any = await prisma.asset.findUnique({
        where: { id: asset.id },
        include: {
          specifications: true,
          department: true,
          locationRel: true,
          currentHolder: true,
          assignments: { orderBy: { createdAt: 'desc' }, take: 3, include: { employee: true } },
          transfers: { orderBy: { createdAt: 'desc' }, take: 3 },
          returns: { orderBy: { createdAt: 'desc' }, take: 3 },
          maintenance: { orderBy: { createdAt: 'desc' }, take: 3 },
          gateMovements: { orderBy: { movementDateTime: 'desc' }, take: 5, include: { gate: true } },
        },
      });

      if (fullAsset) {
        const warranties = await prisma.warranty.findMany({
          where: { assetId: asset.id },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });

        fullDetails = {
          status: fullAsset.status,
          allocationStatus: fullAsset.allocationStatus,
          criticality: fullAsset.criticality,
          purchaseCost: fullAsset.purchaseCost,
          purchaseDate: fullAsset.purchaseDate,
          warrantyStart: fullAsset.warrantyStart,
          warrantyEnd: fullAsset.warrantyEnd,
          dataQualityStatus: fullAsset.dataQualityStatus,
          dataQualityIssues: fullAsset.dataQualityIssues,
          specifications: fullAsset.specifications,
          warranties,
          maintenance: fullAsset.maintenance,
          assignments: fullAsset.assignments,
          transfers: fullAsset.transfers,
          returns: fullAsset.returns,
          gateMovements: fullAsset.gateMovements,
        };
      }
    }


    return {
      qrId: qr.id,
      token: qr.token,
      qrStatus: qr.status,
      assetId: asset.id,
      assetCode: asset.companyAssetId || asset.assetCode,
      assetName: asset.assetName || asset.model,
      assetType: asset.assetType,
      manufacturer: asset.manufacturer,
      model: asset.model,
      serialNumber: asset.serialNumber || 'N/A',
      currentHolder: asset.currentHolder?.fullName || asset.employeeNameSource || 'Unassigned Stock',
      employeeCode: asset.currentHolder?.employeeCode || null,
      department: asset.department?.name || asset.location || 'General',
      location: asset.locationRel?.name || asset.location || 'Headquarters',
      gatePresence: asset.gatePresence,
      openOutMovement: openOutMovement
        ? {
            id: openOutMovement.id,
            movementCode: openOutMovement.movementCode,
            movementDateTime: openOutMovement.movementDateTime,
            gateName: openOutMovement.gate?.name || 'Gate',
            destination: openOutMovement.destination,
            purpose: openOutMovement.purpose,
            expectedReturn: openOutMovement.expectedReturn,
            remarks: openOutMovement.remarks,
            guardName: openOutMovement.guardUser?.username || 'Security Guard',
          }
        : null,
      ...(fullDetails ? { fullDetails } : {}),
    };
  }
}

