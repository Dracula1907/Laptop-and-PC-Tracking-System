import prisma from '../config/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';
import { LoginSchema } from '../validators/schemas';

export class AuthService {
  static async login(data: unknown, ipAddress?: string, userAgent?: string) {
    const validated = LoginSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { username: validated.username },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        employee: true,
      },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid username or password, or account is disabled.');
    }

    const isValidPassword = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid username or password.');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    const userPayload = {
      userId: user.id,
      username: user.username,
      roleId: user.role.id,
      roleCode: user.role.code,
      roleName: user.role.name,
      employeeId: user.employeeId,
      permissions,
    };

    const token = generateToken(userPayload);

    // Audit Log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || 'System',
      },
    });

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: {
          id: user.role.id,
          code: user.role.code,
          name: user.role.name,
        },
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeCode: user.employee.employeeCode,
              fullName: user.employee.fullName,
              email: user.employee.email,
              designation: user.employee.designation,
            }
          : null,
        permissions,
      },
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        employee: {
          include: {
            department: true,
            location: true,
          },
        },
      },
    });

    if (!user) throw new Error('User not found');

    const permissions = user.role.permissions.map((rp) => rp.permission.code);

    return {
      id: user.id,
      username: user.username,
      role: {
        id: user.role.id,
        code: user.role.code,
        name: user.role.name,
      },
      employee: user.employee,
      permissions,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
