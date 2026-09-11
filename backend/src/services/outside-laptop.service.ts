import prisma from '../config/prisma';

export interface OutsideLaptopFilters {
  page?: number;
  limit?: number;
  search?: string;
  movementType?: string; // 'OUT' | 'IN' | 'ALL'
  status?: string; // 'OUTSIDE' | 'RETURNED' | 'ALL'
  startDate?: string;
  endDate?: string;
}

export interface CreateOutsideLaptopDto {
  laptopName: string;
  laptopIdentifier: string;
  personName: string;
  personDetails?: string;
  company?: string;
  contactNumber?: string;
  movementType: 'OUT' | 'IN';
  purpose: string;
  destination?: string;
  remarks?: string;
  linkedOutRecordId?: string;
}

export interface UpdateOutsideLaptopDto {
  laptopName?: string;
  laptopIdentifier?: string;
  personName?: string;
  personDetails?: string;
  company?: string;
  contactNumber?: string;
  purpose?: string;
  destination?: string;
  remarks?: string;
  status?: string;
}

export class OutsideLaptopService {
  /**
   * Generates next sequential record code: OL-000001, OL-000002, ...
   */
  private static async generateRecordCode(): Promise<string> {
    const count = await prisma.outsideLaptopRecord.count();
    const nextSeq = count + 1;
    let code = `OL-${String(nextSeq).padStart(6, '0')}`;

    // Ensure uniqueness in rare concurrency
    let exists = await prisma.outsideLaptopRecord.findUnique({ where: { recordCode: code } });
    let increment = 1;
    while (exists) {
      code = `OL-${String(nextSeq + increment).padStart(6, '0')}`;
      exists = await prisma.outsideLaptopRecord.findUnique({ where: { recordCode: code } });
      increment++;
    }
    return code;
  }

  /**
   * Retrieves paginated manual Outside Laptop movement records.
   * Excludes soft-deleted records.
   */
  public static async getRecords(filters: OutsideLaptopFilters = {}) {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      isDeleted: false,
    };

