import prisma from '../config/prisma';
import { MaintenanceStatus, AssetStatus, AssetAction } from '@prisma/client';
import { MaintenanceCreateSchema, MaintenanceUpdateSchema } from '../validators/schemas';

export class MaintenanceService {
  static async getMaintenanceRecords(query: { status?: string; assetId?: string; search?: string }) {
    const where: any = {};
    if (query.status && query.status !== 'ALL') where.repairStatus = query.status;
    if (query.assetId) where.assetId = query.assetId;

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { issueTitle: { contains: s, mode: 'insensitive' } },
        { issueDescription: { contains: s, mode: 'insensitive' } },
        { technician: { contains: s, mode: 'insensitive' } },
        { serviceProvider: { contains: s, mode: 'insensitive' } },
        { asset: { assetCode: { contains: s, mode: 'insensitive' } } },
        { asset: { companyAssetId: { contains: s, mode: 'insensitive' } } },
        { asset: { model: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const records = await prisma.maintenanceRecord.findMany({
      where,
      orderBy: { reportedAt: 'desc' },
      include: {
        asset: {
          select: { id: true, assetCode: true, companyAssetId: true, assetType: true, manufacturer: true, model: true, status: true, location: true },
        },
        reportedBy: {
          select: { id: true, username: true },
        },
        parts: true,
      },
    });

    return records.map((r) => ({
      id: r.id,
      assetId: r.assetId,
      assetCode: r.asset.companyAssetId || r.asset.assetCode,
      assetName: r.asset.model || r.asset.manufacturer,
      assetType: r.asset.assetType,
      issueTitle: r.issueTitle,
      issueDescription: r.issueDescription,
      reportedAt: r.reportedAt,
      repairStatus: r.repairStatus,
      technician: r.technician || '—',
      serviceProvider: r.serviceProvider || 'Internal IT',
      repairStartDate: r.repairStartDate,
      repairEndDate: r.repairEndDate,
      repairCost: r.repairCost || 0,
      resolution: r.resolution || '—',
      remarks: r.remarks || '—',
      reportedByName: r.reportedBy?.username || 'admin',
      parts: r.parts,
    }));
  }

  static async getMaintenanceById(id: string) {
    const rec = await prisma.maintenanceRecord.findUnique({
      where: { id },
      include: {
        asset: {
          include: { currentHolder: true, specifications: true },
        },
        reportedBy: true,
        parts: true,
      },
    });
    if (!rec) throw new Error('Maintenance record not found');
    return rec;
  }

  static async createMaintenance(data: unknown, userId: string) {
    const validated = MaintenanceCreateSchema.parse(data);
    const asset = await prisma.asset.findUnique({ where: { id: validated.assetId } });
    if (!asset) throw new Error('Asset not found');

    return await prisma.$transaction(async (tx) => {
      const maintenance = await tx.maintenanceRecord.create({
        data: {
          assetId: validated.assetId,
          reportedById: userId,
          issueTitle: validated.issueTitle,
          issueDescription: validated.issueDescription,
          technician: validated.technician,
          serviceProvider: validated.serviceProvider,
          repairCost: validated.repairCost || 0.0,
          repairStartDate: validated.repairStartDate,
          repairEndDate: validated.repairEndDate,
          resolution: validated.resolution,
          remarks: validated.remarks,
          repairStatus: validated.repairStatus || MaintenanceStatus.REPORTED,
        },
      });

      // Transition asset status to UNDER_REPAIR
      await tx.asset.update({
        where: { id: validated.assetId },
        data: { status: AssetStatus.UNDER_REPAIR },
      });

      await tx.assetStatusHistory.create({
        data: {
          assetId: validated.assetId,
          action: AssetAction.MAINTENANCE_STARTED,
          previousStatus: asset.status,
          newStatus: AssetStatus.UNDER_REPAIR,
          performedById: userId,
          remarks: `Maintenance ticket logged: ${validated.issueTitle}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'MAINTENANCE_CREATE',
          entityType: 'MaintenanceRecord',
          entityId: maintenance.id,
          newValue: JSON.stringify({ issueTitle: validated.issueTitle, assetId: validated.assetId }),
        },
      });

      return maintenance;
    });
  }

  static async updateMaintenance(id: string, data: unknown, userId: string) {
    const existing = await prisma.maintenanceRecord.findUnique({ where: { id }, include: { asset: true } });
    if (!existing) throw new Error('Maintenance record not found');

    const validated = MaintenanceUpdateSchema.parse(data);

    return await prisma.$transaction(async (tx) => {
      const { parts, ...recData } = validated;

      const updated = await tx.maintenanceRecord.update({
        where: { id },
        data: recData,
        include: { parts: true, asset: true },
      });

      if (parts && parts.length > 0) {
        await tx.maintenancePart.deleteMany({ where: { maintenanceId: id } });
        await tx.maintenancePart.createMany({
          data: parts.map((p) => ({
            maintenanceId: id,
            partName: p.partName,
            quantity: p.quantity,
            cost: p.cost,
            remarks: p.remarks,
          })),
        });
      }

      // If status changed to COMPLETED, restore asset status to AVAILABLE
      if (validated.repairStatus === MaintenanceStatus.COMPLETED && existing.repairStatus !== MaintenanceStatus.COMPLETED) {
        await tx.asset.update({
          where: { id: existing.assetId },
          data: { status: AssetStatus.AVAILABLE },
        });

        await tx.assetStatusHistory.create({
          data: {
            assetId: existing.assetId,
            action: AssetAction.MAINTENANCE_COMPLETED,
            previousStatus: AssetStatus.UNDER_REPAIR,
            newStatus: AssetStatus.AVAILABLE,
            performedById: userId,
            remarks: `Maintenance completed. Resolution: ${validated.resolution || 'Resolved'}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId,
          action: 'MAINTENANCE_UPDATE',
          entityType: 'MaintenanceRecord',
          entityId: id,
          oldValue: JSON.stringify({ repairStatus: existing.repairStatus }),
          newValue: JSON.stringify({ repairStatus: validated.repairStatus }),
        },
      });

      return updated;
    });
  }

  static async deleteMaintenance(id: string, userId: string) {
    const existing = await prisma.maintenanceRecord.findUnique({ where: { id } });
    if (!existing) throw new Error('Maintenance record not found');

    return await prisma.$transaction(async (tx) => {
      await tx.maintenancePart.deleteMany({ where: { maintenanceId: id } });
      await tx.maintenanceRecord.delete({ where: { id } });

      // Check if any other active maintenance records remain for this asset
      const remaining = await tx.maintenanceRecord.count({
        where: {
          assetId: existing.assetId,
          repairStatus: { in: [MaintenanceStatus.REPORTED, MaintenanceStatus.APPROVED, MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.WAITING_FOR_PARTS] },
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
          action: 'MAINTENANCE_DELETE',
          entityType: 'MaintenanceRecord',
          entityId: id,
          oldValue: JSON.stringify({ issueTitle: existing.issueTitle, assetId: existing.assetId }),
        },
      });

      return { id, message: 'Maintenance record deleted successfully.' };
    });
  }
}
