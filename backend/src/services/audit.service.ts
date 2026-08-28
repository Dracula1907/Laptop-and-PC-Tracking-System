import prisma from '../config/prisma';

export class AuditService {
  static async getLogs(query: { page?: number; limit?: number; userId?: string; action?: string; entityType?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.entityType) where.entityType = query.entityType;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, role: { select: { name: true } } } },
        },
      }),
    ]);

    return {
      logs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}
