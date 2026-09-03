import crypto from 'crypto';
import prisma from '../config/prisma';
import { DocumentType, DocumentStatus, NotificationCategory, NotificationPriority } from '@prisma/client';
import { NotificationService } from './notification.service';
import { logger } from '../utils/logger';

export class DocumentService {
  private static async generateDocumentNumber(type: DocumentType): Promise<string> {
    const prefixMap: Record<DocumentType, string> = {
      HANDOVER: 'HND',
      TRANSFER: 'TRF-DOC',
      RETURN_RECEIPT: 'RET-DOC',
      CLEARANCE: 'CLR-DOC',
      RETIREMENT: 'RTM',
    };
    const prefix = prefixMap[type] || 'DOC';
    const count = await prisma.document.count({ where: { documentType: type } });
    return `${prefix}-${String(count + 1).padStart(6, '0')}`;
  }

  /**
   * 1. Generate an official document with immutable snapshot and SHA-256 hash
   */
  static async generateDocument(
    type: DocumentType,
    relatedEntityId: string,
    userId: string,
    remarks?: string
  ) {
    let relatedEntityType = '';
    let assetId: string | null = null;
    let employeeId: string | null = null;
    let snapshotPayload: any = {};

    switch (type) {
      case DocumentType.HANDOVER: {
        relatedEntityType = 'AssetAssignment';
        const asn = await prisma.assetAssignment.findUnique({
          where: { id: relatedEntityId },
          include: {
            asset: { include: { specifications: true, department: true, locationRel: true } },
            employee: { include: { department: true, location: true } },
            assignedBy: { select: { username: true } },
            approvedBy: { select: { username: true } },
          },
        });
        if (!asn) throw new Error('Asset Assignment record not found');
        assetId = asn.assetId;
        employeeId = asn.employeeId;
        snapshotPayload = {
          title: 'IT Asset Handover & Acceptance Certificate',
          assignmentCode: asn.assignmentCode,
          assignedAt: asn.assignedAt,
          expectedReturnDate: asn.expectedReturnDate,
          conditionAtAssignment: asn.conditionAtAssignment,
          reason: asn.reason,
          remarks: asn.remarks,
          asset: {
            assetCode: asn.asset.assetCode,
            assetName: asn.asset.assetName,
            assetType: asn.asset.assetType,
            manufacturer: asn.asset.manufacturer,
            model: asn.asset.model,
            serialNumber: asn.asset.serialNumber,
            specifications: asn.asset.specifications,
          },
          employee: {
            employeeCode: asn.employee.employeeCode,
            fullName: asn.employee.fullName,
            email: asn.employee.email,
            designation: asn.employee.designation,
            department: asn.employee.department?.name,
            location: asn.employee.location?.name,
          },
          assignedBy: asn.assignedBy.username,
          approvedBy: asn.approvedBy?.username || '—',
        };
        break;
      }

      case DocumentType.TRANSFER: {
        relatedEntityType = 'AssetTransfer';
        const trf = await prisma.assetTransfer.findUnique({
          where: { id: relatedEntityId },
          include: {
            asset: { include: { specifications: true } },
            previousHolder: { include: { department: true, location: true } },
            newHolder: { include: { department: true, location: true } },
            requestedBy: { select: { username: true } },
            approvedBy: { select: { username: true } },
          },
        });
        if (!trf) throw new Error('Asset Transfer record not found');
        assetId = trf.assetId;
        employeeId = trf.newHolderId;
        snapshotPayload = {
          title: 'IT Asset Transfer & Movement Order',
          transferCode: trf.transferCode,
          transferDate: trf.transferDate,
          effectiveDate: trf.effectiveDate,
          reason: trf.reason,
          conditionBefore: trf.conditionBefore,
          conditionAfter: trf.conditionAfter,
          asset: {
            assetCode: trf.asset.assetCode,
            assetName: trf.asset.assetName,
            assetType: trf.asset.assetType,
            model: trf.asset.model,
            serialNumber: trf.asset.serialNumber,
            specifications: trf.asset.specifications,
          },
          from: {
            employee: trf.previousHolder?.fullName || 'IT Stock / Unassigned',
            department: trf.previousHolder?.department?.name || '—',
            location: trf.previousHolder?.location?.name || '—',
          },
          to: {
            employee: trf.newHolder?.fullName || 'IT Stock / Unassigned',
            department: trf.newHolder?.department?.name || '—',
            location: trf.newHolder?.location?.name || '—',
          },
          requestedBy: trf.requestedBy.username,
          approvedBy: trf.approvedBy?.username || '—',
        };
        break;
      }

      case DocumentType.RETURN_RECEIPT: {
        relatedEntityType = 'AssetReturn';
        const ret = await prisma.assetReturn.findUnique({
          where: { id: relatedEntityId },
          include: {
            asset: { include: { specifications: true } },
            employee: { include: { department: true, location: true } },
            receivedBy: { select: { username: true } },
            inspectedBy: { select: { username: true } },
          },
        });
        if (!ret) throw new Error('Asset Return record not found');
        assetId = ret.assetId;
        employeeId = ret.employeeId;
        snapshotPayload = {
          title: 'IT Asset Return Receipt & Inspection Report',
          returnCode: ret.returnCode,
          returnDate: ret.returnDate,
          returnReason: ret.returnReason,
          conditionAtReturn: ret.conditionAtReturn,
          accessoriesReturned: ret.accessoriesReturned,
          damageReported: ret.damageReported,
          damageDescription: ret.damageDescription,
          inspectionResult: ret.inspectionResult,
          inspectionRemarks: ret.inspectionRemarks,
          dataWipeStatus: ret.dataWipeStatus,
          asset: {
            assetCode: ret.asset.assetCode,
            assetName: ret.asset.assetName,
            assetType: ret.asset.assetType,
            model: ret.asset.model,
            serialNumber: ret.asset.serialNumber,
          },
          employee: ret.employee
            ? {
                employeeCode: ret.employee.employeeCode,
                fullName: ret.employee.fullName,
                department: ret.employee.department?.name,
              }
            : null,
          receivedBy: ret.receivedBy?.username || 'IT Staff',
          inspectedBy: ret.inspectedBy?.username || '—',
        };
        break;
      }

      case DocumentType.CLEARANCE: {
        relatedEntityType = 'Clearance';
        const clr = await prisma.clearance.findUnique({
          where: { id: relatedEntityId },
          include: {
            employee: { include: { department: true, location: true } },
            initiatedBy: { select: { username: true } },
            approvedBy: { select: { username: true } },
            items: { include: { asset: true } },
          },
        });
        if (!clr) throw new Error('Clearance record not found');
        employeeId = clr.employeeId;
        snapshotPayload = {
          title: 'Employee Offboarding & IT Asset Clearance Certificate',
          clearanceCode: clr.clearanceCode,
          exitDate: clr.exitDate,
          initiatedDate: clr.initiatedDate,
          status: clr.status,
          completedDate: clr.completedDate,
          employee: {
            employeeCode: clr.employee.employeeCode,
            fullName: clr.employee.fullName,
            department: clr.employee.department?.name,
            location: clr.employee.location?.name,
          },
          items: clr.items.map((i) => ({
            assetCode: i.asset.assetCode,
            assetName: i.asset.assetName || i.asset.model,
            action: i.action,
            status: i.status,
            resolutionNotes: i.resolutionNotes,
          })),
          initiatedBy: clr.initiatedBy.username,
          approvedBy: clr.approvedBy?.username || '—',
        };
        break;
      }

      case DocumentType.RETIREMENT: {
        relatedEntityType = 'Retirement';
        const rtm = await prisma.retirement.findUnique({
          where: { id: relatedEntityId },
          include: {
            asset: { include: { specifications: true, department: true, locationRel: true } },
            requestedBy: { select: { username: true } },
            approvedBy: { select: { username: true } },
            replacementAsset: true,
          },
        });
        if (!rtm) throw new Error('Retirement record not found');
        assetId = rtm.assetId;
        snapshotPayload = {
          title: 'Official Asset Retirement & Disposal Certificate',
          retirementCode: rtm.retirementCode,
          retirementDate: rtm.retirementDate || rtm.requestedDate,
          status: rtm.status,
          reason: rtm.reason,
          overrideReason: rtm.overrideReason,
          finalCondition: rtm.finalCondition,
          finalLocation: rtm.finalLocation,
          dataSanitizationStatus: rtm.dataSanitizationStatus,
          disposalMethod: rtm.disposalMethod,
          disposalVendor: rtm.disposalVendor,
          residualValue: rtm.residualValue,
          asset: {
            assetCode: rtm.asset.assetCode,
            assetName: rtm.asset.assetName,
            assetType: rtm.asset.assetType,
            model: rtm.asset.model,
            serialNumber: rtm.asset.serialNumber,
            purchaseDate: rtm.asset.purchaseDate,
            purchaseCost: rtm.asset.purchaseCost,
          },
          replacementAsset: rtm.replacementAsset
            ? {
                assetCode: rtm.replacementAsset.assetCode,
                model: rtm.replacementAsset.model,
              }
            : null,
          requestedBy: rtm.requestedBy.username,
          approvedBy: rtm.approvedBy?.username || '—',
        };
        break;
      }
    }

    const snapshotData = JSON.stringify(snapshotPayload);
    const fileHash = crypto.createHash('sha256').update(snapshotData).digest('hex');

    // Check existing documents for versioning
    const existing = await prisma.document.findFirst({
      where: {
        relatedEntityType,
        relatedEntityId,
        status: DocumentStatus.FINAL,
      },
      orderBy: { version: 'desc' },
    });

    const version = existing ? existing.version + 1 : 1;
    const documentNumber = await this.generateDocumentNumber(type);

    return prisma.$transaction(async (tx) => {
      // Mark old version as superseded if applicable
      if (existing) {
        await tx.document.update({
          where: { id: existing.id },
          data: { status: DocumentStatus.SUPERSEDED },
        });
      }

      const doc = await tx.document.create({
        data: {
          documentNumber,
          documentType: type,
          relatedEntityType,
          relatedEntityId,
          assetId,
          employeeId,
          generatedById: userId,
          version,
          status: DocumentStatus.FINAL,
          fileHash,
          snapshotData,
          remarks,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'DOCUMENT_GENERATED',
          entityType: 'Document',
          entityId: doc.id,
          newValue: JSON.stringify({ documentNumber, type, version, fileHash }),
        },
      });

      return doc;
    });
  }

