import prisma from '../config/prisma';
import { DepartmentSchema } from '../validators/schemas';

export class DepartmentService {
  static async getDepartments() {
    return prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { employees: true, assets: true },
        },
      },
    });
  }

  static async getDepartmentById(id: string) {
    const dept = await prisma.department.findUnique({
      where: { id },
      include: {
        employees: true,
        assets: {
          include: { currentHolder: true },
        },
      },
    });
    if (!dept) throw new Error('Department not found');
    return dept;
  }

  static async createDepartment(data: unknown, userId: string) {
    const validated = DepartmentSchema.parse(data);
    const dept = await prisma.department.create({ data: validated });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DEPARTMENT_CREATE',
        entityType: 'Department',
        entityId: dept.id,
        newValue: JSON.stringify({ name: dept.name, code: dept.code }),
      },
    });

    return dept;
  }

  static async updateDepartment(id: string, data: unknown, userId: string) {
    const validated = DepartmentSchema.partial().parse(data);
    const dept = await prisma.department.update({
      where: { id },
      data: validated,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'DEPARTMENT_UPDATE',
        entityType: 'Department',
        entityId: dept.id,
        newValue: JSON.stringify(validated),
      },
    });

    return dept;
  }
}