    if (filters.movementType && filters.movementType !== 'ALL') {
      where.movementType = filters.movementType.toUpperCase();
    }

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status.toUpperCase();
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { recordCode: { contains: q, mode: 'insensitive' } },
        { laptopName: { contains: q, mode: 'insensitive' } },
        { laptopIdentifier: { contains: q, mode: 'insensitive' } },
        { personName: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { destination: { contains: q, mode: 'insensitive' } },
        { purpose: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (filters.startDate || filters.endDate) {
      where.movementDateTime = {};
      if (filters.startDate) {
        where.movementDateTime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.movementDateTime.lte = end;
      }
    }

    const [total, records] = await Promise.all([
      prisma.outsideLaptopRecord.count({ where }),
      prisma.outsideLaptopRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { movementDateTime: 'desc' },
        include: {
          recordedBy: {
            select: {
              id: true,
              username: true,
              employee: {
                select: { fullName: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves all currently outside laptops (OUT with status 'OUTSIDE').
   */
  public static async getCurrentlyOutside(search?: string) {
    const where: any = {
      isDeleted: false,
      movementType: 'OUT',
      status: 'OUTSIDE',
    };

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { recordCode: { contains: q, mode: 'insensitive' } },
        { laptopName: { contains: q, mode: 'insensitive' } },
        { laptopIdentifier: { contains: q, mode: 'insensitive' } },
        { personName: { contains: q, mode: 'insensitive' } },
        { destination: { contains: q, mode: 'insensitive' } },
        { purpose: { contains: q, mode: 'insensitive' } },
      ];
    }

    return await prisma.outsideLaptopRecord.findMany({
      where,
      orderBy: { movementDateTime: 'desc' },
      include: {
        recordedBy: {
          select: {
            id: true,
            username: true,
            employee: {
              select: { fullName: true },
            },
          },
        },
      },
    });
  }

  /**
   * Retrieves aggregate KPI stats for Outside Laptop module.
   */
  public static async getStats() {
    // Current date boundary in IST (Asia/Kolkata)
    const now = new Date();
    const istDateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now); // 'YYYY-MM-DD'

    const todayStart = new Date(`${istDateStr}T00:00:00+05:30`);

    const [totalMovements, currentlyOutside, totalReturned, todayMovements] = await Promise.all([
      prisma.outsideLaptopRecord.count({ where: { isDeleted: false } }),
      prisma.outsideLaptopRecord.count({
        where: { isDeleted: false, movementType: 'OUT', status: 'OUTSIDE' },
      }),
      prisma.outsideLaptopRecord.count({
        where: { isDeleted: false, movementType: 'IN' },
      }),
      prisma.outsideLaptopRecord.count({
        where: {
          isDeleted: false,
          movementDateTime: { gte: todayStart },
        },
      }),
    ]);

    return {
      totalMovements,
      currentlyOutside,
      totalReturned,
      todayMovements,
    };
  }

  /**
   * Records a new manual Outside Laptop movement (OUT or IN).
   * Uses authoritative server timestamp.
   * Completely isolated from Asset Inventory.
   */
  public static async recordMovement(data: CreateOutsideLaptopDto, userId?: string) {
    if (!data.laptopName || !data.laptopName.trim()) {
      throw new Error('Laptop Name / Model is required.');
    }
    if (!data.laptopIdentifier || !data.laptopIdentifier.trim()) {
      throw new Error('Laptop ID / Identifier is required.');
    }
    if (!data.personName || !data.personName.trim()) {
      throw new Error('Person Name is required.');
    }
    if (!data.movementType || !['OUT', 'IN'].includes(data.movementType.toUpperCase())) {
      throw new Error('Movement Type must be either OUT or IN.');
    }

    const movementType = data.movementType.toUpperCase() as 'OUT' | 'IN';
    const recordCode = await this.generateRecordCode();
    const serverTimestamp = new Date(); // Authoritative server timestamp

    // If IN movement, default status is 'RETURNED'
    // If OUT movement, default status is 'OUTSIDE'
    const status = movementType === 'IN' ? 'RETURNED' : 'OUTSIDE';

    // Atomic execution
    return await prisma.$transaction(async (tx) => {
      // Verify recordedById exists in User table to avoid FK error
      let validUserId: string | null = null;
      if (userId) {
        const u = await tx.user.findUnique({ where: { id: userId } });
        if (u) validUserId = userId;
      }

      // If linked to an OUT record, update the OUT record to 'RETURNED'
      if (movementType === 'IN' && data.linkedOutRecordId) {
        await tx.outsideLaptopRecord.update({
          where: { id: data.linkedOutRecordId },
          data: { status: 'RETURNED' },
        }).catch(() => {});
      } else if (movementType === 'IN') {
        // If not explicitly linked by ID, attempt to resolve any open OUT record for the same laptop identifier
        const openOutRecord = await tx.outsideLaptopRecord.findFirst({
          where: {
            laptopIdentifier: data.laptopIdentifier.trim(),
            movementType: 'OUT',
            status: 'OUTSIDE',
            isDeleted: false,
          },
          orderBy: { movementDateTime: 'desc' },
        });

        if (openOutRecord) {
          await tx.outsideLaptopRecord.update({
            where: { id: openOutRecord.id },
            data: { status: 'RETURNED' },
          });
        }
      }

      // Create new movement record in history
      const newRecord = await tx.outsideLaptopRecord.create({
        data: {
          recordCode,
          laptopName: data.laptopName.trim(),
          laptopIdentifier: data.laptopIdentifier.trim(),
          personName: data.personName.trim(),
          personDetails: data.personDetails?.trim() || null,
          company: data.company?.trim() || null,
          contactNumber: data.contactNumber?.trim() || null,
          movementType,
          purpose: data.purpose?.trim() || (movementType === 'IN' ? 'Return to premise' : 'Outside work'),
          destination: data.destination?.trim() || null,
          movementDateTime: serverTimestamp,
          recordedById: validUserId,
          status,
          linkedOutRecordId: data.linkedOutRecordId || null,
          remarks: data.remarks?.trim() || null,
        },
        include: {
          recordedBy: {
            select: {
              id: true,
              username: true,
              employee: {
                select: { fullName: true },
              },
            },
          },
        },
      });

      return newRecord;
    });
  }

  /**
   * Updates an existing Outside Laptop record.
   * Modifies only OutsideLaptopRecord.
   */
  public static async updateRecord(id: string, data: UpdateOutsideLaptopDto, userId?: string) {
    const existing = await prisma.outsideLaptopRecord.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      throw new Error('Outside Laptop record not found.');
    }

    return await prisma.outsideLaptopRecord.update({
      where: { id },
      data: {
        ...(data.laptopName && { laptopName: data.laptopName.trim() }),
        ...(data.laptopIdentifier && { laptopIdentifier: data.laptopIdentifier.trim() }),
        ...(data.personName && { personName: data.personName.trim() }),
        ...(data.personDetails !== undefined && { personDetails: data.personDetails?.trim() || null }),
        ...(data.company !== undefined && { company: data.company?.trim() || null }),
        ...(data.contactNumber !== undefined && { contactNumber: data.contactNumber?.trim() || null }),
        ...(data.purpose && { purpose: data.purpose.trim() }),
        ...(data.destination !== undefined && { destination: data.destination?.trim() || null }),
        ...(data.remarks !== undefined && { remarks: data.remarks?.trim() || null }),
        ...(data.status && { status: data.status }),
      },
      include: {
        recordedBy: {
          select: {
            id: true,
            username: true,
            employee: {
              select: { fullName: true },
            },
          },
        },
      },
    });
  }

  /**
   * Soft-deletes an Outside Laptop record.
   */
  public static async deleteRecord(id: string, userId?: string) {
    const existing = await prisma.outsideLaptopRecord.findUnique({
      where: { id },
    });

    if (!existing || existing.isDeleted) {
      throw new Error('Outside Laptop record not found.');
    }

    return await prisma.outsideLaptopRecord.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Exports all non-deleted Outside Laptop records for Excel export.
   */
  public static async getAllForExport() {
    return await prisma.outsideLaptopRecord.findMany({
      where: { isDeleted: false },
      orderBy: { movementDateTime: 'desc' },
      include: {
        recordedBy: {
          select: {
            username: true,
            employee: { select: { fullName: true } },
          },
        },
      },
    });
  }
}
