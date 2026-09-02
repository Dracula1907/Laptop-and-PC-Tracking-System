import prisma from '../config/prisma';
import { EmployeeSchema } from '../validators/schemas';
import { Prisma, EmployeeStatus, WorkflowStatus } from '@prisma/client';

export interface EmployeeQuery {
  page?: number | string;
  limit?: number | string;
  search?: string;
  departmentId?: string;
  locationId?: string;
  status?: string;
  designation?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class EmployeeService {
  private static async generateEmployeeCode(): Promise<string> {
    const lastEmp = await prisma.employee.findFirst({
      where: { employeeCode: { startsWith: 'EMP-' } },
      orderBy: { createdAt: 'desc' },
      select: { employeeCode: true },
    });

    if (!lastEmp || !lastEmp.employeeCode.startsWith('EMP-')) {
      return 'EMP-001';
    }

    const num = parseInt(lastEmp.employeeCode.replace('EMP-', ''), 10);
    const nextNum = isNaN(num) ? 1 : num + 1;
    return `EMP-${nextNum.toString().padStart(3, '0')}`;
  }

  public static calculateDataQuality(emp: {
    employeeCode?: string | null;
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    designation?: string | null;
    departmentId?: string | null;
    locationId?: string | null;
    status?: string | null;
  }): 'CLEAN' | 'WARNING' | 'INCOMPLETE' {
    if (!emp.employeeCode || !emp.fullName || !emp.departmentId || !emp.locationId || !emp.status) {
      return 'INCOMPLETE';
    }
    if (!emp.email || !emp.phone || !emp.designation) {
      return 'WARNING';
    }
    return 'CLEAN';
  }

  static async getEmployeeCounts() {
    const [total, active, onLeave, inactive, exited] = await Promise.all([
      prisma.employee.count(),
      prisma.employee.count({ where: { status: EmployeeStatus.ACTIVE } }),
      prisma.employee.count({ where: { status: EmployeeStatus.ON_LEAVE } }),
      prisma.employee.count({ where: { status: EmployeeStatus.INACTIVE } }),
      prisma.employee.count({ where: { status: EmployeeStatus.EXITED } }),
    ]);

    return {
      total,
      active,
      onLeave,
      inactive,
      exited,
    };
  }

  static async getEmployees(query: EmployeeQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {};

    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.status) where.status = query.status as EmployeeStatus;
    if (query.designation) where.designation = { contains: query.designation, mode: 'insensitive' };

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { employeeCode: { contains: s, mode: 'insensitive' } },
        { fullName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { phone: { contains: s, mode: 'insensitive' } },
        { designation: { contains: s, mode: 'insensitive' } },
        { department: { name: { contains: s, mode: 'insensitive' } } },
        { location: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.EmployeeOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 'asc' : 'desc';

    if (sortField === 'fullName') orderBy.fullName = sortDirection;
    else if (sortField === 'employeeCode') orderBy.employeeCode = sortDirection;
    else if (sortField === 'joiningDate') orderBy.joiningDate = sortDirection;
    else if (sortField === 'status') orderBy.status = sortDirection;
    else orderBy.createdAt = sortDirection;

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          department: true,
          location: true,
          manager: {
            select: { id: true, employeeCode: true, fullName: true, designation: true },
          },
          _count: {
            select: {
              heldAssets: true,
              assignments: true,
            },
          },
          heldAssets: {
            select: {
              id: true,
              assetCode: true,
              companyAssetId: true,
              assetName: true,
              assetType: true,
              manufacturer: true,
              model: true,
              status: true,
              condition: true,
            },
          },
        },
      }),
    ]);

    const enrichedEmployees = employees.map((emp) => ({
      ...emp,
      dataQuality: EmployeeService.calculateDataQuality(emp),
    }));

    return {
      employees: enrichedEmployees,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getEmployeeById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        location: true,
        manager: {
          select: { id: true, employeeCode: true, fullName: true, designation: true, email: true },
        },
        subordinates: {
          select: { id: true, employeeCode: true, fullName: true, designation: true, status: true },
        },
        user: { select: { id: true, username: true, isActive: true, role: true } },
        heldAssets: {
          include: {
            specifications: true,
            department: true,
            locationRel: true,
          },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: {
            asset: true,
            assignedBy: { select: { id: true, username: true } },
            department: true,
            location: true,
          },
        },
        returns: {
          orderBy: { createdAt: 'desc' },
          include: {
            asset: true,
            receivedBy: { select: { id: true, username: true } },
          },
        },
        previousTransfers: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            asset: true,
            newHolder: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
        newTransfers: {
          orderBy: { createdAt: 'desc' },
          take: 15,
          include: {
            asset: true,
            previousHolder: { select: { id: true, employeeCode: true, fullName: true } },
          },
        },
      },
    });

    if (!employee) throw new Error('Employee not found');

    // Calculate Asset Accountability metrics
    const currentlyAssignedAssetsCount = employee.heldAssets.length;
    const activeAssignments = employee.assignments.filter((a) => a.status === WorkflowStatus.ACTIVE);
    const now = new Date();
    const overdueReturnsCount = activeAssignments.filter(
      (a) => a.expectedReturnDate && new Date(a.expectedReturnDate) < now
    ).length;

    // Unique historical assets
    const historicalAssetIds = new Set<string>();
    employee.heldAssets.forEach((a) => historicalAssetIds.add(a.id));
    employee.assignments.forEach((a) => historicalAssetIds.add(a.assetId));
    employee.returns.forEach((r) => historicalAssetIds.add(r.assetId));
    employee.previousTransfers.forEach((t) => historicalAssetIds.add(t.assetId));
    employee.newTransfers.forEach((t) => historicalAssetIds.add(t.assetId));

    const totalHistoricalAssets = historicalAssetIds.size;
    const transferCount = employee.previousTransfers.length + employee.newTransfers.length;

    return {
      ...employee,
      dataQuality: EmployeeService.calculateDataQuality(employee),
      accountability: {
        currentlyAssignedAssetsCount,
        totalHistoricalAssets,
        activeAssignmentsCount: activeAssignments.length,
        overdueReturnsCount,
        transferCount,
      },
    };
  }

  static async createEmployee(data: unknown, userId: string) {
    const validated = EmployeeSchema.parse(data);

    // Verify department exists and is active
    const dept = await prisma.department.findUnique({ where: { id: validated.departmentId } });
    if (!dept) throw new Error('Selected department does not exist.');
    if (!dept.isActive) throw new Error('Cannot assign employee to an inactive department.');

    // Verify location exists and is active
    const loc = await prisma.location.findUnique({ where: { id: validated.locationId } });
    if (!loc) throw new Error('Selected location does not exist.');
    if (!loc.isActive) throw new Error('Cannot assign employee to an inactive location.');

    // Verify unique email
    const existingEmail = await prisma.employee.findUnique({ where: { email: validated.email } });
    if (existingEmail) throw new Error(`An employee with email "${validated.email}" already exists.`);

    // Check or generate employeeCode
    let employeeCode = validated.employeeCode?.trim();
    if (employeeCode) {
      const existingCode = await prisma.employee.findUnique({ where: { employeeCode } });
      if (existingCode) throw new Error(`Employee ID "${employeeCode}" is already in use.`);
    } else {
      employeeCode = await EmployeeService.generateEmployeeCode();
    }

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          employeeCode,
          fullName: validated.fullName,
          email: validated.email,
          phone: validated.phone || null,
          designation: validated.designation || null,
          departmentId: validated.departmentId,
          locationId: validated.locationId,
          joiningDate: validated.joiningDate || new Date(),
          exitDate: validated.exitDate || null,
          status: validated.status,
          managerId: validated.managerId || null,
          remarks: validated.remarks || null,
        },
        include: { department: true, location: true, manager: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EMPLOYEE_CREATE',
          entityType: 'Employee',
          entityId: emp.id,
          newValue: JSON.stringify({
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
            department: dept.name,
            location: loc.name,
            status: emp.status,
          }),
        },
      });

      return emp;
    });

    return employee;
  }

  static async updateEmployee(id: string, data: unknown, userId: string) {
    const validated = EmployeeSchema.partial().parse(data);

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new Error('Employee not found');

    if (validated.departmentId && validated.departmentId !== existing.departmentId) {
      const dept = await prisma.department.findUnique({ where: { id: validated.departmentId } });
      if (!dept) throw new Error('Selected department does not exist.');
      if (!dept.isActive) throw new Error('Cannot assign employee to an inactive department.');
    }

    if (validated.locationId && validated.locationId !== existing.locationId) {
      const loc = await prisma.location.findUnique({ where: { id: validated.locationId } });
      if (!loc) throw new Error('Selected location does not exist.');
      if (!loc.isActive) throw new Error('Cannot assign employee to an inactive location.');
    }

    if (validated.email && validated.email !== existing.email) {
      const emailClash = await prisma.employee.findUnique({ where: { email: validated.email } });
      if (emailClash) throw new Error(`An employee with email "${validated.email}" already exists.`);
    }

    if (validated.employeeCode && validated.employeeCode !== existing.employeeCode) {
      const codeClash = await prisma.employee.findUnique({ where: { employeeCode: validated.employeeCode } });
      if (codeClash) throw new Error(`Employee ID "${validated.employeeCode}" is already in use.`);
    }

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: validated,
        include: { department: true, location: true, manager: true },
      });

      const action =
        validated.status && validated.status !== existing.status
          ? 'EMPLOYEE_STATUS_CHANGED'
          : 'EMPLOYEE_UPDATE';

      await tx.auditLog.create({
        data: {
          userId,
          action,
          entityType: 'Employee',
          entityId: emp.id,
          oldValue: JSON.stringify({
            fullName: existing.fullName,
            status: existing.status,
            departmentId: existing.departmentId,
            locationId: existing.locationId,
          }),
          newValue: JSON.stringify(validated),
        },
      });

      return emp;
    });

    return employee;
  }

  static async deactivateEmployee(
    id: string,
    data: { status?: EmployeeStatus; exitDate?: Date | string; remarks?: string },
    userId: string
  ) {
    const existing = await prisma.employee.findUnique({
      where: { id },
      include: {
        heldAssets: {
          select: {
            id: true,
            companyAssetId: true,
            assetCode: true,
            assetName: true,
            assetType: true,
            status: true,
            condition: true,
            location: true,
          },
        },
      },
    });

    if (!existing) throw new Error('Employee not found');

    const newStatus = data.status || EmployeeStatus.EXITED;
    const exitDate = data.exitDate ? new Date(data.exitDate) : new Date();

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: {
          status: newStatus,
          exitDate,
          remarks: data.remarks ? `${existing.remarks || ''}\n${data.remarks}`.trim() : existing.remarks,
        },
        include: { department: true, location: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EMPLOYEE_DEACTIVATED',
          entityType: 'Employee',
          entityId: emp.id,
          oldValue: JSON.stringify({ status: existing.status }),
          newValue: JSON.stringify({ status: newStatus, exitDate, remarks: data.remarks }),
        },
      });

      return emp;
    });

    return {
      employee,
      heldAssets: existing.heldAssets,
      heldAssetsCount: existing.heldAssets.length,
      clearanceRequired: existing.heldAssets.length > 0,
    };
  }

  static async deleteEmployee(id: string, userId: string) {
    const existing = await prisma.employee.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            heldAssets: true,
            assignments: true,
            previousTransfers: true,
            newTransfers: true,
            returns: true,
          },
        },
      },
    });

    if (!existing) throw new Error('Employee not found');

    const hasDependencies =
      existing._count.heldAssets > 0 ||
      existing._count.assignments > 0 ||
      existing._count.previousTransfers > 0 ||
      existing._count.newTransfers > 0 ||
      existing._count.returns > 0;

    if (hasDependencies) {
      throw new Error(
        'Cannot delete employee with historical asset assignments or transfers. Please deactivate the employee instead.'
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId,
          action: 'EMPLOYEE_DEACTIVATE',
          entityType: 'Employee',
          entityId: id,
          oldValue: JSON.stringify({ employeeCode: existing.employeeCode, fullName: existing.fullName }),
        },
      });
    });

    return { success: true, message: 'Employee deleted successfully.' };
  }
}
