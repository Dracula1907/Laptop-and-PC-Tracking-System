import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../types';
import { AssetService } from '../services/asset.service';
import { logger } from '../utils/logger';
import { WorkflowStatus } from '@prisma/client';

export class TransferController {
  /**
   * Get all asset transfer records
   */
  public static async getTransfers(req: AuthenticatedRequest, res: Response) {
    try {
      const transfers = await prisma.assetTransfer.findMany({
        orderBy: { transferDate: 'desc' },
        include: {
          asset: {
            include: {
              department: true,
              locationRel: true,
            },
          },
          previousHolder: {
            include: { department: true, location: true },
          },
          newHolder: {
            include: { department: true, location: true },
          },
          previousDepartment: true,
          newDepartment: true,
          previousLocation: true,
          newLocation: true,
          requestedBy: {
            select: { id: true, username: true },
          },
          approvedBy: {
            select: { id: true, username: true },
          },
        },
      });

      const formatted = transfers.map((t) => ({
        id: t.id,
        assetId: t.assetId,
        assetCode: t.asset.companyAssetId || t.asset.assetCode,
        assetName: t.asset.assetName || t.asset.model,
        serialNumber: t.asset.serialNumber || '—',
        assetType: t.asset.sourceAssetType || t.asset.assetType,
        previousHolderId: t.previousHolderId,
        previousHolderName: t.previousHolder?.fullName || 'None',
        previousHolderCode: t.previousHolder?.employeeCode || '—',
        newHolderId: t.newHolderId,
        newHolderName: t.newHolder?.fullName || '—',
        newHolderCode: t.newHolder?.employeeCode || '—',
        previousDepartmentName: t.previousDepartment?.name || '—',
        newDepartmentName: t.newDepartment?.name || t.newHolder?.department?.name || '—',
        previousLocationName: t.previousLocation?.name || '—',
        newLocationName: t.newLocation?.name || t.newHolder?.location?.name || '—',
        transferDate: t.transferDate,
        reason: t.reason || 'Routine organizational transfer',
        remarks: t.remarks || '—',
        status: t.status,
        requestedByName: t.requestedBy?.username || 'admin',
        approvedByName: t.approvedBy?.username || '—',
      }));

      return res.json({
        success: true,
        data: formatted,
        total: formatted.length,
      });
    } catch (err: any) {
      logger.error('Error fetching transfers:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get options for creating a transfer (allocated assets, employees, departments, locations)
   */
  public static async getOptions(req: AuthenticatedRequest, res: Response) {
    try {
      const [assets, employees, departments, locations] = await Promise.all([
        prisma.asset.findMany({
          select: {
            id: true,
            companyAssetId: true,
            assetCode: true,
            assetName: true,
            model: true,
            serialNumber: true,
            currentHolderId: true,
            departmentId: true,
            locationId: true,
            location: true,
            currentHolder: {
              select: { id: true, fullName: true, employeeCode: true },
            },
            department: {
              select: { id: true, name: true },
            },
            locationRel: {
              select: { id: true, name: true },
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
            departmentId: true,
            locationId: true,
            department: { select: { id: true, name: true } },
            location: { select: { id: true, name: true } },
          },
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
      ]);

      return res.json({
        success: true,
        data: {
          assets,
          employees,
          departments,
          locations,
        },
      });
    } catch (err: any) {
      logger.error('Error fetching transfer options:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Create a new asset transfer
   */
  public static async createTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const { assetId, newHolderId, newDepartmentId, newLocationId, reason, remarks } = req.body;

      if (!assetId) {
        return res.status(400).json({ success: false, message: 'Asset ID is required.' });
      }
      if (!newHolderId) {
        return res.status(400).json({ success: false, message: 'Target employee (new holder) is required.' });
      }

      const userId = req.user?.userId || (await prisma.user.findFirst({ where: { username: 'admin' } }))?.id || '';

      const transfer = await AssetService.transferAsset(
        assetId,
        {
          newHolderId,
          newDepartmentId,
          newLocationId,
          reason: reason || 'Departmental handover',
          remarks: remarks || 'Processed via Transfers module',
        },
        userId
      );

      return res.status(201).json({
        success: true,
        message: 'Asset transfer processed successfully.',
        data: transfer,
      });
    } catch (err: any) {
      logger.error('Error creating transfer:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Update an existing transfer
   */
  public static async updateTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const { reason, remarks, status } = req.body;
      const id = req.params.id;

      const existing = await prisma.assetTransfer.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Transfer record not found.' });
      }

      const updated = await prisma.assetTransfer.update({
        where: { id },
        data: {
          reason: reason !== undefined ? reason : existing.reason,
          remarks: remarks !== undefined ? remarks : existing.remarks,
          status: status || existing.status,
        },
      });

      const userId = req.user?.userId || '';
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'TRANSFER_UPDATE',
          entityType: 'AssetTransfer',
          entityId: id,
          oldValue: JSON.stringify({ reason: existing.reason, status: existing.status }),
          newValue: JSON.stringify({ reason: updated.reason, status: updated.status }),
        },
      });

      return res.json({
        success: true,
        message: 'Transfer record updated successfully.',
        data: updated,
      });
    } catch (err: any) {
      logger.error('Error updating transfer:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Delete a transfer record
   */
  public static async deleteTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const id = req.params.id;
      const existing = await prisma.assetTransfer.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Transfer record not found.' });
      }

      await prisma.assetTransfer.delete({ where: { id } });

      const userId = req.user?.userId || '';
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'TRANSFER_DELETE',
          entityType: 'AssetTransfer',
          entityId: id,
          oldValue: JSON.stringify({ assetId: existing.assetId, transferDate: existing.transferDate }),
        },
      });

      return res.json({
        success: true,
        message: 'Transfer record deleted successfully.',
      });
    } catch (err: any) {
      logger.error('Error deleting transfer:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}
