import prisma from '../config/prisma';

export class GateMasterService {
  /**
   * Ensures default physical gates exist in the system.
   */
  public static async ensureDefaultGates() {
    const defaultGates = [
      { code: 'GATE-01', name: 'Main Security Gate', location: 'Building A Main Entrance' },
      { code: 'GATE-02', name: 'Dispatch & Logistics Gate', location: 'Loading Bay 1' },
      { code: 'GATE-03', name: 'R&D Lab Security Gate', location: 'Technology Wing' },
      { code: 'GATE-04', name: 'Service & Maintenance Gate', location: 'Plant Workshop' },
    ];

    for (const g of defaultGates) {
      await prisma.gate.upsert({
        where: { code: g.code },
        update: {},
        create: {
          code: g.code,
          name: g.name,
          location: g.location,
          status: 'ACTIVE',
        },
      }).catch(() => {});
    }
  }

  public static async getGates() {
    await this.ensureDefaultGates();
    return await prisma.gate.findMany({
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
