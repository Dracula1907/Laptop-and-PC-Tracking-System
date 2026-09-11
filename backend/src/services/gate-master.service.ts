import prisma from '../config/prisma';

export class GateMasterService {
  /**
   * Ensures default physical gates exist in the system.
   */
  public static async ensureDefaultGates() {
    // Only GATE-01 (Main Security Gate) is ACTIVE for all new gate operations
    await prisma.gate.upsert({
      where: { code: 'GATE-01' },
      update: { status: 'ACTIVE' },
      create: {
        code: 'GATE-01',
        name: 'Main Security Gate',
        location: 'Building A Main Entrance',
        status: 'ACTIVE',
      },
    }).catch(() => {});

    // Deactivate GATE-02, GATE-03, GATE-04 so historical movement foreign keys are preserved
    const inactiveGates = ['GATE-02', 'GATE-03', 'GATE-04'];
    for (const code of inactiveGates) {
      await prisma.gate.updateMany({
        where: { code },
        data: { status: 'INACTIVE' },
      }).catch(() => {});
    }
  }

  public static async getGates() {
    await this.ensureDefaultGates();
    return await prisma.gate.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { movements: true },
        },
      },
    });
  }

  public static async createGate(data: { name: string; code: string; location?: string }) {
    return await prisma.gate.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        location: data.location || null,
        status: 'ACTIVE',
      },
    });
  }

  public static async updateGate(id: string, data: { name?: string; location?: string; status?: string }) {
    return await prisma.gate.update({
      where: { id },
      data,
    });
  }
}
