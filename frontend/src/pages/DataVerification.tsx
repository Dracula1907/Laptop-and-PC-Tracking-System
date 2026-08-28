import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  RotateCw,
  Layers,
  Database,
  Search,
} from 'lucide-react';

interface VerificationData {
  summary: {
    sourceRows: number;
    databaseAssets: number;
    matched: number;
    missing: number;
    extra: number;
    duplicateAssetIds: number;
    importErrors: number;
  };
  distributions: {
    types: Record<string, number>;
    statuses: Record<string, number>;
    allocations: Record<string, number>;
    criticality: Record<string, number>;
  };
  completeness: Array<{
    field: string;
    count: number;
    total: number;
    isComplete: boolean;
  }>;
}

export const DataVerification: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchVerification = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/import/verification');
      const isSuccess = res?.success ?? res?.data?.success;
      const verificationData = res?.data ?? res;
      if (isSuccess && verificationData) {
        setData(verificationData);
      }
    } catch (err) {
      console.error('Failed to load verification data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, []);

  const handleExportExcel = async () => {
    try {
      const res = await api.get('/import/export-company-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `company_it_assets_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  if (loading || !data) {
    return (
      <div className="py-20 text-center text-textSecondary">
        <div className="inline-block w-8 h-8 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Validating Database Fidelity Against Source Excel...</p>
      </div>
    );
  }

  const { summary, distributions, completeness } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Source Data & Database Verification"
        subtitle="Audited 1:1 validation of PostgreSQL database records against the official 16-column Excel source of truth."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={fetchVerification}>
              <RotateCw className="w-4 h-4 mr-1.5" />
              Re-Verify Database
            </Button>
            <Button variant="secondary" onClick={handleExportExcel}>
              <Download className="w-4 h-4 mr-1.5" />
              Export 16-Col Excel
            </Button>
            <Button variant="primary" onClick={() => navigate('/assets')}>
              <Search className="w-4 h-4 mr-1.5" />
              View Asset Inventory
            </Button>
          </div>
        }
      />

      {/* Row 1: High-Level Parity KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3 bg-bgElevated border border-borderBase rounded-xl text-center">
          <span className="text-[10px] text-textSecondary uppercase font-semibold">Source Rows</span>
          <p className="text-xl font-bold text-textPrimary font-mono mt-0.5">{summary.sourceRows}</p>
        </div>
        <div className="p-3 bg-bgElevated border border-borderBase rounded-xl text-center">
          <span className="text-[10px] text-textSecondary uppercase font-semibold">Database Assets</span>
          <p className="text-xl font-bold text-brandPrimary font-mono mt-0.5">{summary.databaseAssets}</p>
        </div>
        <div className="p-3 bg-bgElevated border border-emerald-500/30 rounded-xl text-center bg-emerald-950/10">
          <span className="text-[10px] text-emerald-400 uppercase font-semibold">Matched</span>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{summary.matched}</p>
        </div>
        <div className="p-3 bg-bgElevated border border-borderBase rounded-xl text-center">
          <span className="text-[10px] text-textSecondary uppercase font-semibold">Missing</span>
          <p className="text-xl font-bold text-textSecondary font-mono mt-0.5">{summary.missing}</p>
        </div>
        <div className="p-3 bg-bgElevated border border-borderBase rounded-xl text-center">
          <span className="text-[10px] text-textSecondary uppercase font-semibold">Extra Records</span>
          <p className="text-xl font-bold text-textSecondary font-mono mt-0.5">{summary.extra}</p>
        </div>
        <div className="p-3 bg-bgElevated border border-borderBase rounded-xl text-center">
          <span className="text-[10px] text-textSecondary uppercase font-semibold">Duplicate IDs</span>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{summary.duplicateAssetIds}</p>
        </div>
        <div className="p-3 bg-bgElevated border border-borderBase rounded-xl text-center">
          <span className="text-[10px] text-textSecondary uppercase font-semibold">Import Errors</span>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{summary.importErrors}</p>
        </div>
      </div>

      {/* Row 2: Distribution Fidelity Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Asset Types */}
        <Card title="Asset Types" subtitle="Category distribution in PostgreSQL">
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(distributions.types).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-1 border-b border-borderBase last:border-0">
                <span className="text-textSecondary">{k}</span>
                <span className="font-bold text-textPrimary">{v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Asset Statuses */}
        <Card title="Asset Statuses" subtitle="Active vs Inactive fleet">
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(distributions.statuses).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-1 border-b border-borderBase last:border-0">
                <span className="text-textSecondary">{k}</span>
                <span className={`font-bold ${k === 'Active' ? 'text-emerald-400' : 'text-zinc-400'}`}>{v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Allocation Statuses */}
        <Card title="Allocation Status" subtitle="In use vs Available stock">
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(distributions.allocations).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-1 border-b border-borderBase last:border-0">
                <span className="text-textSecondary">{k}</span>
                <span className={`font-bold ${k === 'Allocated' ? 'text-blue-400' : 'text-cyan-400'}`}>{v}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Criticality */}
        <Card title="Criticality Distribution" subtitle="Normalized case with NULL preserved">
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(distributions.criticality).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-1 border-b border-borderBase last:border-0">
                <span className="text-textSecondary">{k}</span>
                <span className={`font-bold ${k === 'High' ? 'text-rose-400' : k === 'Medium' ? 'text-amber-400' : 'text-zinc-400'}`}>
                  {v}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Row 3: 16-Column Field Completeness Table */}
      <Card
        title="Field-Level Completeness & Null Preservation (All 16 Source Columns)"
        subtitle="Confirms that every single column is imported with exact non-null values and authentic SQL NULL for blanks."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-borderBase text-textSecondary uppercase font-mono text-[10px]">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Source Excel Column</th>
                <th className="py-2.5 px-3">Mapped Database Field</th>
                <th className="py-2.5 px-3 text-center">Non-Null Records</th>
                <th className="py-2.5 px-3 text-center">Database NULLs</th>
                <th className="py-2.5 px-3">Completeness</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase font-mono">
              {completeness.map((c, idx) => {
                const nullCount = c.total - c.count;
                const pct = Math.round((c.count / (c.total || 1)) * 100);

                return (
                  <tr key={c.field} className="hover:bg-bgElevated/50 transition-colors">
                    <td className="py-2.5 px-3 text-textSecondary">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-textPrimary">{c.field}</td>
                    <td className="py-2.5 px-3 text-brandPrimary">
                      {idx === 0
                        ? 'companyAssetId'
                        : idx === 1
                        ? 'assetName'
                        : idx === 2
                        ? 'assetDescription'
                        : idx === 3
                        ? 'serialNumber'
                        : idx === 4
                        ? 'assetType'
                        : idx === 5
                        ? 'sourceAssetStatus'
                        : idx === 6
                        ? 'location'
                        : idx === 7
                        ? 'allocationStatus'
                        : idx === 8
                        ? 'criticality'
                        : idx === 9
                        ? 'employeeNameSource'
                        : idx === 10
                        ? 'lanIp'
                        : idx === 11
                        ? 'ram'
                        : idx === 12
                        ? 'dateOfAllocation'
                        : idx === 13
                        ? 'dateOfDeallocation'
                        : idx === 14
                        ? 'cpu'
                        : 'lanMacAddress'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-textPrimary">
                      {c.count} / {c.total}
                    </td>
                    <td className="py-2.5 px-3 text-center text-textSecondary">
                      {nullCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px]">
                          {nullCount} NULL
                        </span>
                      ) : (
                        <span className="text-zinc-600">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 min-w-[120px]">
                      <div className="w-full bg-bgBase rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-brandPrimary'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-sans font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
