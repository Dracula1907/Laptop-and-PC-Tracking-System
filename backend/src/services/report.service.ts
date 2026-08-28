import prisma from '../config/prisma';

export class ReportService {
  static async getReportData(reportType: string) {
    switch (reportType) {
      case 'inventory':
        return prisma.asset.findMany({
          include: { department: true, locationRel: true, currentHolder: true, specifications: true },
          orderBy: { assetCode: 'asc' },
        });

      case 'assigned':
        return prisma.asset.findMany({
          where: { status: 'ASSIGNED' },
          include: { department: true, locationRel: true, currentHolder: true },
          orderBy: { assetCode: 'asc' },
        });

      case 'available':
        return prisma.asset.findMany({
          where: { status: 'AVAILABLE' },
          include: { department: true, locationRel: true },
          orderBy: { assetCode: 'asc' },
        });

      case 'maintenance':
        return prisma.maintenanceRecord.findMany({
          include: { asset: true, reportedBy: true, parts: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'transfers':
        return prisma.assetTransfer.findMany({
          include: { asset: true, previousHolder: true, newHolder: true, previousDepartment: true, newDepartment: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'returns':
        return prisma.assetReturn.findMany({
          include: { asset: true, employee: true, receivedBy: true },
          orderBy: { createdAt: 'desc' },
        });

      case 'warranty':
        return prisma.asset.findMany({
          where: { warrantyEnd: { not: null } },
          include: { currentHolder: true, department: true },
          orderBy: { warrantyEnd: 'asc' },
        });

      case 'audit':
        return prisma.auditLog.findMany({
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });

      default:
        throw new Error(`Report type '${reportType}' is not supported.`);
    }
  }
}
