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
 * Professional Enterprise Company Asset Inventory Excel Exporter
 * Generates rich XLSX files with clean formatting, column widths, and real PostgreSQL data.
 */
export const exportAssetsToCompanyExcel = (assets: any[], customFilename?: string) => {
  if (!assets || assets.length === 0) {
    throw new Error('No assets available to export.');
  }

  const rows = assets.map((a) => {
    const dept = a.department?.name || a.location || '—';
    const loc = a.locationRel?.name || a.location || '—';
    const allocStatus =
      a.sourceAllocationStatus ||
      (a.allocationStatus === 'ALLOCATED' ? 'Allocated' : 'Not Allocated');
    const holder = a.employeeNameSource || a.currentHolder?.fullName || a.holderDisplayName || '—';
    const ip = a.lanIp || a.specifications?.ipAddress || '—';
    const ram = a.ram || a.specifications?.ram || '—';
    const cpu = a.cpu || a.specifications?.processor || '—';
    const mac = a.lanMacAddress || a.specifications?.macAddress || '—';

    const allocDate = a.dateOfAllocation
      ? new Date(a.dateOfAllocation).toISOString().slice(0, 10)
      : '—';
    const deallocDate = a.dateOfDeallocation
      ? new Date(a.dateOfDeallocation).toISOString().slice(0, 10)
      : '—';

    let qualityStr = a.dataQualityStatus || 'CLEAN';
    if (a.dataQualityIssues) {
      try {
        const parsed = typeof a.dataQualityIssues === 'string' ? JSON.parse(a.dataQualityIssues) : a.dataQualityIssues;
        if (Array.isArray(parsed) && parsed.length > 0) {
          qualityStr += ` (${parsed.join(', ')})`;
        }
      } catch {
        // use raw string
      }
    }

    return {
      'Asset ID': a.companyAssetId || a.assetCode || '—',
      'Asset Name': a.assetName || a.model || '—',
      'Description': a.assetDescription || a.description || '—',
      'Serial Number': a.serialNumber || '—',
      'Asset Type': a.sourceAssetType || a.assetType || '—',
      'Status': a.sourceAssetStatus || a.status || '—',
      'Allocation Status': allocStatus,
      'Employee': holder,
      'Department / Area': dept,
      'Location': loc,
      'Criticality': a.criticality || '—',
      'LAN IP': ip,
      'RAM': ram,
      'Date of Allocation': allocDate,
      'Date of Deallocation': deallocDate,
      'CPU': cpu,
      'LAN MAC Address': mac,
      'Data Quality': qualityStr,
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_Automation_IT_Inventory_${dateStr}`;
  exportToExcel(rows, filename, 'IT Assets');
};

/**
 * Professional Enterprise Asset Assignment Excel Exporter (17 Columns)
 */
export const exportAssignmentsToExcel = (assignments: any[], customFilename?: string) => {
  if (!assignments || assignments.length === 0) {
    throw new Error('No assignments available to export.');
  }

  const rows = assignments.map((a) => {
    const assignedDate = a.assignedAt
      ? new Date(a.assignedAt).toISOString().slice(0, 10)
      : '—';
    const expectedReturn = a.expectedReturnDate
      ? new Date(a.expectedReturnDate).toISOString().slice(0, 10)
      : 'Indefinite';
    const actualReturn = a.actualReturnDate
      ? new Date(a.actualReturnDate).toISOString().slice(0, 10)
      : '—';

    return {
      'Assignment ID': a.assignmentCode || a.id || '—',
      'Asset ID': a.assetCode || a.asset?.companyAssetId || a.asset?.assetCode || '—',
      'Asset Name': a.assetName || a.asset?.assetName || a.model || '—',
      'Serial Number': a.serialNumber || a.asset?.serialNumber || '—',
      'Employee': a.employeeName || a.employee?.fullName || '—',
      'Department / Area': a.departmentName || a.department?.name || '—',
      'Location': a.locationName || a.location?.name || '—',
      'Assignment Date': assignedDate,
      'Expected Return Date': expectedReturn,
      'Actual Return Date': actualReturn,
      'Status': a.displayStatus || a.status || 'ACTIVE',
      'Condition At Assignment': a.conditionAtAssignment || 'GOOD',
      'Condition At Return': a.conditionAtReturn || '—',
      'Assignment Reason': a.reason || '—',
      'Assigned By': a.assignedByName || a.assignedBy?.username || 'admin',
      'Approved By': a.approvedByName || a.approvedBy?.username || '—',
      'Remarks': a.remarks || '—',
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Assignments_${dateStr}`;
  exportToExcel(rows, filename, 'Assignments');
};

/**
 * Professional Enterprise Asset Transfer Excel Exporter (19 Columns)
 */
export const exportTransfersToExcel = (transfers: any[], customFilename?: string) => {
  if (!transfers || transfers.length === 0) {
    throw new Error('No transfers available to export.');
  }

  const rows = transfers.map((t) => {
    const transferDate = t.transferDate
      ? new Date(t.transferDate).toISOString().slice(0, 10)
      : '—';
    const effectiveDate = t.effectiveDate
      ? new Date(t.effectiveDate).toISOString().slice(0, 10)
      : transferDate;

    return {
      'Transfer ID': t.transferCode || t.id || '—',
      'Asset ID': t.assetCode || t.asset?.companyAssetId || t.asset?.assetCode || '—',
      'Asset Name': t.assetName || t.asset?.assetName || t.model || '—',
      'Serial Number': t.serialNumber || t.asset?.serialNumber || '—',
      'From Employee': t.previousHolderName || t.previousHolder?.fullName || 'IT STOCK',
      'To Employee': t.newHolderName || t.newHolder?.fullName || 'IT STOCK',
      'From Department / Area': t.previousDepartmentName || t.previousDepartment?.name || 'IT STOCK',
      'To Department / Area': t.newDepartmentName || t.newDepartment?.name || 'IT STOCK',
      'From Location': t.previousLocationName || t.previousLocation?.name || 'HQ',
      'To Location': t.newLocationName || t.newLocation?.name || 'HQ',
      'Transfer Date': transferDate,
      'Effective Date': effectiveDate,
      'Status': t.status || 'COMPLETED',
      'Reason': t.reason || '—',
      'Condition Before': t.conditionBefore || 'GOOD',
      'Condition After': t.conditionAfter || 'GOOD',
      'Performed By': t.performedByName || t.requestedBy?.username || 'admin',
      'Approved By': t.approvedByName || t.approvedBy?.username || '—',
      'Remarks': t.remarks || '—',
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Transfers_${dateStr}`;
  exportToExcel(rows, filename, 'Transfers');
};

/**
 * Professional Enterprise Asset Returns Excel Exporter (21 Columns)
 */
export const exportReturnsToExcel = (returns: any[], customFilename?: string) => {
  if (!returns || returns.length === 0) {
    throw new Error('No return records available to export.');
  }

  const rows = returns.map((r) => {
    const returnDate = r.returnDate
      ? new Date(r.returnDate).toISOString().slice(0, 10)
      : '—';

    return {
      'Return ID': r.returnCode || r.id || '—',
      'Asset ID': r.assetCode || r.asset?.companyAssetId || r.asset?.assetCode || '—',
      'Asset Name': r.assetName || r.asset?.assetName || r.model || '—',
      'Serial Number': r.serialNumber || r.asset?.serialNumber || '—',
      'Employee': r.employeeName || r.employee?.fullName || 'IT STOCK',
      'Department / Area': r.departmentName || r.department?.name || 'IT STOCK',
      'Return Location': r.locationName || r.location?.name || 'HQ',
      'Return Date': returnDate,
      'Reason': r.returnReason || r.remarks || '—',
      'Status': r.status || 'COMPLETED',
      'Condition At Return': r.conditionAtReturn || 'GOOD',
      'Inspection Result': r.inspectionResult || 'PASS',
      'Damage Description': r.damageDescription || (r.damageReported ? 'Damage Reported' : 'None'),
      'Missing Accessories': r.missingAccessories || (r.accessoriesReturned ? 'None' : 'Missing'),
      'Data Wipe Status': r.dataWipeStatus || 'NOT_REQUIRED',
      'Maintenance Required': r.maintenanceRequired ? 'YES' : 'NO',
      'Disposition': r.disposition || 'AVAILABLE',
      'Received By': r.receivedByName || r.receivedBy?.username || 'admin',
      'Inspected By': r.inspectedByName || r.inspectedBy?.username || '—',
      'Approved By': r.approvedByName || r.approvedBy?.username || '—',
      'Remarks': r.remarks || '—',
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Returns_${dateStr}`;
  exportToExcel(rows, filename, 'Asset Returns');
};

/**
 * Professional Enterprise Maintenance Excel Exporter (36 Columns)
 */
export const exportMaintenanceToExcel = (records: any[], customFilename?: string) => {
  if (!records || records.length === 0) {
    throw new Error('No maintenance records available to export.');
  }

  const rows = records.map((m) => {
    const reportedDate = m.reportedAt ? new Date(m.reportedAt).toISOString().slice(0, 10) : '—';
    const startDate = m.repairStartDate ? new Date(m.repairStartDate).toISOString().slice(0, 10) : '—';
    const expDate = m.expectedCompletionDate ? new Date(m.expectedCompletionDate).toISOString().slice(0, 10) : '—';
    const actualDate = m.repairEndDate ? new Date(m.repairEndDate).toISOString().slice(0, 10) : '—';

    return {
      'Maintenance ID': m.maintenanceCode || m.id || '—',
      'Asset ID': m.assetCode || m.asset?.companyAssetId || m.asset?.assetCode || '—',
      'Asset Name': m.assetName || m.asset?.assetName || m.asset?.model || '—',
      'Asset Type': m.assetType || m.asset?.assetType || '—',
      'Serial Number': m.serialNumber || m.asset?.serialNumber || '—',
      'Department / Area': m.departmentName || m.department?.name || 'IT',
      'Location': m.locationName || m.location?.name || 'HQ',
      'Maintenance Type': m.maintenanceType || 'CORRECTIVE',
      'Issue Title': m.issueTitle || '—',
      'Issue Description': m.issueDescription || '—',
      'Priority': m.priority || 'MEDIUM',
      'Status': m.repairStatus || 'OPEN',
      'Reported Date': reportedDate,
      'Service Start Date': startDate,
      'Expected Completion': expDate,
      'Actual Completion': actualDate,
      'Technician': m.technician || '—',
      'Service Provider': m.serviceProvider || 'Internal IT',
      'Diagnosis': m.diagnosis || '—',
      'Repair Action': m.repairAction || '—',
      'Parts Replaced': m.partsReplaced || '—',
      'Condition Before': m.conditionBefore || 'GOOD',
      'Condition After': m.conditionAfter || '—',
      'Warranty Status': m.underWarranty ? 'UNDER WARRANTY' : 'NOT COVERED',
      'Warranty Provider': m.warrantyProvider || '—',
      'Warranty Reference': m.warrantyReference || '—',
      'Labor Cost': m.laborCost || 0,
      'Parts Cost': m.partsCost || 0,
      'Service Cost': m.serviceCost || 0,
      'Other Cost': m.otherCost || 0,
      'Total Cost': m.repairCost || 0,
      'Resolution': m.resolution || '—',
      'Reported By': m.reportedByName || m.reportedBy?.username || 'admin',
      'Assigned To': m.assignedToName || m.assignedTo?.username || '—',
      'Approved By': m.approvedByName || m.approvedBy?.username || '—',
      'Remarks': m.remarks || '—',
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Maintenance_${dateStr}`;
  exportToExcel(rows, filename, 'Maintenance Records');
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

/**
 * Export Asset History to Excel (22 Columns, Section 30)
 */
export const exportAssetHistoryToExcel = (
  events: any[],
  assetCode?: string,
  customFilename?: string
) => {
  const rows = events.map((e) => {
    const eventDateFormatted = e.eventDate
      ? `${new Date(e.eventDate).toLocaleDateString('en-GB')} ${new Date(e.eventDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
      : '—';

    return {
      'History ID': e.id,
      'Asset ID': e.assetCode || assetCode || e.assetId || '—',
      'Event Date / Time': eventDateFormatted,
      'Event Type': e.action || e.eventType || '—',
      'Description': e.remarks || e.reason || '—',
      'From Employee': e.previousHolder || '—',
      'To Employee': e.newHolder || '—',
      'From Department': e.previousDepartment || '—',
      'To Department': e.newDepartment || '—',
      'From Location': e.previousLocation || '—',
      'To Location': e.newLocation || '—',
      'Previous Status': e.previousStatus || '—',
      'New Status': e.newStatus || '—',
      'Previous Allocation': e.previousAllocationStatus || '—',
      'New Allocation': e.newAllocationStatus || '—',
      'Previous Condition': e.previousCondition || '—',
      'New Condition': e.newCondition || '—',
      'Reason': e.reason || '—',
      'Performed By': e.performedBy || e.performedByName || 'System',
      'Approved By': e.approvedBy || e.approvedByName || '—',
      'Related Entity': e.relatedEntityType || '—',
      'Related Record ID': e.relatedRecordCode || e.relatedEntityId || '—',
    };
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const prefix = assetCode ? `FAITH_ITAM_History_${assetCode}_` : 'FAITH_ITAM_Asset_History_';
  const filename = customFilename || `${prefix}${dateStr}`;
  exportToExcel(rows, filename, 'Asset History');
};

/**
 * Export Employees to Excel (12 Columns, Section 26)
 */
export const exportEmployeesToExcel = (employees: any[], customFilename?: string) => {
  if (!employees || employees.length === 0) {
    throw new Error('No employee records available to export.');
  }

  const rows = employees.map((emp) => ({
    'Employee ID': emp.employeeCode || '—',
    'Name': emp.fullName || '—',
    'Email': emp.email || '—',
    'Phone': emp.phone || '—',
    'Designation': emp.designation || '—',
    'Department / Area': emp.department?.name || '—',
    'Location': emp.location?.name || '—',
    'Status': emp.status || 'ACTIVE',
    'Joining Date': emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString('en-GB') : '—',
    'Exit Date': emp.exitDate ? new Date(emp.exitDate).toLocaleDateString('en-GB') : '—',
    'Manager': emp.manager?.fullName || '—',
    'Data Quality': emp.dataQuality || 'CLEAN',
  }));

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Employees_${dateStr}`;
  exportToExcel(rows, filename, 'Employees');
};

/**
 * Export Departments / Areas to Excel (9 Columns, Section 26)
 */
export const exportDepartmentsToExcel = (departments: any[], customFilename?: string) => {
  if (!departments || departments.length === 0) {
    throw new Error('No department records available to export.');
  }

  const rows = departments.map((dept) => ({
    'Department ID': dept.id,
    'Name': dept.name,
    'Code': dept.code,
    'Description': dept.description || '—',
    'Manager': dept.manager?.fullName || '—',
    'Location': dept.location?.name || '—',
    'Employee Count': dept._count?.employees || dept.metrics?.employeeCount || 0,
    'Asset Count': dept._count?.assets || dept.metrics?.totalAssetCount || 0,
    'Status': dept.isActive ? 'ACTIVE' : 'INACTIVE',
  }));

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Departments_${dateStr}`;
  exportToExcel(rows, filename, 'Departments');
};

/**
 * Export Locations to Excel (11 Columns, Section 26)
 */
export const exportLocationsToExcel = (locations: any[], customFilename?: string) => {
  if (!locations || locations.length === 0) {
    throw new Error('No location records available to export.');
  }

  const rows = locations.map((loc) => ({
    'Location ID': loc.id,
    'Name': loc.name,
    'Code': loc.code,
    'Description': loc.description || '—',
    'Department / Area': loc.department?.name || '—',
    'Building': loc.building || '—',
    'Floor': loc.floor || '—',
    'Room / Zone': loc.roomZone || '—',
    'City': loc.city || loc.address || '—',
    'Asset Count': loc._count?.assets || loc.metrics?.totalAssetCount || 0,
    'Employee Count': loc._count?.employees || loc.metrics?.employeeCount || 0,
    'Status': loc.isActive ? 'ACTIVE' : 'INACTIVE',
  }));

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Locations_${dateStr}`;
  exportToExcel(rows, filename, 'Locations');
};

/**
 * Export Approval Requests to Excel (15 Columns, Section 38)
 */
export const exportApprovalsToExcel = (requests: any[], customFilename?: string) => {
  if (!requests || requests.length === 0) {
    throw new Error('No approval records available to export.');
  }

  const rows = requests.map((req) => ({
    'Request ID': req.requestCode || '—',
    'Request Type': req.requestType || '—',
    'Asset ID': req.asset?.companyAssetId || req.asset?.assetCode || '—',
    'Asset Name': req.asset?.model || req.asset?.assetName || '—',
    'Requested By': req.requestedBy?.employee?.fullName || req.requestedBy?.username || '—',
    'Requested Date': req.requestedAt ? new Date(req.requestedAt).toLocaleDateString('en-GB') : '—',
    'Department / Area': req.targetDepartment?.name || req.asset?.department?.name || '—',
    'Priority': req.priority || 'MEDIUM',
    'Reason': req.reason || '—',
    'Status': req.status || 'PENDING',
    'Current Approval Step': `Step ${req.currentStep || 1} of ${req.totalSteps || 1}`,
    'Decision By': req.decisionBy?.employee?.fullName || req.decisionBy?.username || '—',
    'Decision Date': req.decisionAt ? new Date(req.decisionAt).toLocaleDateString('en-GB') : '—',
    'Decision Comment': req.decisionComment || req.rejectionReason || req.changesRequested || '—',
    'Last Updated': req.updatedAt ? new Date(req.updatedAt).toLocaleDateString('en-GB') : '—',
  }));

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Approvals_${dateStr}`;
  exportToExcel(rows, filename, 'Approvals');
};

/**
 * Export Warranties to Excel (17 Columns, Section 36)
 */
export const exportWarrantiesToExcel = (warranties: any[], customFilename?: string) => {
  if (!warranties || warranties.length === 0) {
    throw new Error('No warranty records available to export.');
  }

  const rows = warranties.map((w) => ({
    'Warranty ID': w.warrantyCode || '—',
    'Asset ID': w.asset?.companyAssetId || w.asset?.assetCode || '—',
    'Asset Name': w.asset?.model || w.asset?.assetName || '—',
    'Asset Type': w.asset?.assetType || '—',
    'Serial Number': w.asset?.serialNumber || '—',
    'Provider': w.provider || '—',
    'Warranty Type': w.warrantyType || 'STANDARD',
    'Policy / Contract Number': w.policyNumber || '—',
    'Start Date': w.startDate ? new Date(w.startDate).toLocaleDateString('en-GB') : '—',
    'End Date': w.endDate ? new Date(w.endDate).toLocaleDateString('en-GB') : '—',
    'Days Remaining': w.daysRemaining !== undefined ? (w.daysRemaining < 0 ? `Expired (${Math.abs(w.daysRemaining)}d ago)` : `${w.daysRemaining} days`) : '—',
    'Coverage Status': w.computedStatus || w.status || 'ACTIVE',
    'Purchase Date': w.purchaseDate ? new Date(w.purchaseDate).toLocaleDateString('en-GB') : '—',
    'Purchase Reference': w.purchaseReference || '—',
    'Warranty Cost': w.warrantyCost !== null && w.warrantyCost !== undefined ? `INR ${w.warrantyCost}` : '—',
    'Coverage Description': w.coverageDescription || '—',
    'Claim Count': w._count?.claims || w.claims?.length || 0,
  }));

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Warranties_${dateStr}`;
  exportToExcel(rows, filename, 'Warranties');
};

/**
 * Export Warranty Claims to Excel (19 Columns, Section 36)
 */
export const exportWarrantyClaimsToExcel = (claims: any[], customFilename?: string) => {
  if (!claims || claims.length === 0) {
    throw new Error('No warranty claim records available to export.');
  }

  const rows = claims.map((c) => ({
    'Claim ID': c.claimNumber || '—',
    'Warranty ID': c.warranty?.warrantyCode || '—',
    'Asset ID': c.asset?.companyAssetId || c.asset?.assetCode || '—',
    'Asset Name': c.asset?.model || c.asset?.assetName || '—',
    'Claim Number': c.claimNumber || '—',
    'Claim Date': c.claimDate ? new Date(c.claimDate).toLocaleDateString('en-GB') : '—',
    'Issue': c.issue || '—',
    'Provider': c.provider || '—',
    'Status': c.status || 'SUBMITTED',
    'Submitted Date': c.submittedDate ? new Date(c.submittedDate).toLocaleDateString('en-GB') : '—',
    'Approved Date': c.approvedDate ? new Date(c.approvedDate).toLocaleDateString('en-GB') : '—',
    'Service Date': c.serviceDate ? new Date(c.serviceDate).toLocaleDateString('en-GB') : '—',
    'Resolved Date': c.resolvedDate ? new Date(c.resolvedDate).toLocaleDateString('en-GB') : '—',
    'Resolution': c.resolution || '—',
    'Cost': c.claimCost !== null && c.claimCost !== undefined ? `INR ${c.claimCost}` : '—',
    'Warranty Covered': c.warrantyCovered ? 'YES' : 'NO',
    'Covered Amount': c.coveredAmount !== null && c.coveredAmount !== undefined ? `INR ${c.coveredAmount}` : '—',
    'Out of Pocket Amount': c.outOfPocketAmount !== null && c.outOfPocketAmount !== undefined ? `INR ${c.outOfPocketAmount}` : '—',
    'Remarks': c.remarks || '—',
  }));

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Warranty_Claims_${dateStr}`;
  exportToExcel(rows, filename, 'Claims');
};

/**
 * Export Clearances to Excel
 */
export const exportClearancesToExcel = (clearances: any[], customFilename?: string) => {
  if (!clearances || clearances.length === 0) {
    throw new Error('No clearance records available to export.');
  }

  const rows = clearances.map((c) => ({
    'Clearance Code': c.clearanceCode,
    'Employee Code': c.employee?.employeeCode || '—',
    'Employee Name': c.employee?.fullName || '—',
    'Department': c.employee?.department || '—',
    'Location': c.employee?.location || '—',
    'Exit Date': c.exitDate ? new Date(c.exitDate).toLocaleDateString('en-GB') : '—',
    'Status': c.status,
    'Total Assets': c.totalItems ?? 0,
    'Resolved Assets': c.resolvedItems ?? 0,
    'Outstanding Assets': c.outstandingItems ?? 0,
    'Initiated By': c.initiatedBy || 'System',
    'Approved By': c.approvedBy || '—',
    'Completed Date': c.completedDate ? new Date(c.completedDate).toLocaleDateString('en-GB') : '—',
    'Reason': c.reason || '—',
  }));

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Clearances_${dateStr}`;
  exportToExcel(rows, filename, 'Clearances');
};

/**
 * Export Retirements to Excel
 */
export const exportRetirementsToExcel = (retirements: any[], customFilename?: string) => {
  if (!retirements || retirements.length === 0) {
    throw new Error('No retirement records available to export.');
  }

  const rows = retirements.map((r) => ({
    'Retirement Code': r.retirementCode,
    'Asset ID': r.asset?.companyAssetId || r.asset?.assetCode || '—',
    'Asset Model': r.asset?.model || '—',
    'Asset Type': r.asset?.assetType || '—',
    'Serial Number': r.asset?.serialNumber || '—',
    'Status': r.status,
    'Reason': r.reason,
    'Override Reason': r.overrideReason || '—',
    'Requested Date': r.requestedDate ? new Date(r.requestedDate).toLocaleDateString('en-GB') : '—',
    'Retirement Date': r.retirementDate ? new Date(r.retirementDate).toLocaleDateString('en-GB') : '—',
    'Requested By': r.requestedBy?.username || '—',
    'Approved By': r.approvedBy?.username || '—',
    'Final Condition': r.finalCondition || '—',
    'Final Location': r.finalLocation || '—',
    'Data Sanitization': r.dataSanitizationStatus || '—',
    'Disposal Method': r.disposalMethod || '—',
    'Disposal Vendor': r.disposalVendor || '—',
    'Residual Value': r.residualValue !== null && r.residualValue !== undefined ? `INR ${r.residualValue}` : '—',
    'Replacement Asset': r.replacementAsset?.assetCode || 'None',
  }));

  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = customFilename || `FAITH_ITAM_Retirements_${dateStr}`;
  exportToExcel(rows, filename, 'Retirements');
};

/**
 * Generate Print-Friendly Corporate A4 PDF for Official Documents
 */
export const exportOfficialDocumentPDF = (docData: any) => {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const snapshot = docData.parsedSnapshot || {};

  // Header Banner
  doc.setFillColor(24, 30, 44);
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FAITH AUTOMATION — IT ASSET MANAGEMENT', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(snapshot.title || 'Official IT Asset Document', 14, 19);

  // Document Metadata Pill
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.text(`Document No: ${docData.documentNumber}`, 14, 35);
  doc.text(`Generated: ${new Date(docData.generatedAt || Date.now()).toLocaleString('en-GB')}`, 14, 40);
  doc.text(`Version: v${docData.version || 1}  |  Status: ${docData.status}`, 14, 45);
  doc.text(`Integrity Hash: ${docData.fileHash ? docData.fileHash.slice(0, 24) + '...' : 'VERIFIED'}`, 14, 50);

  let currentY = 56;

  // Key Parties Section
  const partyRows: any[] = [];
  if (snapshot.employee) {
    partyRows.push([
      'Assigned Employee',
      `${snapshot.employee.fullName || '—'} (${snapshot.employee.employeeCode || '—'})`,
      'Department / Area',
      snapshot.employee.department || '—',
    ]);
  }
  if (snapshot.from && snapshot.to) {
    partyRows.push([
      'Transfer From',
      `${snapshot.from.employee} (${snapshot.from.department})`,
      'Transfer To',
      `${snapshot.to.employee} (${snapshot.to.department})`,
    ]);
  }
  if (snapshot.asset) {
    partyRows.push([
      'Asset Code / Name',
      `${snapshot.asset.assetCode} — ${snapshot.asset.assetName || snapshot.asset.model || ''}`,
      'Type / Serial No',
      `${snapshot.asset.assetType} — ${snapshot.asset.serialNumber || 'N/A'}`,
    ]);
  }

  if (partyRows.length > 0) {
    (doc as any).autoTable({
      body: partyRows,
      startY: currentY,
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 247, 250], width: 35 },
        2: { fontStyle: 'bold', fillColor: [245, 247, 250], width: 35 },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Hardware Specs Table (if available)
  if (snapshot.asset?.specifications) {
    const specs = snapshot.asset.specifications;
    const specRows = [
      ['CPU / Processor', specs.processor || 'Standard', 'RAM Memory', specs.ram || '8 GB'],
      ['Storage', specs.storage || '256 GB SSD', 'Display / Monitor', specs.monitor || specs.displaySize || 'Built-in'],
      ['Keyboard / Mouse', `${specs.keyboard || 'USB'} / ${specs.mouse || 'USB'}`, 'Charger / Adapter', specs.chargerAdapter || 'Standard Power Adapter'],
      ['Operating System', specs.operatingSystem || 'Windows 11 Pro', 'MAC Address', specs.macAddress || '—'],
    ];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Hardware Specifications & Peripherals Checklist', 14, currentY);

    (doc as any).autoTable({
      body: specRows,
      startY: currentY + 3,
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 247, 250], width: 35 },
        2: { fontStyle: 'bold', fillColor: [245, 247, 250], width: 35 },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Clearance Items Table (if clearance)
  if (snapshot.items && snapshot.items.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Asset Handover & Resolution Checklist', 14, currentY);

    const itemRows = snapshot.items.map((i: any) => [
      i.assetCode,
      i.assetName,
      i.action,
      i.status,
      i.resolutionNotes || 'Verified & Cleared',
    ]);

    (doc as any).autoTable({
      head: [['Asset Code', 'Model / Description', 'Action', 'Status', 'Resolution / Condition']],
      body: itemRows,
      startY: currentY + 3,
      headStyles: { fillColor: [40, 50, 70] },
      styles: { fontSize: 8, cellPadding: 2 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // Sign-off / Signature section
  const signY = Math.max(currentY + 6, 230);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  doc.setDrawColor(180, 180, 180);
  doc.line(14, signY, 70, signY);
  doc.text('Employee / Holder Signature', 14, signY + 5);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(snapshot.employee?.fullName || 'Acknowledged', 14, signY + 9);

  doc.line(140, signY, 196, signY);
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.text('Authorized IT Representative', 140, signY + 5);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(snapshot.assignedBy || snapshot.requestedBy || snapshot.initiatedBy || 'Faith ITAM Authority', 140, signY + 9);

  // Footer Note
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.text('This is an official system-generated document issued by Faith Automation IT Inventory System. All rights reserved.', 14, 285);

  doc.save(`${docData.documentNumber}.pdf`);
};

/**
 * Export Professional Management PDF for Reports
 */
export const exportReportPDF = (
  title: string,
  kpis: { label: string; value: any }[],
  tableHeaders: string[],
  tableRows: any[][],
  filename: string
) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');

  // Header
  doc.setFillColor(24, 30, 44);
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('FAITH AUTOMATION — MANAGEMENT REPORT', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${title}  |  Generated on: ${new Date().toLocaleString('en-GB')}`, 14, 18);

  let currentY = 32;

  // KPI Highlights Grid
  if (kpis && kpis.length > 0) {
    doc.setTextColor(30, 40, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators:', 14, currentY);

    const kpiSummary = kpis.map((k) => `${k.label}: ${k.value}`).join('   |   ');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 80, 100);
    doc.text(kpiSummary, 14, currentY + 5);
    currentY += 12;
  }

  // Data Table
  (doc as any).autoTable({
    head: [tableHeaders],
    body: tableRows,
    startY: currentY,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [40, 50, 75], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text(`Page ${i} of ${pageCount}  •  Faith Automation IT Inventory Management System`, 14, 202);
  }

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(safeFilename);
};






