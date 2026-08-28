import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../types';
import { AssetService } from '../services/asset.service';
import { logger } from '../utils/logger';

export class ReturnController {
  /**
   * Get all asset return records
   */
  public static async getReturns(req: AuthenticatedRequest, res: Response) {
    try {
      const returns = await prisma.assetReturn.findMany({
        orderBy: { returnDate: 'desc' },
        include: {
          asset: {
            include: {
              department: true,
              locationRel: true,
            },
          },
          employee: {
            include: { department: true, location: true },
          },
          receivedBy: {
            select: { id: true, username: true },
          },
        },
      });

      const formatted = returns.map((r) => ({
        id: r.id,
        assetId: r.assetId,
        assetCode: r.asset.companyAssetId || r.asset.assetCode,
        assetName: r.asset.assetName || r.asset.model,
        serialNumber: r.asset.serialNumber || '—',
        assetType: r.asset.sourceAssetType || r.asset.assetType,
        employeeId: r.employeeId,
        employeeName: r.employee?.fullName || '—',
        employeeCode: r.employee?.employeeCode || '—',
        departmentName: r.employee?.department?.name || r.asset.department?.name || 'General',
        receivedByName: r.receivedBy?.username || 'admin',
        returnDate: r.returnDate,
        conditionAtReturn: r.conditionAtReturn,
        accessoriesReturned: r.accessoriesReturned,
        damageReported: r.damageReported,
        missingAccessories: r.missingAccessories || 'None',
        remarks: r.remarks || 'Standard asset return handover',
        status: r.status,
      }));

      return res.json({
        success: true,
        data: formatted,
        total: formatted.length,
      });
    } catch (err: any) {
      logger.error('Error fetching returns:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get options for creating a return (allocated assets and employee custodians)
   */
  public static async getOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const [assets, employees] = await Promise.all([
        prisma.asset.findMany({
          select: {
            id: true,
            companyAssetId: true,
            assetCode: true,
            assetName: true,
            model: true,
            serialNumber: true,
            currentHolderId: true,
            condition: true,
            status: true,
            currentHolder: {
              select: { id: true, fullName: true, employeeCode: true },
            },
          },
          orderBy: { companyAssetId: 'asc' },
        }),
        prisma.employee.findMany({
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            department: { select: { id: true, name: true } },
          },
          orderBy: { fullName: 'asc' },
        }),
      ]);

      return res.json({
        success: true,
        data: {
          assets,
          employees,
        },
      });
    } catch (err: any) {
      logger.error('Error fetching return options:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Create a new asset return
   */
  public static async createReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const { assetId, conditionAtReturn, accessoriesReturned, damageReported, missingAccessories, remarks } = req.body;

      if (!assetId) {
        return res.status(400).json({ success: false, message: 'Asset ID is required.' });
      }

      const userId = req.user?.userId || (await prisma.user.findFirst({ where: { username: 'admin' } }))?.id || '';

      const returnRec = await AssetService.returnAsset(
        assetId,
        {
          conditionAtReturn: conditionAtReturn || 'GOOD',
          accessoriesReturned: accessoriesReturned !== false,
          damageReported: Boolean(damageReported),
          missingAccessories: missingAccessories || null,
          remarks: remarks || 'Returned to IT inventory',
        },
        userId
      );

      return res.status(201).json({
        success: true,
        message: 'Asset returned to stock successfully.',
        data: returnRec,
      });
    } catch (err: any) {
      logger.error('Error creating return:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Update an existing return
   */
  public static async updateReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const { conditionAtReturn, accessoriesReturned, damageReported, missingAccessories, remarks } = req.body;
      const id = req.params.id;

      const existing = await prisma.assetReturn.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Return record not found.' });
      }

      const updated = await prisma.assetReturn.update({
        where: { id },
        data: {
          conditionAtReturn: conditionAtReturn || existing.conditionAtReturn,
          accessoriesReturned: accessoriesReturned !== undefined ? accessoriesReturned : existing.accessoriesReturned,
          damageReported: damageReported !== undefined ? damageReported : existing.damageReported,
          missingAccessories: missingAccessories !== undefined ? missingAccessories : existing.missingAccessories,
          remarks: remarks !== undefined ? remarks : existing.remarks,
        },
      });

      const userId = req.user?.userId || '';
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'RETURN_UPDATE',
          entityType: 'AssetReturn',
          entityId: id,
          oldValue: JSON.stringify({ condition: existing.conditionAtReturn, damage: existing.damageReported }),
          newValue: JSON.stringify({ condition: updated.conditionAtReturn, damage: updated.damageReported }),
        },
      });

      return res.json({
        success: true,
        message: 'Return record updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      logger.error('Error updating return:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Delete a return record
   */
  public static async deleteReturn(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id;
      const existing = await prisma.assetReturn.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Return record not found.' });
      }

      await prisma.assetReturn.delete({ where: { id } });

      const userId = req.user?.userId || '';
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'RETURN_DELETE',
          entityType: 'AssetReturn',
          entityId: id,
          oldValue: JSON.stringify({ assetId: existing.assetId, returnDate: existing.returnDate }),
        },
      });

      return res.json({
        success: true,
        message: 'Return record deleted successfully.',
      });
    } catch (err: any) {
      logger.error('Error deleting return:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}
