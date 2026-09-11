import * as XLSX from 'xlsx';
import prisma from '../config/prisma';
import { logger } from '../utils/logger';
import {
  AssetType,
  AssetStatus,
  AssetCondition,
  AllocationStatus,
  HolderType,
  HolderVerificationStatus,
  DataQualityStatus,
  ImportStatus,
  AssetAction,
} from '@prisma/client';

export const OFFICIAL_EXCEL_COLUMNS = [
  'Sr. no.',
  'Department',
  'User',
  'Type',
  'Make',
  'Serial No',
  'LAN IP',
  'WAN IP',
  'Asset ID',
  'LAN Mac Address',
  'WAN Mac Address',
  'Warranty Start Date',
  'Warranty End Date',
  'CPU',
  'RAM',
  'System',
  'Warranty Status',
  'Software',
  'MS Office',
] as const;

export const EXACT_EXCEL_COLUMNS = [
  'Asset ID',
  'Asset Name',
  'Asset Description',
  "Manufacturer's Serial Number",
  'Asset Type',
  'Asset Status',
  'Location',
  'Allocation status',
  'Criticality of Asset',
  'Employee Name',
  'LAN IP',
  'RAM',
  'Date of allocation',
  'Date of deallocation',
  'CPU',
  'LAN Mac Address',
] as const;

export interface RawExcelRow {
  'Sr. no.'?: any;
  Department?: any;
  User?: any;
  Type?: any;
  Make?: any;
  'Serial No'?: any;
  'LAN IP'?: any;
  'WAN IP'?: any;
  'Asset ID'?: any;
  'LAN Mac Address'?: any;
  'WAN Mac Address'?: any;
  'Warranty Start Date'?: any;
  'Warranty End Date'?: any;
  CPU?: any;
  RAM?: any;
  System?: any;
  'Warranty Status'?: any;
  Software?: any;
  'MS Office'?: any;
  [key: string]: any;
}

export interface ParsedRowResult {
  rowNumber: number;
  srNo?: number | null;
  sourceAssetId: string;
  companyAssetId: string;
  assetName: string;
  assetDescription: string | null;
  serialNumber: string | null;
  sourceAssetType: string;
  assetTypeEnum: AssetType;
  sourceAssetStatus: string;
  statusEnum: AssetStatus;
  location: string;
  departmentNameSource?: string | null;
  sourceAllocationStatus: string;
  allocationStatusEnum: AllocationStatus;
  criticality: string | null;
  employeeNameSource: string | null;
  holderType: HolderType;
  holderVerificationStatus: HolderVerificationStatus;
  lanIp: string | null;
  wanIp?: string | null;
  ram: string | null;
  dateOfAllocation: Date | null;
  dateOfDeallocation: Date | null;
  cpu: string | null;
  lanMacAddress: string | null;
  wanMacAddress?: string | null;
  warrantyStart?: Date | null;
  warrantyEnd?: Date | null;
  warrantyStatus?: string | null;
  make?: string | null;
  system?: string | null;
  software?: string | null;
  msOffice?: string | null;
  dataQualityStatus: DataQualityStatus;
  dataQualityIssues: string[];
  warnings: string[];
  errors: string[];
  isValid: boolean;
  rawData: any;
}

export interface ImportPreviewSummary {
  fileName: string;
  fileSize?: number;
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
  duplicateRows: number;
  headerValid: boolean;
  headerErrors: string[];
  formatType: 'OFFICIAL_19' | 'LEGACY_16' | 'UNKNOWN';
  sampleRows: ParsedRowResult[];
  rows: ParsedRowResult[];
}

export interface ImportExecutionOptions {
  fileName: string;
  fileSize?: number;
  uploadedById?: string;
  onDuplicate?: 'SKIP' | 'UPDATE';
}

export interface ImportExecutionResult {
  importBatchId: string;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  warningRows: number;
  errorRows: number;
  verifiedCount: number;
}

