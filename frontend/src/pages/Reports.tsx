import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { DataTable, Column } from '../components/DataTable';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { exportToExcel, exportToPDF } from '../utils/exporters';
import { Download, FileSpreadsheet, File } from 'lucide-react';

export const Reports: React.FC = () => {
  const { showToast } = useToast();

  const [reportType, setReportType] = useState<string>('inventory');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReport = async (type: string) => {
    setLoading(true);
    try {
      const res: any = await api.get(`/reports/${type}`);
      if (res.success) {
        setData(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch report data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(reportType);
  }, [reportType]);

  // Transform raw report records for tabular display and export
  const getDisplayData = () => {
    return data.map((item: any) => {
      if (reportType === 'inventory' || reportType === 'assigned' || reportType === 'available' || reportType === 'warranty') {
        return {
          id: item.id,
          'Asset Code': item.assetCode,
          Type: item.assetType,
          Manufacturer: item.manufacturer,
          Model: item.model,
          'Serial Number': item.serialNumber || 'N/A',
          Status: item.status,
          Condition: item.condition,
          Holder: item.currentHolder?.fullName || 'Unassigned',
          Department: item.department?.name || 'N/A',
          Location: item.location?.name || 'N/A',
          'Warranty End': item.warrantyEnd ? new Date(item.warrantyEnd).toLocaleDateString() : 'N/A',
        };
      }
      if (reportType === 'maintenance') {
        return {
          id: item.id,
          'Asset Code': item.asset?.assetCode,
          'Issue Title': item.issueTitle,
          Status: item.repairStatus,
          Technician: item.technician || 'N/A',
          Cost: `₹${item.repairCost || 0}`,
          'Reported Date': new Date(item.reportedAt).toLocaleDateString(),
        };
      }
      if (reportType === 'transfers') {
        return {
          id: item.id,
          'Asset Code': item.asset?.assetCode,
          'Previous Holder': item.previousHolder?.fullName || 'None',
          'New Holder': item.newHolder?.fullName,
          Reason: item.reason || 'N/A',
          'Transfer Date': new Date(item.transferDate).toLocaleDateString(),
        };
      }
      if (reportType === 'returns') {
        return {
          id: item.id,
          'Asset Code': item.asset?.assetCode,
          Employee: item.employee?.fullName,
          Condition: item.conditionAtReturn,
          Accessories: item.accessoriesReturned ? 'Returned' : 'Missing',
          'Return Date': new Date(item.returnDate).toLocaleDateString(),
        };
      }
      return item;
    });
  };

  const formattedData = getDisplayData();
  const headers = formattedData.length ? Object.keys(formattedData[0]).filter((k) => k !== 'id') : [];

  const columns: Column<any>[] = headers.map((h) => ({
    key: h,
    header: h,
    render: (item) => <span className="text-xs font-medium text-textPrimary">{item[h]}</span>,
  }));

  const handleExportExcel = () => {
    exportToExcel(formattedData, `ITAM_${reportType}_Report`);
    showToast('Report exported as Excel', 'success');
  };

  const handleExportPDF = () => {
    const rows = formattedData.map((d) => headers.map((h) => d[h]));
    exportToPDF(`${reportType.toUpperCase()} REPORT`, headers, rows, `ITAM_${reportType}_Report`);
    showToast('Report exported as PDF', 'success');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Reports & Export Hub"
        subtitle="Generate, preview, and download custom inventory, assignment, maintenance, and lifecycle audit reports."
      />

      {/* Report Type Selector & Actions */}
      <div className="bg-surface border border-borderDark rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-72">
          <Select
            label="Select Report Module"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            options={[
              { value: 'inventory', label: 'Full Asset Inventory Report' },
              { value: 'assigned', label: 'Assigned Assets Report' },
              { value: 'available', label: 'Available Stock Report' },
              { value: 'maintenance', label: 'Maintenance & Repairs Report' },
              { value: 'transfers', label: 'Asset Transfers Log' },
              { value: 'returns', label: 'Asset Returns Log' },
              { value: 'warranty', label: 'Warranty Status & Expiry Report' },
            ]}
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <Button variant="success" size="sm" icon={<FileSpreadsheet className="w-4 h-4" />} onClick={handleExportExcel}>
            Export Excel
          </Button>
          <Button variant="primary" size="sm" icon={<File className="w-4 h-4" />} onClick={handleExportPDF}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Preview Table */}
      <Card title={`Preview: ${reportType.toUpperCase()} (${formattedData.length} Records)`}>
        <DataTable columns={columns} data={formattedData} loading={loading} />
      </Card>
    </div>
  );
};
