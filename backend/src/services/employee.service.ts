import prisma from '../config/prisma';
import { EmployeeSchema } from '../validators/schemas';
import { Prisma } from '@prisma/client';

export class EmployeeService {
  private static async generateEmployeeCode(): Promise<string> {
    const lastEmp = await prisma.employee.findFirst({
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

  static async getEmployees(query: {
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    locationId?: string;
    status?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {};

    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.locationId) where.locationId = query.locationId;
    if (query.status) where.status = query.status as any;

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { employeeCode: { contains: s, mode: 'insensitive' } },
        { fullName: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        { designation: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: true,
          location: true,
          heldAssets: {
            select: { id: true, assetCode: true, assetType: true, manufacturer: true, model: true, status: true },
          },
        },
      }),
    ]);

    return {
      employees,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  static async getEmployeeById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        location: true,
        user: { select: { id: true, username: true, isActive: true, role: true } },
        heldAssets: {
          include: { specifications: true },
        },
        assignments: {
          orderBy: { createdAt: 'desc' },
          include: { asset: true, assignedBy: true },
        },
        returns: {
          orderBy: { createdAt: 'desc' },
          include: { asset: true, receivedBy: true },
        },
      },
    });

    if (!employee) throw new Error('Employee not found');
    return employee;
  }

  static async createEmployee(data: unknown, userId: string) {
    const validated = EmployeeSchema.parse(data);
    const employeeCode = await EmployeeService.generateEmployeeCode();

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          ...validated,
          employeeCode,
        },
        include: { department: true, location: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EMPLOYEE_CREATE',
          entityType: 'Employee',
          entityId: emp.id,
          newValue: JSON.stringify({ employeeCode, fullName: emp.fullName }),
        },
      });

      return emp;
    });

    return employee;
  }

  static async updateEmployee(id: string, data: unknown, userId: string) {
    const validated = EmployeeSchema.partial().parse(data);

    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.update({
        where: { id },
        data: validated,
        include: { department: true, location: true },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'EMPLOYEE_UPDATE',
          entityType: 'Employee',
          entityId: emp.id,
          newValue: JSON.stringify(validated),
        },
      });

      return emp;
    });

    return employee;
  }
}