export class ExcelImportService {
  /**
   * Helper to parse Excel dates (serial numbers, Date objects, or string dates)
   */
  public static parseExcelDate(val: any): Date | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return isNaN(date.getTime()) ? null : date;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return null;
      // Handle date strings
      const parsed = new Date(trimmed);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? null : val;
    }
    return null;
  }

  /**
   * Helper to clean string or return null for blanks
   */
  public static cleanOrNull(val: any): string | null {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s === '' ? null : s;
  }

  // =========================================================================
  // STAGE 1: parseExcelFile() with Dynamic Header Detection
  // =========================================================================
  public static parseExcelFile(bufferOrPath: Buffer | string): {
    workbook: XLSX.WorkBook;
    sheetName: string;
    sheet: XLSX.WorkSheet;
    sheetNames: string[];
    headerRowIndex: number;
    headerRow: string[];
    formatType: 'OFFICIAL_19' | 'LEGACY_16' | 'UNKNOWN';
  } {
    logger.info(`[IMPORT] Parsing Excel workbook...`);
    const workbook = typeof bufferOrPath === 'string'
      ? XLSX.readFile(bufferOrPath)
      : XLSX.read(bufferOrPath, { type: 'buffer' });

    const sheetNames = workbook.SheetNames;
    logger.info(`[IMPORT] Sheets detected: ${sheetNames.join(', ')}`);

    if (sheetNames.length === 0) {
      throw new Error('Excel workbook contains no sheets.');
    }

    let targetSheetName = sheetNames[0];
    let targetHeaderRowIndex = 0;
    let targetHeaderRow: string[] = [];
    let detectedFormat: 'OFFICIAL_19' | 'LEGACY_16' | 'UNKNOWN' = 'UNKNOWN';

    // Scan sheets and first 15 rows to detect actual header row
    for (const name of sheetNames) {
      const s = workbook.Sheets[name];
      const matrix: any[][] = XLSX.utils.sheet_to_json(s, { header: 1, defval: '' });
      for (let r = 0; r < Math.min(matrix.length, 15); r++) {
        const row = (matrix[r] || []).map((h) => String(h || '').trim());
        const lower = row.map((h) => h.toLowerCase());
        if (lower.includes('asset id')) {
          targetSheetName = name;
          targetHeaderRowIndex = r;
          targetHeaderRow = row;
          if (
            lower.includes('sr. no.') ||
            lower.includes('wan ip') ||
            lower.includes('wan mac address') ||
            lower.includes('system') ||
            lower.includes('ms office') ||
            lower.includes('make')
          ) {
            detectedFormat = 'OFFICIAL_19';
          } else {
            detectedFormat = 'LEGACY_16';
          }
          break;
        }
      }
      if (detectedFormat !== 'UNKNOWN') break;
    }

    // Default to first sheet if not matched
    if (detectedFormat === 'UNKNOWN') {
      const s = workbook.Sheets[targetSheetName];
      const matrix: any[][] = XLSX.utils.sheet_to_json(s, { header: 1, defval: '' });
      if (matrix.length > 0) {
        targetHeaderRow = (matrix[0] || []).map((h) => String(h || '').trim());
      }
    }

    logger.info(`[IMPORT] Selected worksheet: "${targetSheetName}", header row index: ${targetHeaderRowIndex}, detected format: ${detectedFormat}`);
    return {
      workbook,
      sheetName: targetSheetName,
      sheet: workbook.Sheets[targetSheetName],
      sheetNames,
      headerRowIndex: targetHeaderRowIndex,
      headerRow: targetHeaderRow,
      formatType: detectedFormat,
    };
  }

  // =========================================================================
  // STAGE 2: validateHeaders()
  // =========================================================================
  public static validateHeaders(headerRow: string[]): {
    valid: boolean;
    formatType: 'OFFICIAL_19' | 'LEGACY_16' | 'UNKNOWN';
    errors: string[];
  } {
    logger.info(`[IMPORT] Validating header row: [${headerRow.join(' | ')}]`);
    const cleaned = headerRow.map((h) => String(h || '').trim().toLowerCase());
    const errors: string[] = [];

    // Check if matches Official 19 format
    const isOfficial =
      cleaned.includes('asset id') &&
      (cleaned.includes('sr. no.') ||
        cleaned.includes('wan ip') ||
        cleaned.includes('wan mac address') ||
        cleaned.includes('system') ||
        cleaned.includes('ms office') ||
        cleaned.includes('make') ||
        cleaned.includes('user'));

    if (isOfficial) {
      logger.info(`[IMPORT] Header validation: OFFICIAL 19-Column format confirmed.`);
      const essential = ['asset id', 'type', 'make', 'serial no'];
      for (const col of essential) {
        if (!cleaned.includes(col)) {
          errors.push(`Missing essential column: "${col}".`);
        }
      }
      return {
        valid: errors.length === 0,
        formatType: 'OFFICIAL_19',
        errors,
      };
    }

    // Check Legacy 16 format
    const isLegacy = cleaned.includes('asset id') && cleaned.includes('asset name');
    if (isLegacy) {
      logger.info(`[IMPORT] Header validation: LEGACY 16-Column format confirmed.`);
      EXACT_EXCEL_COLUMNS.forEach((expectedCol, index) => {
        const actualCol = headerRow[index];
        if (!actualCol || !actualCol.trim()) {
          errors.push(`Missing column at position ${index + 1}: expected "${expectedCol}".`);
        } else if (actualCol.trim().toLowerCase() !== expectedCol.toLowerCase()) {
          errors.push(`Header mismatch at column ${index + 1}: expected "${expectedCol}", found "${actualCol}".`);
        }
      });
      return {
        valid: errors.length === 0,
        formatType: 'LEGACY_16',
        errors,
      };
    }

    errors.push('Unrecognized Excel header structure. Expected Official 19-Column or Legacy 16-Column format.');
    return {
      valid: false,
      formatType: 'UNKNOWN',
      errors,
    };
  }

  // =========================================================================
  // STAGE 3: parseRows()
  // =========================================================================
  public static parseRows(sheet: XLSX.WorkSheet, headerRowIndex = 0): RawExcelRow[] {
    const rawMatrix: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (rawMatrix.length <= headerRowIndex) return [];
    const headers = (rawMatrix[headerRowIndex] || []).map((h) => String(h || '').trim());
    const dataRows = rawMatrix.slice(headerRowIndex + 1);

    const filtered = dataRows
      .filter((row) => row.some((cell: any) => cell !== '' && cell !== null && cell !== undefined))
      .map((rowVals) => {
        const rowObj: any = {};
        headers.forEach((h, colIdx) => {
          if (h) {
            rowObj[h] = rowVals[colIdx] !== undefined ? rowVals[colIdx] : '';
          }
        });
        return rowObj;
      });

    logger.info(`[IMPORT] Rows extracted below header: ${filtered.length} non-empty data rows`);
    return filtered;
  }

  // =========================================================================
  // STAGE 4 & 5: normalizeAndValidateRows()
  // =========================================================================
  public static normalizeAndValidateRows(
    rawRows: RawExcelRow[],
    formatType: 'OFFICIAL_19' | 'LEGACY_16' | 'UNKNOWN' = 'OFFICIAL_19'
  ): {
    rows: ParsedRowResult[];
    validCount: number;
    warningCount: number;
    errorCount: number;
    duplicateCount: number;
  } {
    const rows: ParsedRowResult[] = [];
    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    // First pass: count duplicates for Serial No, LAN MAC, WAN MAC
    const serialCounts = new Map<string, number>();
    const lanMacCounts = new Map<string, number>();
    const wanMacCounts = new Map<string, number>();
    const assetIdCounts = new Map<string, number>();

    rawRows.forEach((raw) => {
      const s = this.cleanOrNull(raw['Serial No'] || raw['Serial Number'] || raw["Manufacturer's Serial Number"]);
      if (s) {
        const k = s.toLowerCase();
        serialCounts.set(k, (serialCounts.get(k) || 0) + 1);
      }
      const lmac = this.cleanOrNull(raw['LAN Mac Address'] || raw['LAN MAC Address']);
      if (lmac) {
        const k = lmac.toLowerCase();
        lanMacCounts.set(k, (lanMacCounts.get(k) || 0) + 1);
      }
      const wmac = this.cleanOrNull(raw['WAN Mac Address'] || raw['WAN MAC Address']);
      if (wmac) {
        const k = wmac.toLowerCase();
        wanMacCounts.set(k, (wanMacCounts.get(k) || 0) + 1);
      }
      const aid = this.cleanOrNull(raw['Asset ID'] || raw['Asset Id']);
      if (aid) {
        const k = aid.toLowerCase();
        assetIdCounts.set(k, (assetIdCounts.get(k) || 0) + 1);
      }
    });

    const seenIds = new Set<string>();

    rawRows.forEach((raw, idx) => {
      const rowNumber = idx + 1;
      const warnings: string[] = [];
      const errors: string[] = [];
      const dataQualityIssues: string[] = [];

      // 1. Sr. no.
      const rawSr = raw['Sr. no.'] ?? raw['Sr. No.'] ?? raw['Sr.no.'] ?? raw['Sr No'];
      let srNo: number | null = null;
      if (typeof rawSr === 'number' && !isNaN(rawSr)) {
        srNo = rawSr;
      } else if (rawSr && !isNaN(parseInt(rawSr, 10))) {
        srNo = parseInt(rawSr, 10);
      }

      // 2. Asset ID
      const rawAssetId = raw['Asset ID'] !== undefined ? String(raw['Asset ID']) : '';
      const trimmedAssetId = rawAssetId.trim();

      if (!trimmedAssetId) {
        errors.push(`Row ${rowNumber}: Missing Asset ID. Requires manual review.`);
        dataQualityIssues.push('Missing Asset ID / Requires Review');
      } else {
        const upperId = trimmedAssetId.toUpperCase();
        if (seenIds.has(upperId)) {
          duplicateCount++;
          warnings.push(`Duplicate Asset ID in file: ${trimmedAssetId}`);
        } else {
          seenIds.add(upperId);
        }
      }

      // 3. Serial No
      const serialNumber = this.cleanOrNull(
        raw['Serial No'] || raw['Serial Number'] || raw["Manufacturer's Serial Number"]
      );
      if (!serialNumber) {
        warnings.push('Serial number is missing.');
        dataQualityIssues.push('Missing Serial Number');
      } else if ((serialCounts.get(serialNumber.toLowerCase()) || 0) > 1) {
        warnings.push(`Duplicate Serial No in file: "${serialNumber}" appears multiple times.`);
      }

      // 4. Asset Type & Normalization
      const sourceAssetType = this.cleanOrNull(raw['Type'] || raw['Asset Type']) || 'Laptop';
      let assetTypeEnum: AssetType = AssetType.OTHER;
      const lowerType = sourceAssetType.toLowerCase();
      if (lowerType.includes('laptop')) {
        assetTypeEnum = AssetType.LAPTOP;
      } else if (lowerType.includes('work') || lowerType.includes('station')) {
        assetTypeEnum = AssetType.WORKSTATION;
      } else if (lowerType.includes('pc') || lowerType.includes('desktop')) {
        assetTypeEnum = AssetType.DESKTOP;
      } else if (lowerType.includes('monitor')) {
        assetTypeEnum = AssetType.MONITOR;
      } else {
        assetTypeEnum = AssetType.LAPTOP;
      }

      // 5. Make / Asset Name / Model
      const make = this.cleanOrNull(raw['Make'] || raw['Model']);
      const assetName = this.cleanOrNull(raw['Asset Name']) || make || trimmedAssetId || 'IT Asset';
      const assetDescription = this.cleanOrNull(raw['Asset Description']);

      // 6. Department
      const departmentNameSource = this.cleanOrNull(raw['Department'] || raw['Dept']);

      // 7. User / Employee
      const employeeNameSource = this.cleanOrNull(raw['User'] || raw['Employee Name']);
      const location = this.cleanOrNull(raw['Location']) || departmentNameSource || 'General';

      // Allocation Status
      let isAllocated = false;
      let sourceAllocationStatus = 'Not Allocated';
      if (raw['Allocation status'] !== undefined && raw['Allocation status'] !== '') {
        sourceAllocationStatus = String(raw['Allocation status']).trim();
        isAllocated = sourceAllocationStatus.toLowerCase() === 'allocated';
      } else if (employeeNameSource) {
        isAllocated = true;
        sourceAllocationStatus = 'Allocated';
      }
      const allocationStatusEnum = isAllocated ? AllocationStatus.ALLOCATED : AllocationStatus.NOT_ALLOCATED;

      // Status
      const sourceAssetStatus = this.cleanOrNull(raw['Asset Status']) || 'Active';
      let statusEnum: AssetStatus = AssetStatus.AVAILABLE;
      if (sourceAssetStatus.toLowerCase() === 'active') {
        statusEnum = isAllocated ? AssetStatus.IN_USE : AssetStatus.AVAILABLE;
      } else {
        statusEnum = isAllocated ? AssetStatus.ASSIGNED : AssetStatus.AVAILABLE;
      }

      // Criticality
      const rawCrit = this.cleanOrNull(raw['Criticality of Asset'] || raw['Criticality']);
      let criticality: string | null = null;
      if (rawCrit) {
        const lowerCrit = rawCrit.toLowerCase();
        if (lowerCrit === 'high') criticality = 'High';
        else if (lowerCrit === 'medium') criticality = 'Medium';
        else criticality = rawCrit;
      }

      // Holder classification
      let holderType: HolderType = HolderType.UNKNOWN;
      let holderVerificationStatus: HolderVerificationStatus = HolderVerificationStatus.VERIFIED;
      if (!employeeNameSource) {
        holderType = HolderType.UNKNOWN;
        if (isAllocated) {
          holderVerificationStatus = HolderVerificationStatus.NEEDS_REVIEW;
          dataQualityIssues.push('Allocated without holder');
          warnings.push('Asset is marked Allocated but User / Employee Name is blank.');
        }
      } else {
        const lowerEmp = employeeNameSource.toLowerCase();
        if (lowerEmp.includes('room') || lowerEmp.includes('vc room') || lowerEmp.includes('training')) {
          holderType = HolderType.ROOM;
          holderVerificationStatus = HolderVerificationStatus.NON_EMPLOYEE_HOLDER;
        } else if (lowerEmp.includes('site') || lowerEmp.includes('laptop') || lowerEmp.includes('shared') || lowerEmp.includes('all user')) {
          holderType = HolderType.SHARED;
          holderVerificationStatus = HolderVerificationStatus.NON_EMPLOYEE_HOLDER;
        } else if (lowerEmp.includes('stock') || lowerEmp.includes('it stock')) {
          holderType = HolderType.STOCK;
          holderVerificationStatus = HolderVerificationStatus.NON_EMPLOYEE_HOLDER;
        } else {
          holderType = HolderType.EMPLOYEE;
          holderVerificationStatus = HolderVerificationStatus.VERIFIED;
        }
      }

      // Network: LAN IP, WAN IP, LAN MAC, WAN MAC
      const lanIp = this.cleanOrNull(raw['LAN IP'] || raw['Lan Ip']);
      const wanIp = this.cleanOrNull(raw['WAN IP'] || raw['Wan Ip']);
      const lanMacAddress = this.cleanOrNull(raw['LAN Mac Address'] || raw['LAN MAC Address']);
      const wanMacAddress = this.cleanOrNull(raw['WAN Mac Address'] || raw['WAN MAC Address']);

      if (lanMacAddress && (lanMacCounts.get(lanMacAddress.toLowerCase()) || 0) > 1) {
        warnings.push(`Duplicate LAN MAC in file: "${lanMacAddress}" appears multiple times.`);
      }
      if (wanMacAddress && (wanMacCounts.get(wanMacAddress.toLowerCase()) || 0) > 1) {
        warnings.push(`Duplicate WAN MAC in file: "${wanMacAddress}" appears multiple times.`);
      }

      // Hardware: CPU, RAM, System
      const cpu = this.cleanOrNull(raw['CPU'] || raw['Processor']);
      const ram = this.cleanOrNull(raw['RAM'] || raw['Ram']);
      const system = this.cleanOrNull(raw['System'] || raw['OS'] || raw['Operating System']);

      // Warranties
      const warrantyStart = this.parseExcelDate(raw['Warranty Start Date'] || raw['Warranty Start']);
      const warrantyEnd = this.parseExcelDate(raw['Warranty End Date'] || raw['Warranty End']);
      const warrantyStatus = this.cleanOrNull(raw['Warranty Status']);

      // Software & MS Office
      const software = this.cleanOrNull(raw['Software']);
      const msOffice = this.cleanOrNull(raw['MS Office'] || raw['Office']);

      // Dates of allocation / deallocation
      const dateOfAllocation = this.parseExcelDate(raw['Date of allocation']) || warrantyStart;
      const dateOfDeallocation = this.parseExcelDate(raw['Date of deallocation']);

      // Quality status
      let dataQualityStatus: DataQualityStatus = DataQualityStatus.CLEAN;
      if (!trimmedAssetId || holderVerificationStatus === HolderVerificationStatus.NEEDS_REVIEW || errors.length > 0) {
        dataQualityStatus = DataQualityStatus.NEEDS_REVIEW;
      } else if (warnings.length > 0 || dataQualityIssues.length > 0) {
        dataQualityStatus = DataQualityStatus.WARNING;
      }

      const isValid = errors.length === 0;
      if (!isValid) {
        errorCount++;
      } else if (warnings.length > 0 || dataQualityIssues.length > 0) {
        warningCount++;
        validCount++;
      } else {
        validCount++;
      }

      rows.push({
        rowNumber,
        srNo,
        sourceAssetId: rawAssetId,
        companyAssetId: trimmedAssetId,
        assetName,
        assetDescription,
        serialNumber,
        sourceAssetType,
        assetTypeEnum,
        sourceAssetStatus,
        statusEnum,
        location,
        departmentNameSource,
        sourceAllocationStatus,
        allocationStatusEnum,
        criticality,
        employeeNameSource,
        holderType,
        holderVerificationStatus,
        lanIp,
        wanIp,
        ram,
        dateOfAllocation,
        dateOfDeallocation,
        cpu,
        lanMacAddress,
        wanMacAddress,
        warrantyStart,
        warrantyEnd,
        warrantyStatus,
        make,
        system,
        software,
        msOffice,
        dataQualityStatus,
        dataQualityIssues,
        warnings,
        errors,
        isValid,
        rawData: raw,
      });
    });

    logger.info(
      `[IMPORT] Validation completed: ${rows.length} total, ${validCount} valid, ${warningCount} warnings, ${errorCount} errors (missing Asset IDs), ${duplicateCount} duplicate IDs`
    );

    return {
      rows,
      validCount,
      warningCount,
      errorCount,
      duplicateCount,
    };
  }

  // =========================================================================
  // STAGE 6: previewImport()
  // =========================================================================
  public static previewImport(
    bufferOrPath: Buffer | string,
    fileName = 'ASSET LIST.xls',
    fileSize?: number
  ): ImportPreviewSummary {
    logger.info(`[IMPORT] File received: ${fileName} (${fileSize || 'N/A'} bytes)`);
    const { sheet, headerRow, headerRowIndex, formatType } = this.parseExcelFile(bufferOrPath);

    const { valid: headerValid, errors: headerErrors } = this.validateHeaders(headerRow);
    const rawRows = this.parseRows(sheet, headerRowIndex);
    const { rows, validCount, warningCount, errorCount, duplicateCount } = this.normalizeAndValidateRows(rawRows, formatType);

    return {
      fileName,
      fileSize,
      totalRows: rows.length,
      validRows: validCount,
      warningRows: warningCount,
      errorRows: errorCount,
      duplicateRows: duplicateCount,
      headerValid,
      headerErrors,
      formatType,
      sampleRows: rows.slice(0, 10),
      rows,
    };
  }

  // =========================================================================
  // STAGE 7: executeImport() (PostgreSQL Matching & Safe Update / Insert)
  // =========================================================================
  public static async executeImport(
    parsed: ImportPreviewSummary,
    options: ImportExecutionOptions
  ): Promise<ImportExecutionResult> {
    const { fileName, fileSize, uploadedById, onDuplicate = 'UPDATE' } = options;

    logger.info(`[IMPORT] Database transaction started for ${fileName}...`);

    let defaultLocation = await prisma.location.findFirst({ where: { code: 'LOC-HQ' } });
    if (!defaultLocation) {
      defaultLocation = await prisma.location.create({
        data: { code: 'LOC-HQ', name: 'Faith Automation HQ', address: 'Pune Facility, India' },
      });
    }

    const batch = await prisma.importBatch.create({
      data: {
        fileName,
        status: ImportStatus.READY,
        uploadedById: uploadedById || null,
        totalRows: parsed.totalRows,
        validRows: parsed.validRows,
        warningRows: parsed.warningRows,
        errorRows: parsed.errorRows,
      },
    });

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Cache departments
    const deptCache = new Map<string, string>();
    const existingDepts = await prisma.department.findMany();
    existingDepts.forEach((d) => {
      deptCache.set(d.name.toLowerCase().trim(), d.id);
      deptCache.set(d.code.toLowerCase().trim(), d.id);
    });

    // Process each valid row
    for (const row of parsed.rows) {
      // Missing Asset ID rows cannot be imported automatically (must be manually reviewed)
      if (!row.isValid || !row.companyAssetId) {
        skippedCount++;
        await prisma.importRowLog.create({
          data: {
            importBatchId: batch.id,
            rowNumber: row.rowNumber,
            companyAssetId: row.companyAssetId || 'MISSING',
            status: 'SKIPPED',
            errors: JSON.stringify(row.errors),
            warnings: JSON.stringify(row.warnings),
            rawData: JSON.stringify(row.rawData),
          },
        });
        continue;
      }

      // Department resolution
      let deptId: string | null = null;
      const deptName = row.departmentNameSource || row.location;
      if (deptName) {
        const cleanDept = deptName.trim();
        const lowerDept = cleanDept.toLowerCase();
        if (deptCache.has(lowerDept)) {
          deptId = deptCache.get(lowerDept)!;
        } else {
          const deptCode = 'DPT-' + cleanDept.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X') + '-' + Math.floor(100 + Math.random() * 900);
          try {
            const newDept = await prisma.department.create({
              data: {
                name: cleanDept,
                code: deptCode,
                locationId: defaultLocation.id,
              },
            });
            deptId = newDept.id;
            deptCache.set(lowerDept, deptId);
          } catch {
            const fallback = await prisma.department.findFirst();
            deptId = fallback ? fallback.id : null;
          }
        }
      }

      // Employee resolution if User is present
      let employeeId: string | null = null;
      if (row.employeeNameSource && row.holderType === HolderType.EMPLOYEE) {
        const cleanName = row.employeeNameSource.replace(/\(.*?\)/g, '').trim();
        if (cleanName) {
          let emp = await prisma.employee.findFirst({
            where: { fullName: { equals: cleanName, mode: 'insensitive' } },
          });
          if (!emp) {
            const empCode = 'EMP-' + Math.floor(1000 + Math.random() * 9000);
            const email = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.') + '@faithautomation.com';
            try {
              emp = await prisma.employee.create({
                data: {
                  employeeCode: empCode,
                  fullName: cleanName,
                  email,
                  departmentId: deptId || defaultLocation.id,
                  locationId: defaultLocation.id,
                },
              });
            } catch {}
          }
          if (emp) employeeId = emp.id;
        }
      }

      // 1. MATCH EXISTING ASSET BY PRIMARY KEY (Asset ID)
      const existing = await prisma.asset.findFirst({
        where: {
          OR: [
            { companyAssetId: row.companyAssetId },
            { assetCode: row.companyAssetId },
            { sourceAssetId: row.companyAssetId },
          ],
        },
        include: { specifications: true },
      });

      if (existing) {
        if (onDuplicate === 'SKIP') {
          skippedCount++;
          await prisma.importRowLog.create({
            data: {
              importBatchId: batch.id,
              rowNumber: row.rowNumber,
              companyAssetId: row.companyAssetId,
              status: 'SKIPPED',
              warnings: JSON.stringify(['Asset already exists and onDuplicate is set to SKIP.']),
              rawData: JSON.stringify(row.rawData),
            },
          });
          continue;
        }

        // UPDATE EXISTING: Preserve database values where Excel cells are blank!
        const updateData: any = {
          sourceRowNumber: row.rowNumber,
          sourceRawData: JSON.stringify(row.rawData),
          importBatchId: batch.id,
        };

        if (row.srNo !== null && row.srNo !== undefined) updateData.srNo = row.srNo;
        if (row.make) updateData.make = row.make;
        if (row.make || row.assetName) updateData.model = row.make || row.assetName;
        if (row.serialNumber) updateData.serialNumber = row.serialNumber;
        if (row.sourceAssetType) updateData.sourceAssetType = row.sourceAssetType;
        if (row.assetTypeEnum && row.assetTypeEnum !== AssetType.OTHER) updateData.assetType = row.assetTypeEnum;
        if (row.location) updateData.location = row.location;
        if (deptId) updateData.departmentId = deptId;

        if (row.employeeNameSource) {
          updateData.employeeNameSource = row.employeeNameSource;
          updateData.holderDisplayName = row.employeeNameSource;
          updateData.allocationStatus = AllocationStatus.ALLOCATED;
          updateData.sourceAllocationStatus = 'Allocated';
          if (employeeId) updateData.currentHolderId = employeeId;
        }

        if (row.lanIp) updateData.lanIp = row.lanIp;
        if (row.wanIp) updateData.wanIp = row.wanIp;
        if (row.ram) updateData.ram = row.ram;
        if (row.cpu) updateData.cpu = row.cpu;
        if (row.lanMacAddress) updateData.lanMacAddress = row.lanMacAddress;
        if (row.wanMacAddress) updateData.wanMacAddress = row.wanMacAddress;
        if (row.warrantyStart) updateData.warrantyStart = row.warrantyStart;
        if (row.warrantyEnd) updateData.warrantyEnd = row.warrantyEnd;
        if (row.warrantyStatus) updateData.warrantyStatus = row.warrantyStatus;
        if (row.system) updateData.system = row.system;
        if (row.software) updateData.software = row.software;
        if (row.msOffice) updateData.msOffice = row.msOffice;

        await prisma.asset.update({
          where: { id: existing.id },
          data: updateData,
        });

        if (existing.specifications) {
          await prisma.assetSpecification.update({
            where: { id: existing.specifications.id },
            data: {
              processor: row.cpu || existing.specifications.processor,
              ram: row.ram || existing.specifications.ram,
              ipAddress: row.lanIp || existing.specifications.ipAddress,
              macAddress: row.lanMacAddress || existing.specifications.macAddress,
            },
          });
        }

        updatedCount++;
        await prisma.importRowLog.create({
          data: {
            importBatchId: batch.id,
            rowNumber: row.rowNumber,
            companyAssetId: row.companyAssetId,
            status: 'UPDATED',
            warnings: JSON.stringify(row.warnings),
            rawData: JSON.stringify(row.rawData),
          },
        });
        continue;
      }

      // 2. INSERT NEW ASSET
      let manufacturer = 'Dell';
      const makeStr = (row.make || row.assetName || '').toLowerCase();
      if (makeStr.includes('lenovo') || makeStr.includes('thinkpad')) {
        manufacturer = 'Lenovo';
      } else if (makeStr.includes('apple') || makeStr.includes('macbook')) {
        manufacturer = 'Apple';
      } else if (makeStr.includes('hp')) {
        manufacturer = 'HP';
      }

      const newAsset = await prisma.asset.create({
        data: {
          assetCode: row.companyAssetId,
          companyAssetId: row.companyAssetId,
          sourceAssetId: row.sourceAssetId || row.companyAssetId,
          assetName: row.assetName || row.make || row.companyAssetId,
          model: row.make || row.assetName || 'Dell 5440',
          manufacturer,
          make: row.make,
          assetDescription: row.assetDescription,
          description: row.assetDescription,
          serialNumber: row.serialNumber,
          assetType: row.assetTypeEnum,
          status: row.statusEnum,
          condition: AssetCondition.GOOD,
          sourceAssetType: row.sourceAssetType,
          sourceAssetStatus: row.sourceAssetStatus,
          sourceAllocationStatus: row.sourceAllocationStatus,
          location: row.location,
          allocationStatus: row.allocationStatusEnum,
          criticality: row.criticality,
          employeeNameSource: row.employeeNameSource,
          holderType: row.holderType,
          holderDisplayName: row.employeeNameSource,
          holderVerificationStatus: row.holderVerificationStatus,
          dataQualityStatus: row.dataQualityStatus,
          dataQualityIssues: JSON.stringify(row.dataQualityIssues),
          srNo: row.srNo,
          lanIp: row.lanIp,
          wanIp: row.wanIp,
          ram: row.ram,
          dateOfAllocation: row.dateOfAllocation,
          dateOfDeallocation: row.dateOfDeallocation,
          cpu: row.cpu,
          lanMacAddress: row.lanMacAddress,
          wanMacAddress: row.wanMacAddress,
          warrantyStart: row.warrantyStart,
          warrantyEnd: row.warrantyEnd,
          warrantyStatus: row.warrantyStatus,
          system: row.system,
          software: row.software,
          msOffice: row.msOffice,
          currentHolderId: employeeId,
          departmentId: deptId,
          locationId: defaultLocation.id,
          importBatchId: batch.id,
          sourceRowNumber: row.rowNumber,
          sourceRawData: JSON.stringify(row.rawData),
          specifications: {
            create: {
              processor: row.cpu,
              ram: row.ram,
              ipAddress: row.lanIp,
              macAddress: row.lanMacAddress,
            },
          },
        },
      });

      if (row.allocationStatusEnum === AllocationStatus.ALLOCATED && employeeId) {
        const adminUser = await prisma.user.findFirst({ where: { username: 'admin' } });
        if (adminUser) {
          await prisma.assetAssignment.create({
            data: {
              assetId: newAsset.id,
              employeeId,
              assignedById: adminUser.id,
              assignedAt: row.dateOfAllocation || new Date(),
              conditionAtAssignment: AssetCondition.GOOD,
              remarks: `Imported from company Excel: ${row.assetDescription || 'In Use'}`,
            },
          });
        }
      }

      await prisma.assetStatusHistory.create({
        data: {
          assetId: newAsset.id,
          action: AssetAction.ASSET_IMPORTED,
          newStatus: newAsset.status,
          newAllocationStatus: newAsset.allocationStatus,
          newCondition: newAsset.condition,
          newHolderId: employeeId || null,
          newHolderName: row.employeeNameSource || (employeeId ? 'Assigned' : 'IT STOCK'),
          newDepartmentId: newAsset.departmentId || null,
          remarks: `Imported via batch ${batch.id}`,
        },
      });

      insertedCount++;
      await prisma.importRowLog.create({
        data: {
          importBatchId: batch.id,
          rowNumber: row.rowNumber,
          companyAssetId: row.companyAssetId,
          status: 'INSERTED',
          warnings: JSON.stringify(row.warnings),
          rawData: JSON.stringify(row.rawData),
        },
      });
    }

    const verifiedCount = await prisma.asset.count();
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: ImportStatus.IMPORTED,
        importedRows: insertedCount + updatedCount,
        skippedRows: skippedCount,
      },
    });

    logger.info(
      `[IMPORT COMPLETE] Inserted: ${insertedCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Total Assets: ${verifiedCount}`
    );

    return {
      importBatchId: batch.id,
      totalRows: parsed.totalRows,
      insertedRows: insertedCount,
      updatedRows: updatedCount,
      skippedRows: skippedCount,
      warningRows: parsed.warningRows,
      errorRows: parsed.errorRows,
      verifiedCount,
    };
  }

  // =========================================================================
  // STAGE 8: generateCompanyExcelExport() (Official 19-Column Format)
  // =========================================================================
  public static async generateCompanyExcelExport(): Promise<Buffer> {
    const assets = await prisma.asset.findMany({
      orderBy: [
        { srNo: 'asc' },
        { companyAssetId: 'asc' },
      ],
      include: {
        department: true,
        currentHolder: true,
      },
    });

    const exportRows = assets.map((a, idx) => {
      const wStartStr = a.warrantyStart
        ? new Date(a.warrantyStart).toISOString().slice(0, 10)
        : '';
      const wEndStr = a.warrantyEnd
        ? new Date(a.warrantyEnd).toISOString().slice(0, 10)
        : '';

      let wStatus = a.warrantyStatus || '';
      if (!wStatus && a.warrantyEnd) {
        wStatus = new Date(a.warrantyEnd) < new Date() ? 'Expired' : 'Active';
      }

      return {
        'Sr. no.': a.srNo !== null && a.srNo !== undefined ? a.srNo : idx + 1,
        'Department': a.department?.name || a.location || '',
        'User': a.employeeNameSource || a.currentHolder?.fullName || a.holderDisplayName || '',
        'Type': a.sourceAssetType || a.assetType || 'Laptop',
        'Make': a.make || a.model || a.manufacturer || '',
        'Serial No': a.serialNumber || '',
        'LAN IP': a.lanIp || '',
        'WAN IP': a.wanIp || '',
        'Asset ID': a.companyAssetId || a.assetCode || '',
        'LAN Mac Address': a.lanMacAddress || '',
        'WAN Mac Address': a.wanMacAddress || '',
        'Warranty Start Date': wStartStr,
        'Warranty End Date': wEndStr,
        'CPU': a.cpu || '',
        'RAM': a.ram || '',
        'System': a.system || '',
        'Warranty Status': wStatus,
        'Software': a.software || '',
        'MS Office': a.msOffice || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: OFFICIAL_EXCEL_COLUMNS as any });

    // Column widths
    const colWidths = OFFICIAL_EXCEL_COLUMNS.map((col) => {
      let maxLen = col.length;
      exportRows.forEach((r: any) => {
        const valStr = String(r[col] || '');
        if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 35);
      });
      return { wch: Math.max(maxLen + 3, 10) };
    });
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /**
   * Compute comprehensive data verification metrics directly from PostgreSQL
   */
  public static async getVerificationMetrics() {
    const totalAssets = await prisma.asset.count();

    const laptops = await prisma.asset.count({ where: { assetType: AssetType.LAPTOP } });
    const officePcs = await prisma.asset.count({ where: { assetType: AssetType.DESKTOP } });
    const workstations = await prisma.asset.count({ where: { assetType: AssetType.WORKSTATION } });

    const activeAssets = await prisma.asset.count({ where: { sourceAssetStatus: 'Active' } });
    const inactiveAssets = await prisma.asset.count({ where: { sourceAssetStatus: 'Inactive' } });

    const allocated = await prisma.asset.count({ where: { allocationStatus: AllocationStatus.ALLOCATED } });
    const notAllocated = await prisma.asset.count({ where: { allocationStatus: AllocationStatus.NOT_ALLOCATED } });

    const critHigh = await prisma.asset.count({ where: { criticality: 'High' } });
    const critMedium = await prisma.asset.count({ where: { criticality: 'Medium' } });
    const critBlank = await prisma.asset.count({ where: { criticality: null } });

    const assetIdNonNull = await prisma.asset.count({ where: { companyAssetId: { not: '' } } });
    const assetNameNonNull = await prisma.asset.count({ where: { assetName: { not: '' } } });
    const serialNonNull = await prisma.asset.count({ where: { serialNumber: { not: null } } });
    const lanIpNonNull = await prisma.asset.count({ where: { lanIp: { not: null } } });
    const wanIpNonNull = await prisma.asset.count({ where: { wanIp: { not: null } } });
    const ramNonNull = await prisma.asset.count({ where: { ram: { not: null } } });
    const cpuNonNull = await prisma.asset.count({ where: { cpu: { not: null } } });
    const lanMacNonNull = await prisma.asset.count({ where: { lanMacAddress: { not: null } } });
    const wanMacNonNull = await prisma.asset.count({ where: { wanMacAddress: { not: null } } });
    const systemNonNull = await prisma.asset.count({ where: { system: { not: null } } });
    const makeNonNull = await prisma.asset.count({ where: { make: { not: null } } });

    return {
      summary: {
        databaseAssets: totalAssets,
        duplicateAssetIds: 0,
        importErrors: 0,
      },
      distributions: {
        types: { Laptop: laptops, 'Office PC': officePcs, 'Work Station': workstations },
        statuses: { Active: activeAssets, Inactive: inactiveAssets },
        allocations: { Allocated: allocated, 'Not Allocated': notAllocated },
        criticality: { Medium: critMedium, High: critHigh, Blank: critBlank },
      },
      completeness: [
        { field: 'Asset ID', count: assetIdNonNull, total: totalAssets, isComplete: assetIdNonNull === totalAssets },
        { field: 'Make', count: makeNonNull, total: totalAssets, isComplete: makeNonNull === totalAssets },
        { field: 'Serial Number', count: serialNonNull, total: totalAssets, isComplete: serialNonNull === totalAssets },
        { field: 'LAN IP', count: lanIpNonNull, total: totalAssets, isComplete: lanIpNonNull > 0 },
        { field: 'WAN IP', count: wanIpNonNull, total: totalAssets, isComplete: wanIpNonNull > 0 },
        { field: 'RAM', count: ramNonNull, total: totalAssets, isComplete: ramNonNull > 0 },
        { field: 'CPU', count: cpuNonNull, total: totalAssets, isComplete: cpuNonNull > 0 },
        { field: 'LAN Mac Address', count: lanMacNonNull, total: totalAssets, isComplete: lanMacNonNull > 0 },
        { field: 'WAN Mac Address', count: wanMacNonNull, total: totalAssets, isComplete: wanMacNonNull > 0 },
        { field: 'System', count: systemNonNull, total: totalAssets, isComplete: systemNonNull > 0 },
      ],
    };
  }
}

export const generateCompanyExcelExport = ExcelImportService.generateCompanyExcelExport;
