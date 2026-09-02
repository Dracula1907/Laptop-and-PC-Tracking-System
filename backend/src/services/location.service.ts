import prisma from '../config/prisma';
import { LocationSchema } from '../validators/schemas';
import { Prisma, AssetStatus, AllocationStatus } from '@prisma/client';

export interface LocationQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  isActive?: string | boolean;
  departmentId?: string;
  city?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class LocationService {
  static async getLocationCounts() {
    const [total, active, inactive] = await Promise.all([
      prisma.location.count(),
      prisma.location.count({ where: { isActive: true } }),
      prisma.location.count({ where: { isActive: false } }),
    ]);

    return { total, active, inactive };
  }

  static async getLocations(query: LocationQuery = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.LocationWhereInput = {};

    if (query.isActive !== undefined && query.isActive !== 'ALL') {
      where.isActive = query.isActive === 'true' || query.isActive === true;
    }

    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.city) where.city = { contains: query.city, mode: 'insensitive' };

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { address: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
        { building: { contains: s, mode: 'insensitive' } },
        { floor: { contains: s, mode: 'insensitive' } },
        { roomZone: { contains: s, mode: 'insensitive' } },
        { city: { contains: s, mode: 'insensitive' } },
        { department: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.LocationOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'name';
    const sortDirection = query.sortOrder === 'desc' ? 'desc' : 'asc';

    if (sortField === 'code') orderBy.code = sortDirection;
    else if (sortField === 'createdAt') orderBy.createdAt = sortDirection;
    else if (sortField === 'city') orderBy.city = sortDirection;
    else orderBy.name = sortDirection;

    const [total, locations] = await Promise.all([
      prisma.location.count({ where }),
      prisma.location.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          department: {
            select: { id: true, name: true, code: true },
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
      locations,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getLocationById(id: string) {
    const loc = await prisma.location.findUnique({
      where: { id },
      include: {
        department: {
          select: { id: true, name: true, code: true },
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
            department: { select: { id: true, name: true } },
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
            department: { select: { id: true, name: true } },
            currentHolder: {
              select: { id: true, employeeCode: true, fullName: true },
            },
          },
        },
        newTransfers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            asset: { select: { id: true, companyAssetId: true, model: true } },
            previousLocation: { select: { id: true, name: true } },
            previousHolder: { select: { id: true, fullName: true } },
            newHolder: { select: { id: true, fullName: true } },
          },
        },
        previousTransfers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            asset: { select: { id: true, companyAssetId: true, model: true } },
            newLocation: { select: { id: true, name: true } },
            previousHolder: { select: { id: true, fullName: true } },
            newHolder: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    if (!loc) throw new Error('Location not found');

    const employeeCount = loc.employees.length;
    const totalAssetCount = loc.assets.length;
    const allocatedAssetCount = loc.assets.filter(
      (a) => a.allocationStatus === AllocationStatus.ALLOCATED || a.status === AssetStatus.ASSIGNED || a.status === AssetStatus.IN_USE
    ).length;
    const availableAssetCount = loc.assets.filter((a) => a.status === AssetStatus.AVAILABLE).length;
    const maintenanceAssetCount = loc.assets.filter((a) => a.status === AssetStatus.UNDER_REPAIR).length;

    return {
      ...loc,
      metrics: {
        employeeCount,
        totalAssetCount,
        allocatedAssetCount,
        availableAssetCount,
        maintenanceAssetCount,
      },
      recentTransfersIn: loc.newTransfers,
      recentTransfersOut: loc.previousTransfers,
    };
  }

  static async createLocation(data: unknown, userId: string) {
    const validated = LocationSchema.parse(data);

    const existingCode = await prisma.location.findUnique({ where: { code: validated.code } });
    if (existingCode) throw new Error(`Location code "${validated.code}" is already in use.`);

    if (validated.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: validated.departmentId } });
      if (!dept) throw new Error('Selected department does not exist.');
    }

    const loc = await prisma.$transaction(async (tx) => {
      const created = await tx.location.create({
        data: {
          name: validated.name,
          code: validated.code,
          address: validated.address || null,
          description: validated.description || null,
          building: validated.building || null,
          floor: validated.floor || null,
          roomZone: validated.roomZone || null,
          city: validated.city || null,
          departmentId: validated.departmentId || null,
          isActive: validated.isActive !== undefined ? validated.isActive : true,
        },
        include: { department: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'LOCATION_CREATE',
          entityType: 'Location',
          entityId: created.id,
          newValue: JSON.stringify({ name: created.name, code: created.code }),
        },
      });

      return created;
    });

    return loc;
  }

  static async updateLocation(id: string, data: unknown, userId: string) {
    const validated = LocationSchema.partial().parse(data);

    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) throw new Error('Location not found');

    if (validated.code && validated.code !== existing.code) {
      const codeClash = await prisma.location.findUnique({ where: { code: validated.code } });
      if (codeClash) throw new Error(`Location code "${validated.code}" is already in use.`);
    }

    if (validated.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: validated.departmentId } });
      if (!dept) throw new Error('Selected department does not exist.');
    }

    const loc = await prisma.$transaction(async (tx) => {
      const updated = await tx.location.update({
        where: { id },
        data: validated,
        include: { department: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'LOCATION_UPDATE',
          entityType: 'Location',
          entityId: updated.id,
          oldValue: JSON.stringify({ name: existing.name, code: existing.code, isActive: existing.isActive }),
          newValue: JSON.stringify(validated),
        },
      });

      return updated;
    });

    return loc;
  }

  static async deactivateLocation(id: string, userId: string) {
    const existing = await prisma.location.findUnique({ where: { id } });
    if (!existing) throw new Error('Location not found');

    const updated = await prisma.$transaction(async (tx) => {
      const loc = await tx.location.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'LOCATION_DEACTIVATED',
          entityType: 'Location',
          entityId: id,
          oldValue: JSON.stringify({ isActive: existing.isActive }),
          newValue: JSON.stringify({ isActive: false }),
        },
      });

      return loc;
    });

    return updated;
  }

  static async deleteLocation(id: string, userId: string) {
    const existing = await prisma.location.findUnique({
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

    if (!existing) throw new Error('Location not found');

    const hasDependencies =
      existing._count.employees > 0 ||
      existing._count.assets > 0 ||
      existing._count.assignments > 0 ||
      existing._count.previousTransfers > 0 ||
      existing._count.newTransfers > 0 ||
      existing._count.returns > 0;

    if (hasDependencies) {
      throw new Error(
        'Cannot delete location with linked employees, assets, or historical movements. Deactivate the location instead.'
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.location.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'LOCATION_DEACTIVATE',
          entityType: 'Location',
          entityId: id,
          oldValue: JSON.stringify({ code: existing.code, name: existing.name }),
        },
      });
    });

    return { success: true, message: 'Location deleted successfully.' };
  }
}
