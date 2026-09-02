import prisma from '../config/prisma';
import { DepartmentSchema } from '../validators/schemas';
import { Prisma, AssetStatus, AllocationStatus, EmployeeStatus } from '@prisma/client';

export interface DepartmentQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  isActive?: string | boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class DepartmentService {
  static async getDepartmentCounts() {
    const [total, active, inactive] = await Promise.all([
      prisma.department.count(),
      prisma.department.count({ where: { isActive: true } }),
      prisma.department.count({ where: { isActive: false } }),
    ]);

    return { total, active, inactive };
  }

  static async getDepartments(query: DepartmentQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.DepartmentWhereInput = {};

    if (query.isActive !== undefined && query.isActive !== 'ALL') {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { manager: { fullName: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.DepartmentOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'name';
    const sortDirection = query.sortOrder === 'desc' ? 'desc' : 'asc';

    if (sortField === 'code') orderBy.code = sortDirection;
    else if (sortField === 'createdAt') orderBy.createdAt = sortDirection;
    else orderBy.name = sortDirection;

    const [total, departments] = await Promise.all([
      prisma.department.count({ where }),
      prisma.department.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          manager: {
            select: { id: true, employeeCode: true, fullName: true, designation: true, email: true },
          },
          location: {
            select: { id: true, code: true, name: true, city: true },
          },
          _count: {
            select: {
              employees: true,
              assets: true,
              assignments: true,
            },
          },
        },
      }),
    ]);

    return {
      departments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getDepartmentById(id: string) {
    const dept = await prisma.department.findUnique({
      where: { id },
      include: {
        manager: {
          select: { id: true, employeeCode: true, fullName: true, designation: true, email: true, phone: true },
        },
        location: {
          select: { id: true, code: true, name: true, building: true, floor: true, city: true },
        },
        employees: {
          orderBy: { fullName: 'asc' },
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            email: true,
            phone: true,
            designation: true,
            status: true,
            joiningDate: true,
            _count: { select: { heldAssets: true } },
          },
        },
        assets: {
          orderBy: { companyAssetId: 'asc' },
          select: {
            id: true,
            companyAssetId: true,
            assetCode: true,
            assetName: true,
            assetType: true,
            manufacturer: true,
            model: true,
            status: true,
            condition: true,
            allocationStatus: true,
            currentHolder: {
              select: { id: true, employeeCode: true, fullName: true },
            },
          },
        },
        previousTransfers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            asset: { select: { id: true, companyAssetId: true, model: true } },
            newDepartment: { select: { id: true, name: true } },
          },
        },
        newTransfers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            asset: { select: { id: true, companyAssetId: true, model: true } },
            previousDepartment: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!dept) throw new Error('Department not found');

    const employeeCount = dept.employees.length;
    const activeEmployeeCount = dept.employees.filter((e) => e.status === EmployeeStatus.ACTIVE).length;
    const totalAssetCount = dept.assets.length;
    const allocatedAssetCount = dept.assets.filter(
      (a) => a.allocationStatus === AllocationStatus.ALLOCATED || a.status === AssetStatus.ASSIGNED || a.status === AssetStatus.IN_USE
    ).length;
    const availableAssetCount = dept.assets.filter((a) => a.status === AssetStatus.AVAILABLE).length;
    const maintenanceAssetCount = dept.assets.filter((a) => a.status === AssetStatus.UNDER_REPAIR).length;

    return {
      ...dept,
      metrics: {
        employeeCount,
        activeEmployeeCount,
        totalAssetCount,
        allocatedAssetCount,
        availableAssetCount,
        maintenanceAssetCount,
      },
    };
  }

  static async createDepartment(data: unknown, userId: string) {
    const validated = DepartmentSchema.parse(data);

    const existingCode = await prisma.department.findUnique({ where: { code: validated.code } });
    if (existingCode) throw new Error(`Department code "${validated.code}" is already in use.`);

    if (validated.managerId) {
      const manager = await prisma.employee.findUnique({ where: { id: validated.managerId } });
      if (!manager) throw new Error('Selected department manager does not exist.');
    }

    if (validated.locationId) {
      const location = await prisma.location.findUnique({ where: { id: validated.locationId } });
      if (!location) throw new Error('Selected location does not exist.');
    }

    const dept = await prisma.$transaction(async (tx) => {
      const created = await tx.department.create({
        data: {
          name: validated.name,
          code: validated.code,
          description: validated.description || null,
          managerId: validated.managerId || null,
          locationId: validated.locationId || null,
          isActive: validated.isActive !== undefined ? validated.isActive : true,
        },
        include: { manager: true, location: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'DEPARTMENT_CREATE',
          entityType: 'Department',
          entityId: created.id,
          newValue: JSON.stringify({ name: created.name, code: created.code }),
        },
      });

      return created;
    });

    return dept;
  }

  static async updateDepartment(id: string, data: unknown, userId: string) {
    const validated = DepartmentSchema.partial().parse(data);

    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw new Error('Department not found');

    if (validated.code && validated.code !== existing.code) {
      const codeClash = await prisma.department.findUnique({ where: { code: validated.code } });
      if (codeClash) throw new Error(`Department code "${validated.code}" is already in use.`);
    }

    if (validated.managerId) {
      const manager = await prisma.employee.findUnique({ where: { id: validated.managerId } });
      if (!manager) throw new Error('Selected department manager does not exist.');
    }

    if (validated.locationId) {
      const location = await prisma.location.findUnique({ where: { id: validated.locationId } });
      if (!location) throw new Error('Selected location does not exist.');
    }

    const dept = await prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({
        where: { id },
        data: validated,
        include: { manager: true, location: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'DEPARTMENT_UPDATE',
          entityType: 'Department',
          entityId: updated.id,
          oldValue: JSON.stringify({ name: existing.name, code: existing.code, isActive: existing.isActive }),
          newValue: JSON.stringify(validated),
        },
      });

      return updated;
    });

    return dept;
  }

  static async deactivateDepartment(id: string, userId: string) {
    const existing = await prisma.department.findUnique({ where: { id } });
    if (!existing) throw new Error('Department not found');

    const updated = await prisma.$transaction(async (tx) => {
      const dept = await tx.department.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'DEPARTMENT_DEACTIVATED',
          entityType: 'Department',
          entityId: id,
          oldValue: JSON.stringify({ isActive: existing.isActive }),
          newValue: JSON.stringify({ isActive: false }),
        },
      });

      return dept;
    });

    return updated;
  }

  static async deleteDepartment(id: string, userId: string) {
    const existing = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            assets: true,
            assignments: true,
            previousTransfers: true,
            newTransfers: true,
            returns: true,
          },
        },
      },
    });

    if (!existing) throw new Error('Department not found');

    const hasDependencies =
      existing._count.employees > 0 ||
      existing._count.assets > 0 ||
      existing._count.assignments > 0 ||
      existing._count.previousTransfers > 0 ||
      existing._count.newTransfers > 0 ||
      existing._count.returns > 0;

    if (hasDependencies) {
      throw new Error(
        'Cannot delete department with linked employees, assets, or historical transactions. Deactivate the department instead.'
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.department.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DEPARTMENT_DEACTIVATE',
          entityType: 'Department',
          entityId: id,
          oldValue: JSON.stringify({ code: existing.code, name: existing.name }),
        },
      });
    });

    return { success: true, message: 'Department deleted successfully.' };
  }
}
