import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Universal Excel Exporter for FAITH ITAM
 * Produces valid .xlsx files with auto-calculated column widths and clean data formatting.
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Inventory') => {
  if (!data || !data.length) {
    throw new Error('No data available to export.');
  }

  // Create clean worksheet from data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Compute adaptive column widths based on maximum cell length
  const keys = Object.keys(data[0] || {});
  const colWidths = keys.map((key) => {
    let maxLen = key.length;
    for (let i = 0; i < Math.min(data.length, 100); i++) {
      const val = data[i]?.[key];
      const strVal = val !== null && val !== undefined ? String(val) : '';
      if (strVal.length > maxLen) {
        maxLen = Math.min(strVal.length, 45);
      }
    }
    return { wch: Math.max(maxLen + 3, 10) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  // Write file with .xlsx extension
  const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeFilename);
};

/**
 * Universal Helper: Export module records to Excel with standard enterprise naming
 */
export const exportModuleToExcel = (records: any[], moduleName: string) => {
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `FAITH_Automation_${moduleName}_${dateStr}`;
  exportToExcel(records, filename, moduleName);
};

/**
 * 16-Column Official Company Asset Inventory Excel Exporter
 */
export const exportAssetsToCompanyExcel = (assets: any[], customFilename?: string) => {
  if (!assets || assets.length === 0) {
    throw new Error('No assets available to export.');
  }

  const rows = assets.map((a) => {
    const area = a.location || a.department?.name || a.locationRel?.name || '';
    const allocStatus =
      a.sourceAllocationStatus ||
      (a.allocationStatus === 'ALLOCATED' ? 'Allocated' : 'Not Allocated');
    const holder = a.employeeNameSource || a.currentHolder?.fullName || a.holderDisplayName || '';
    const ip = a.lanIp || a.specifications?.ipAddress || '';
    const ram = a.ram || a.specifications?.ram || '';
    const cpu = a.cpu || a.specifications?.processor || '';
    const mac = a.lanMacAddress || a.specifications?.macAddress || '';

    const allocDate = a.dateOfAllocation
      ? new Date(a.dateOfAllocation).toISOString().slice(0, 10)
      : '';
    const deallocDate = a.dateOfDeallocation
      ? new Date(a.dateOfDeallocation).toISOString().slice(0, 10)
      : '';

    return {
      'Asset ID': a.companyAssetId || a.assetCode || '',
      'Asset Name': a.assetName || a.model || '',
      'Asset Description': a.assetDescription || a.description || '',
      "Manufacturer's Serial Number": a.serialNumber || '',
      'Asset Type': a.sourceAssetType || a.assetType || '',
      'Asset Status': a.sourceAssetStatus || a.status || '',
      Location: area,
      'Allocation status': allocStatus,
      'Criticality of Asset': a.criticality || '',
      'Employee Name': holder,
      'LAN IP': ip,
      RAM: ram,
      'Date of allocation': allocDate,
      'Date of deallocation': deallocDate,
      CPU: cpu,
      'LAN Mac Address': mac,
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_Automation_IT_Inventory_${dateStr}`;
  exportToExcel(rows, filename, 'IT Assets');
};

/**
 * Export to PDF
 */
export const exportToPDF = (title: string, headers: string[], rows: any[][], filename: string) => {
  const doc = new jsPDF('landscape');
  doc.setFontSize(14);
  doc.text(`Faith Automation IT Inventory - ${title}`, 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 21);

  (doc as any).autoTable({
    head: [headers],
    body: rows,
    startY: 26,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(safeFilename);
};

