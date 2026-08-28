import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import { UserCreateSchema, UserUpdateSchema } from '../validators/schemas';

export class UserService {
  static async getUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, employeeCode: true, fullName: true, email: true, department: true } },
      },
    });
  }

  static async createUser(data: unknown, performedByUserId: string) {
    const validated = UserCreateSchema.parse(data);
    const existing = await prisma.user.findUnique({ where: { username: validated.username } });
    if (existing) throw new Error('Username already exists.');

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        username: validated.username,
        passwordHash,
        employeeId: validated.employeeId || null,
        roleId: validated.roleId,
        isActive: true,
      },
      include: { role: true, employee: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: performedByUserId,
        action: 'USER_CREATE',
        entityType: 'User',
        entityId: user.id,
        newValue: JSON.stringify({ username: user.username, role: user.role.code }),
      },
    });

    return user;
  }

  static async updateUser(id: string, data: unknown, performedByUserId: string) {
    const validated = UserUpdateSchema.parse(data);

    // Prevent deactivating the last admin
    if (validated.isActive === false) {
      const user = await prisma.user.findUnique({ where: { id }, include: { role: true } });
      if (user?.role.code === 'ADMIN') {
        const activeAdminsCount = await prisma.user.count({
          where: { role: { code: 'ADMIN' }, isActive: true },
        });
        if (activeAdminsCount <= 1) {
          throw new Error('Cannot deactivate the last active administrator account.');
        }
      }
    }

    let passwordHash: string | undefined;
    if (validated.password) {
      passwordHash = await bcrypt.hash(validated.password, 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        roleId: validated.roleId,
        isActive: validated.isActive,
        passwordHash,
      },
      include: { role: true, employee: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: performedByUserId,
        action: 'USER_UPDATE',
        entityType: 'User',
        entityId: id,
        newValue: JSON.stringify({ isActive: updated.isActive, roleId: updated.roleId }),
      },
    });

    return updated;
  }

  static async getRoles() {
    return prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
    });
  }
}
