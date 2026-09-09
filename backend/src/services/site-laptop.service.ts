import prisma from '../config/prisma';
import { SiteLaptopEntryType, SiteLaptopStatus } from '@prisma/client';
import { combineDateTimeIST } from '../utils/timezone';

export class SiteLaptopService {
  /**
   * Generate sequential unique code: SLP-000001, SLP-000002, etc.
   */
  public static async generateNextCode(): Promise<string> {
    const lastRecord = await prisma.siteLaptop.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });

    if (!lastRecord || !lastRecord.code.startsWith('SLP-')) {
      return 'SLP-000001';
    }

    const currentNumber = parseInt(lastRecord.code.replace('SLP-', ''), 10);
    const nextNumber = isNaN(currentNumber) ? 1 : currentNumber + 1;
    return `SLP-${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * Get eligible inventory laptops for Method 1 selection
   */
  public static async getEligibleInventoryLaptops(search?: string) {
    const whereClause: any = {
      assetType: 'LAPTOP',
    };

    if (search && search.trim().length > 0) {
      const q = search.trim();
      whereClause.OR = [
        { assetCode: { contains: q, mode: 'insensitive' } },
        { companyAssetId: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { assetName: { contains: q, mode: 'insensitive' } },
      ];
    }

    return await prisma.asset.findMany({
      where: whereClause,
      take: 25,
      orderBy: { assetCode: 'asc' },
      select: {
        id: true,
        assetCode: true,
        companyAssetId: true,
        model: true,
        manufacturer: true,
        serialNumber: true,
        status: true,
        currentHolder: {
          select: {
            fullName: true,
            employeeCode: true,
          },
        },
        qrCodes: {
          where: { status: 'ACTIVE' },
          take: 1,
          select: {
            token: true,
          },
        },
      },
    });
  }

  /**
   * Get telemetry stats for Site Laptops
   */
  public static async getStats() {
    const [total, atSite, returned, inTransit, maintenance, distinctLaptops] = await Promise.all([
      prisma.siteLaptop.count(),
      prisma.siteLaptop.count({ where: { status: 'AT_SITE' } }),
      prisma.siteLaptop.count({ where: { status: 'RETURNED' } }),
      prisma.siteLaptop.count({ where: { status: 'IN_TRANSIT' } }),
      prisma.siteLaptop.count({ where: { status: 'MAINTENANCE' } }),
      prisma.siteLaptop.groupBy({
        by: ['assetIdDisplay'],
        _count: { assetIdDisplay: true },
      }),
    ]);

    return {
      totalDispatches: total,
      atSite,
      returned,
      inTransit,
      maintenance,
      uniqueLaptops: distinctLaptops.length,
    };
  }

  /**
   * Query site laptops with search and filtering
   */
  public static async getSiteLaptops(query: {
    search?: string;
    status?: string;
    destinationSite?: string;
    startDate?: string;
    endDate?: string;
    limit?: string;
    offset?: string;
  }) {
    const { search, status, destinationSite, startDate, endDate, limit, offset } = query;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status as SiteLaptopStatus;
    }

    if (destinationSite && destinationSite.trim().length > 0) {
      where.destinationSite = { contains: destinationSite.trim(), mode: 'insensitive' };
    }

    if (startDate || endDate) {
      where.dispatchDate = {};
      if (startDate) {
        where.dispatchDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.dispatchDate.lte = end;
      }
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { laptopName: { contains: q, mode: 'insensitive' } },
        { assetIdDisplay: { contains: q, mode: 'insensitive' } },
        { qrCode: { contains: q, mode: 'insensitive' } },
        { destinationSite: { contains: q, mode: 'insensitive' } },
        { assignedTo: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const take = limit ? parseInt(limit, 10) : 100;
    const skip = offset ? parseInt(offset, 10) : 0;

    const [items, total] = await Promise.all([
      prisma.siteLaptop.findMany({
        where,
        take,
        skip,
        orderBy: { dispatchDate: 'desc' },
        include: {
          asset: {
            select: {
              id: true,
              assetCode: true,
              companyAssetId: true,
              model: true,
              manufacturer: true,
              serialNumber: true,
              status: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
            },
          },
          history: {
            take: 1,
            orderBy: { eventDate: 'desc' },
          },
        },
      }),
      prisma.siteLaptop.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Get single site laptop by ID including full chronological movement history
   */
  public static async getSiteLaptopById(id: string) {
    const item = await prisma.siteLaptop.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            assetCode: true,
            companyAssetId: true,
            model: true,
            manufacturer: true,
            serialNumber: true,
            status: true,
            currentHolder: {
              select: {
                fullName: true,
                employeeCode: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            username: true,
          },
        },
        history: {
          orderBy: { eventDate: 'desc' },
          include: {
            performedBy: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (item && item.history) {
      item.history = item.history.map((h) => {
        if (h.action === 'DISPATCHED' && item.dispatchTime) {
          const isMidnightUTC = h.eventDate.getUTCHours() === 0 && h.eventDate.getUTCMinutes() === 0 && h.eventDate.getUTCSeconds() === 0;
          if (isMidnightUTC) {
            h.eventDate = combineDateTimeIST(item.dispatchDate, item.dispatchTime);
          }
        }
        return h;
      });
    }

    return item;
  }

  /**
   * Create Site Laptop dispatch record (Method 1 or Method 2)
   */
  public static async createSiteLaptop(
    data: {
      entryType: 'INVENTORY_LINKED' | 'MANUAL_ENTRY';
      assetId?: string;
      laptopName?: string;
      assetIdDisplay?: string;
      qrCode?: string;
      serialNumber?: string;
      dispatchDate: string | Date;
      dispatchTime?: string;
      destinationSite: string;
      assignedTo?: string;
      contactNumber?: string;
      purpose?: string;
      expectedReturn?: string | Date;
      remarks?: string;
    },
    userId?: string
  ) {
    const code = await this.generateNextCode();
    let laptopName = data.laptopName?.trim() || '';
    let assetIdDisplay = data.assetIdDisplay?.trim() || '';
    let qrCode = data.qrCode?.trim() || null;
    let serialNumber = data.serialNumber?.trim() || null;
    let assetId = data.assetId || null;

    if (data.entryType === 'INVENTORY_LINKED') {
      if (!data.assetId) {
        throw new Error('An inventory asset must be selected for Method 1 (Inventory Linked).');
      }

      const asset = await prisma.asset.findUnique({
        where: { id: data.assetId },
        include: {
          qrCodes: {
            where: { status: 'ACTIVE' },
            take: 1,
            select: { token: true },
          },
        },
      });

      if (!asset) {
        throw new Error('Selected inventory asset was not found.');
      }

      laptopName = asset.model ? `${asset.manufacturer} ${asset.model}` : (asset.assetName || 'Dell Laptop');
      assetIdDisplay = asset.companyAssetId || asset.assetCode;
      qrCode = asset.qrCodes[0]?.token || asset.assetCode;
      serialNumber = asset.serialNumber || null;
      assetId = asset.id;
    } else {
      if (!laptopName || !assetIdDisplay) {
        throw new Error('Laptop Name and Asset ID are required for Manual Entry.');
      }
    }

    if (!data.destinationSite || !data.destinationSite.trim()) {
      throw new Error('Destination Site location is required.');
    }

    const dispatchDate = combineDateTimeIST(data.dispatchDate || new Date(), data.dispatchTime);
    const expectedReturn = data.expectedReturn ? new Date(data.expectedReturn) : null;

    const record = await prisma.siteLaptop.create({
      data: {
        code,
        entryType: data.entryType as SiteLaptopEntryType,
        assetId,
        laptopName,
        assetIdDisplay,
        qrCode,
        serialNumber,
        dispatchDate,
        dispatchTime: data.dispatchTime || null,
        destinationSite: data.destinationSite.trim(),
        assignedTo: data.assignedTo?.trim() || null,
        contactNumber: data.contactNumber?.trim() || null,
        purpose: data.purpose?.trim() || null,
        expectedReturn,
        status: 'AT_SITE',
        remarks: data.remarks?.trim() || null,
        createdById: userId || null,
        history: {
          create: {
            action: 'DISPATCHED',
            toSite: data.destinationSite.trim(),
            toStatus: 'AT_SITE',
            notes: `Initial dispatch to site "${data.destinationSite.trim()}"`,
            performedById: userId || null,
            eventDate: dispatchDate,
          },
        },
      },
      include: {
        asset: true,
        history: true,
      },
    });

    return record;
  }

  /**
   * Update Site Laptop record with audit and chronological movement history
   */
  public static async updateSiteLaptop(
    id: string,
    data: {
      laptopName?: string;
      destinationSite?: string;
      assignedTo?: string;
      contactNumber?: string;
      purpose?: string;
      expectedReturn?: string | Date | null;
      actualReturn?: string | Date | null;
      status?: SiteLaptopStatus;
      remarks?: string;
      historyNote?: string;
    },
    userId?: string
  ) {
    const current = await prisma.siteLaptop.findUnique({
      where: { id },
      include: { asset: true },
    });

    if (!current) {
      throw new Error('Site Laptop record not found.');
    }

    const historyEntries: any[] = [];
    const updateData: any = {
      updatedById: userId || null,
    };

    // Update basic fields
    if (data.laptopName !== undefined && current.entryType === 'MANUAL_ENTRY') {
      updateData.laptopName = data.laptopName.trim();
    }
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo?.trim() || null;
    if (data.contactNumber !== undefined) updateData.contactNumber = data.contactNumber?.trim() || null;
    if (data.purpose !== undefined) updateData.purpose = data.purpose?.trim() || null;
    if (data.remarks !== undefined) updateData.remarks = data.remarks?.trim() || null;

    if (data.expectedReturn !== undefined) {
      updateData.expectedReturn = data.expectedReturn ? new Date(data.expectedReturn) : null;
    }

    if (data.actualReturn !== undefined) {
      updateData.actualReturn = data.actualReturn ? new Date(data.actualReturn) : null;
    }

    // Check Destination Site change (Movement between sites)
    const newSite = data.destinationSite?.trim();
    if (newSite && newSite !== current.destinationSite) {
      updateData.destinationSite = newSite;
      historyEntries.push({
        action: 'SITE_CHANGED',
        fromSite: current.destinationSite,
        toSite: newSite,
        fromStatus: current.status,
        toStatus: data.status || current.status,
        notes: data.historyNote || `Relocated from "${current.destinationSite}" to "${newSite}"`,
        performedById: userId || null,
      });
    }

    // Check Status change (e.g. Returned, In Transit, At Site)
    if (data.status && data.status !== current.status) {
      updateData.status = data.status;
      if (data.status === 'RETURNED' && !updateData.actualReturn && !current.actualReturn) {
        updateData.actualReturn = new Date();
      }

      historyEntries.push({
        action: data.status === 'RETURNED' ? 'RETURNED' : 'STATUS_UPDATED',
        fromSite: current.destinationSite,
        toSite: updateData.destinationSite || current.destinationSite,
        fromStatus: current.status,
        toStatus: data.status,
        notes: data.historyNote || `Status updated from ${current.status} to ${data.status}`,
        performedById: userId || null,
      });
    }

    // If general edits were made without status or site changes, log an edit event
    if (historyEntries.length === 0 && (data.historyNote || Object.keys(updateData).length > 1)) {
      historyEntries.push({
        action: 'DETAILS_EDITED',
        fromSite: current.destinationSite,
        toSite: current.destinationSite,
        fromStatus: current.status,
        toStatus: current.status,
        notes: data.historyNote || 'Record details updated',
        performedById: userId || null,
      });
    }

    // Execute update and history insertion
    const updated = await prisma.siteLaptop.update({
      where: { id },
      data: {
        ...updateData,
        history: historyEntries.length > 0 ? { create: historyEntries } : undefined,
      },
      include: {
        asset: true,
        history: {
          orderBy: { eventDate: 'desc' },
          include: {
            performedBy: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Get full chronological movement history for a laptop or all site laptops
   */
  public static async getHistories(siteLaptopId?: string) {
    const where: any = {};
    if (siteLaptopId) {
      where.siteLaptopId = siteLaptopId;
    }

    return await prisma.siteLaptopHistory.findMany({
      where,
      orderBy: { eventDate: 'desc' },
      include: {
        siteLaptop: {
          select: {
            id: true,
            code: true,
            laptopName: true,
            assetIdDisplay: true,
            qrCode: true,
            destinationSite: true,
            status: true,
          },
        },
        performedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }
}