  /**
   * 2. Query documents
   */
  static async getDocuments(query: any = {}) {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.documentType) where.documentType = query.documentType as DocumentType;
    if (query.status) where.status = query.status as DocumentStatus;
    if (query.assetId) where.assetId = query.assetId;
    if (query.employeeId) where.employeeId = query.employeeId;

    if (query.search) {
      where.OR = [
        { documentNumber: { contains: query.search, mode: 'insensitive' } },
        { asset: { assetCode: { contains: query.search, mode: 'insensitive' } } },
        { employee: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          asset: { select: { assetCode: true, model: true } },
          employee: { select: { employeeCode: true, fullName: true } },
          generatedBy: { select: { username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.document.count({ where }),
    ]);

    return { documents, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * 3. Get document by ID with parsed snapshot
   */
  static async getDocumentById(id: string) {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        asset: true,
        employee: true,
        generatedBy: { select: { username: true } },
      },
    });
    if (!doc) throw new Error('Document not found');

    let parsedSnapshot = null;
    try {
      parsedSnapshot = JSON.parse(doc.snapshotData);
    } catch {}

    return { ...doc, parsedSnapshot };
  }

  /**
   * 4. Void a Document
   */
  static async voidDocument(id: string, userId: string, reason?: string) {
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) throw new Error('Document not found');

    return prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({
        where: { id },
        data: {
          status: DocumentStatus.VOIDED,
          remarks: reason || 'Voided by authorized administrator',
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'DOCUMENT_VOIDED',
          entityType: 'Document',
          entityId: id,
          newValue: JSON.stringify({ documentNumber: doc.documentNumber, reason }),
        },
      });

      return updated;
    });
  }
}
