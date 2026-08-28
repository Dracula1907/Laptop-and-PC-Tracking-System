import { Response } from 'express';
import prisma from '../config/prisma';
import { AuthenticatedRequest } from '../types';
import { AssetService } from '../services/asset.service';
import { logger } from '../utils/logger';
import { WorkflowStatus, AssetStatus, AllocationStatus } from '@prisma/client';

export class AssignmentController {
  /**
   * Get all assignments with full asset and employee details
   */
  public static async getAssignments(req: AuthenticatedRequest, res: Response) {
    try {
      // 1. Fetch all formal assignment records
      const assignments = await prisma.assetAssignment.findMany({
        orderBy: { assignedAt: 'desc' },
        include: {
          asset: {
            include: {
              department: true,
              locationRel: true,
            },
          },
          employee: {
            include: {
              department: true,
              location: true,
            },
          },
          assignedBy: {
            select: { id: true, username: true },
          },
        },
      });

      // 2. Map to unified response items
      const assignmentAssetIds = new Set(assignments.map((a) => a.assetId));

      const formattedList = assignments.map((a) => ({
        id: a.id,
        assetId: a.assetId,
        assetCode: a.asset.companyAssetId || a.asset.assetCode,
        assetName: a.asset.assetName,
        model: a.asset.model || a.asset.assetName,
        manufacturer: a.asset.manufacturer,
        assetType: a.asset.sourceAssetType || a.asset.assetType,
        serialNumber: a.asset.serialNumber || '—',
        employeeId: a.employeeId,
        employeeName: a.employee?.fullName || a.asset.employeeNameSource || 'Unassigned',
        employeeCode: a.employee?.employeeCode || '—',
        employeeEmail: a.employee?.email || '—',
        departmentName: a.employee?.department?.name || a.asset.department?.name || a.asset.location || 'General',
        locationName: a.employee?.location?.name || a.asset.locationRel?.name || a.asset.location || 'HQ',
        assignedAt: a.assignedAt,
        expectedReturnDate: a.expectedReturnDate,
        conditionAtAssignment: a.conditionAtAssignment,
        remarks: a.remarks || '—',
        status: a.status,
      }));

      // 3. Check for any allocated assets without explicit assignment record and include them
      const allocatedWithoutAsg = await prisma.asset.findMany({
        where: {
          id: { notIn: Array.from(assignmentAssetIds) },
          allocationStatus: AllocationStatus.ALLOCATED,
        },
        include: {
          currentHolder: {
            include: { department: true, location: true },
          },
          department: true,
          locationRel: true,
        },
      });

      allocatedWithoutAsg.forEach((asset) => {
        formattedList.push({
          id: `asg-${asset.id}`,
          assetId: asset.id,
          assetCode: asset.companyAssetId || asset.assetCode,
          assetName: asset.assetName,
          model: asset.model || asset.assetName,
          manufacturer: asset.manufacturer,
          assetType: asset.sourceAssetType || asset.assetType,
          serialNumber: asset.serialNumber || '—',
          employeeId: asset.currentHolderId || '',
          employeeName: asset.currentHolder?.fullName || asset.employeeNameSource || 'Allocated Holder',
          employeeCode: asset.currentHolder?.employeeCode || '—',
          employeeEmail: asset.currentHolder?.email || '—',
          departmentName: asset.currentHolder?.department?.name || asset.department?.name || asset.location || 'General',
          locationName: asset.currentHolder?.location?.name || asset.locationRel?.name || asset.location || 'HQ',
          assignedAt: asset.dateOfAllocation || asset.createdAt,
          expectedReturnDate: null,
          conditionAtAssignment: asset.condition,
          remarks: asset.assetDescription || 'Company inventory allocation',
          status: WorkflowStatus.ACTIVE,
        });
      });

      return res.json({
        success: true,
        data: formattedList,
        total: formattedList.length,
      });
    } catch (err: any) {
      logger.error('Error fetching assignments:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Create a new asset assignment
   */
  public static async createAssignment(req: AuthenticatedRequest, res: Response) {
    try {
      const { assetId, employeeId, expectedReturnDate, conditionAtAssignment, remarks } = req.body;

      if (!assetId) {
        return res.status(400).json({ success: false, message: 'Asset ID is required.' });
      }
      if (!employeeId) {
        return res.status(400).json({ success: false, message: 'Employee ID is required.' });
      }

      const userId = req.user?.userId || (await prisma.user.findFirst({ where: { username: 'admin' } }))?.id || '';

      const assignment = await AssetService.assignAsset(
        assetId,
        {
          employeeId,
          expectedReturnDate,
          conditionAtAssignment: conditionAtAssignment || 'GOOD',
          remarks: remarks || 'Manual assignment via ITAM portal',
        },
        userId
      );

      return res.status(201).json({
        success: true,
        message: 'Asset assigned successfully.',
        data: assignment,
      });
    } catch (err: any) {
      logger.error('Error creating assignment:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  /**
   * Get available assets and active employees for assignment dropdowns
   */
  public static async getOptions(req: AuthenticatedRequest, res: Response) {
    try {
      // Unallocated assets or available assets
      const availableAssets = await prisma.asset.findMany({
        where: {
          OR: [
            { currentHolderId: null },
            { allocationStatus: AllocationStatus.NOT_ALLOCATED },
            { status: AssetStatus.AVAILABLE },
          ],
          NOT: {
            status: { in: [AssetStatus.RETIRED, AssetStatus.SCRAPPED, AssetStatus.UNDER_REPAIR] },
          },
        },
        select: {
          id: true,
          companyAssetId: true,
          assetCode: true,
          assetName: true,
          serialNumber: true,
          location: true,
          sourceAssetType: true,
          assetType: true,
          status: true,
          allocationStatus: true,
        },
        orderBy: { companyAssetId: 'asc' },
      });

      // Active employees
      const employees = await prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          email: true,
          designation: true,
          department: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { fullName: 'asc' },
      });

      return res.json({
        success: true,
        data: {
          availableAssets,
          employees,
        },
      });
    } catch (err: any) {
      logger.error('Error fetching assignment options:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
