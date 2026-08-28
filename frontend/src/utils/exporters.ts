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
  const filename = `FAITH_ITAM_${moduleName}_${dateStr}`;
  exportToExcel(records, filename, moduleName);
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

// Deprecated CSV exporter retained only for backwards compatibility with any non-report legacy imports
export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;
  const keys = Object.keys(data[0]);
  const csvRows = [];
  csvRows.push(keys.join(','));

  for (const row of data) {
    const values = keys.map((key) => {
      const val = row[key];
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
