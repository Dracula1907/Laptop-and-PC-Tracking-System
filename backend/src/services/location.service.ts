import prisma from '../config/prisma';
import { LocationSchema } from '../validators/schemas';

export class LocationService {
  static async getLocations() {
    return prisma.location.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { employees: true, assets: true },
        },
      },
    });
  }

  static async getLocationById(id: string) {
    const loc = await prisma.location.findUnique({
      where: { id },
      include: {
        employees: true,
        assets: {
          include: { currentHolder: true },
        },
      },
    });
    if (!loc) throw new Error('Location not found');
    return loc;
  }

  static async createLocation(data: unknown, userId: string) {
    const validated = LocationSchema.parse(data);
    const loc = await prisma.location.create({ data: validated });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOCATION_CREATE',
        entityType: 'Location',
        entityId: loc.id,
        newValue: JSON.stringify({ name: loc.name, code: loc.code }),
      },
    });

    return loc;
  }

  static async updateLocation(id: string, data: unknown, userId: string) {
    const validated = LocationSchema.partial().parse(data);
    const loc = await prisma.location.update({
      where: { id },
      data: validated,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOCATION_UPDATE',
        entityType: 'Location',
        entityId: loc.id,
        newValue: JSON.stringify(validated),
      },
    });

    return loc;
  }
}
