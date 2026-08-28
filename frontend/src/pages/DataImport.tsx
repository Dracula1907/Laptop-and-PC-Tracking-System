import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  RotateCw,
  Database,
  Search,
  ExternalLink,
  ShieldCheck,
  Check,
  ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { ImportPreviewSummary, ImportBatch } from '../types';

export const DataImport: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [importStage, setImportStage] = useState<string>('');
  const [onDuplicate, setOnDuplicate] = useState<'SKIP' | 'UPDATE'>('UPDATE');
  const [importResult, setImportResult] = useState<any>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'WARNINGS' | 'ERRORS' | 'READY'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fetchBatches = async () => {
    try {
      const res: any = await api.get('/import/batches');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && Array.isArray(data)) {
        setBatches(data);
      }
    } catch (err) {
      console.error('Failed to load import batches:', err);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const processSelectedFile = async (selected: File) => {
    if (!selected.name.endsWith('.xlsx') && !selected.name.endsWith('.xls')) {
      showToast('Please upload a valid Excel (.xlsx / .xls) file.', 'error');
      return;
    }

    setFile(selected);
    setImportResult(null);
    setLoading(true);
    setImportStage('Validating headers & reading rows...');

    const formData = new FormData();
    formData.append('file', selected);

    try {
      const res: any = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const isSuccess = res?.success ?? res?.data?.success;
      const previewData: ImportPreviewSummary = res?.data ?? res;

      if (isSuccess && previewData) {
        setPreview(previewData);
        if (previewData.headerValid) {
          showToast(`Successfully analyzed ${previewData.totalRows} asset records from "${selected.name}".`, 'success');
        } else {
          showToast(`Excel format validation failed: ${previewData.headerErrors?.join('; ')}`, 'error');
        }
      } else {
        showToast(res?.message || 'Failed to parse Excel file.', 'error');
        setPreview(null);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to parse Excel file.';
      showToast(msg, 'error');
      setPreview(null);
    } finally {
      setLoading(false);
      setImportStage('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processSelectedFile(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) processSelectedFile(dropped);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    setImporting(true);
    setImportStage('Executing PostgreSQL transaction...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('onDuplicate', onDuplicate);

    try {
      const res: any = await api.post('/import/confirm', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const isSuccess = res?.success ?? res?.data?.success;
      const resultData = res?.data ?? res;

      if (isSuccess && resultData) {
        setImportResult(resultData);
        showToast(res?.message || 'Import completed successfully into PostgreSQL!', 'success');
        fetchBatches();
      } else {
        showToast(res?.message || 'Import transaction failed.', 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error executing import.';
      showToast(msg, 'error');
    } finally {
      setImporting(false);
      setImportStage('');
    }
  };

  const handleDownloadCompanyExcel = async () => {
    try {
      const res: any = await api.get('/import/export-company-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data || res]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `company_it_assets_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Company Excel inventory downloaded successfully.', 'success');
    } catch {
      showToast('Failed to download company Excel file.', 'error');
    }
  };

  // Filter preview rows safely without null errors
  const filteredRows = useMemo(() => {
    if (!preview?.rows) return [];
    return preview.rows.filter((r) => {
      if (filterTab === 'WARNINGS' && (r.warnings?.length || 0) === 0 && (r.dataQualityIssues?.length || 0) === 0) {
        return false;
      }
      if (filterTab === 'ERRORS' && (r.errors?.length || 0) === 0) return false;
      if (filterTab === 'READY' && (!r.isValid || (r.errors?.length || 0) > 0)) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const assetId = (r.companyAssetId || '').toLowerCase();
        const assetName = (r.assetName || '').toLowerCase();
        const serial = (r.serialNumber || '').toLowerCase();
        const holder = (r.employeeNameSource || r.holderDisplayName || '').toLowerCase();
        const loc = (r.location || '').toLowerCase();

        return assetId.includes(q) || assetName.includes(q) || serial.includes(q) || holder.includes(q) || loc.includes(q);
      }
      return true;
    });
  }, [preview, filterTab, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Excel Import Pipeline"
        subtitle="Import official 16-column Excel inventory directly into PostgreSQL with full data fidelity, audit logging, and preview."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleDownloadCompanyExcel}>
              <Download className="w-4 h-4 mr-1.5" />
              Export 16-Col Excel
            </Button>
            <Button variant="secondary" onClick={() => navigate('/admin/data-verification')}>
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              Data Verification
            </Button>
          </div>
        }
      />

      {/* Section 1: Upload Area (Drag & Drop) */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          isDragOver
            ? 'border-brandPrimary bg-brandPrimary/10 shadow-lg'
            : 'border-borderBase bg-bgElevated/50 hover:border-brandPrimary/70'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center mx-auto text-brandPrimary">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-textPrimary">
              {file ? file.name : 'Drag & Drop Corporate Excel Inventory File'}
            </h3>
            <p className="text-xs text-textSecondary mt-1">
              Supports <strong className="text-textPrimary font-mono">.xlsx</strong> workbooks with the official 16-column layout. Max file size: 50MB.
            </p>
          </div>

          {file && (
            <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-lg bg-bgBase border border-borderBase text-xs font-mono text-textPrimary">
              <span>{(file.size / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span className="text-emerald-400">Ready to Analyze</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
                disabled={loading || importing}
              />
              <span className="inline-flex items-center px-4 py-2 bg-bgElevated border border-borderBase hover:border-brandPrimary text-textPrimary rounded-lg text-xs font-semibold transition-colors shadow-sm">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-brandPrimary" />
                {loading ? 'Analyzing Sheet...' : file ? 'Choose Another File' : 'Browse Files'}
              </span>
            </label>

            {preview && preview.headerValid && (
              <Button
                variant="primary"
                onClick={handleConfirmImport}
                loading={importing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 shadow-md"
              >
                <Database className="w-4 h-4 mr-2" />
                Confirm & Import to PostgreSQL
              </Button>
            )}
          </div>

          {importStage && (
            <div className="text-xs text-brandPrimary font-mono flex items-center justify-center gap-2 pt-2 animate-pulse">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              <span>{importStage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Header Validation Error Notice */}
      {preview && !preview.headerValid && (
        <Card className="bg-rose-950/30 border border-rose-500/40 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-rose-300">Excel Format Validation Failed</h4>
              <p className="text-textSecondary mt-0.5">
                The uploaded sheet does not match the mandatory 16-column company specification.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-rose-200 font-mono">
                {preview.headerErrors?.map((err: string, i: number) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Section 3: Import Result Success Screen (Section 45) */}
      {importResult && (
        <Card className="bg-emerald-950/20 border border-emerald-500/30 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-300">✓ Import Completed Successfully</h4>
                <p className="text-xs text-textSecondary font-mono mt-0.5">
                  Batch: {importResult.importBatchId || importResult.batchId} • Database synchronized
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="px-3 py-1.5 rounded bg-bgBase border border-borderBase text-center">
                <span className="text-textSecondary block text-[10px]">TOTAL</span>
                <span className="font-bold text-textPrimary">{importResult.totalRows}</span>
              </div>
              <div className="px-3 py-1.5 rounded bg-bgBase border border-emerald-500/30 text-center">
                <span className="text-emerald-400 block text-[10px]">IMPORTED</span>
                <span className="font-bold text-emerald-400">{importResult.importedRows ?? importResult.inserted ?? 0}</span>
              </div>
              <div className="px-3 py-1.5 rounded bg-bgBase border border-blue-500/30 text-center">
                <span className="text-blue-400 block text-[10px]">UPDATED</span>
                <span className="font-bold text-blue-400">{importResult.updatedRows ?? importResult.updated ?? 0}</span>
              </div>
              <div className="px-3 py-1.5 rounded bg-bgBase border border-zinc-700 text-center">
                <span className="text-zinc-400 block text-[10px]">SKIPPED</span>
                <span className="font-bold text-zinc-400">{importResult.skippedRows ?? importResult.skipped ?? 0}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => navigate('/assets')}>
                View Assets
              </Button>
              <Button variant="primary" onClick={() => navigate('/dashboard')}>
                View Dashboard
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Section 4: Data Validation & Preview Metrics */}
      {preview && preview.headerValid && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3.5 bg-bgElevated border-borderBase text-center">
              <span className="text-[10px] text-textSecondary uppercase font-semibold">Total Rows</span>
              <div className="text-xl font-bold text-textPrimary font-mono mt-0.5">{preview.totalRows}</div>
            </Card>

            <Card className="p-3.5 bg-bgElevated border-borderBase text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Valid Rows</span>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{preview.validRows}</div>
            </Card>

            <Card className="p-3.5 bg-bgElevated border-borderBase text-center">
              <span className="text-[10px] text-amber-400 uppercase font-semibold">Warnings</span>
              <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{preview.warningRows}</div>
            </Card>

            <Card className="p-3.5 bg-bgElevated border-borderBase text-center">
              <span className="text-[10px] text-rose-400 uppercase font-semibold">Errors</span>
              <div className="text-xl font-bold text-rose-400 font-mono mt-0.5">{preview.errorRows}</div>
            </Card>

            <Card className="p-3.5 bg-bgElevated border-borderBase text-center">
              <span className="text-[10px] text-blue-400 uppercase font-semibold">Duplicates in File</span>
              <div className="text-xl font-bold text-blue-400 font-mono mt-0.5">{preview.duplicateRows}</div>
            </Card>

            <Card className="p-3.5 bg-bgElevated border-borderBase text-center">
              <span className="text-[10px] text-textSecondary uppercase font-semibold">Conflict Policy</span>
              <select
                value={onDuplicate}
                onChange={(e) => setOnDuplicate(e.target.value as any)}
                className="mt-1 w-full text-xs bg-bgBase border border-borderBase rounded px-2 py-1 text-textPrimary font-mono focus:outline-none focus:border-brandPrimary"
              >
                <option value="UPDATE">Update Existing</option>
                <option value="SKIP">Skip Duplicates</option>
              </select>
            </Card>
          </div>

          {/* Section 5: Data Preview Table */}
          <Card
            title={`Analyzed Data Preview (${filteredRows.length} Rows)`}
            subtitle="Verify parsed values and data quality classifications before committing to PostgreSQL."
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-1 bg-bgBase p-1 rounded-lg border border-borderBase">
                <button
                  onClick={() => setFilterTab('ALL')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                    filterTab === 'ALL' ? 'bg-brandPrimary text-white' : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  All ({preview.rows.length})
                </button>
                <button
                  onClick={() => setFilterTab('READY')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                    filterTab === 'READY' ? 'bg-brandPrimary text-white' : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  Ready ({preview.validRows})
                </button>
                <button
                  onClick={() => setFilterTab('WARNINGS')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                    filterTab === 'WARNINGS' ? 'bg-brandPrimary text-white' : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  Warnings ({preview.warningRows})
                </button>
                <button
                  onClick={() => setFilterTab('ERRORS')}
                  className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                    filterTab === 'ERRORS' ? 'bg-brandPrimary text-white' : 'text-textSecondary hover:text-textPrimary'
                  }`}
                >
                  Errors ({preview.errorRows})
                </button>
              </div>

              <div className="w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter preview..."
                  className="w-full text-xs bg-bgBase border border-borderBase rounded-lg px-3 py-1.5 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-brandPrimary"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-borderBase rounded-lg max-h-96">
              <table className="w-full text-left text-xs border-collapse font-mono whitespace-nowrap">
                <thead className="sticky top-0 bg-bgBase border-b border-borderBase text-[10px] text-textSecondary uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Asset ID</th>
                    <th className="py-2.5 px-3">Asset Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Allocation</th>
                    <th className="py-2.5 px-3">Criticality</th>
                    <th className="py-2.5 px-3">Holder / Custodian</th>
                    <th className="py-2.5 px-3">LAN IP</th>
                    <th className="py-2.5 px-3">RAM</th>
                    <th className="py-2.5 px-3">CPU</th>
                    <th className="py-2.5 px-3">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderBase">
                  {filteredRows.slice(0, 15).map((r) => (
                    <tr key={r.rowNumber} className="hover:bg-bgElevated transition-colors">
                      <td className="py-2 px-3 text-textSecondary">#{r.rowNumber}</td>
                      <td className="py-2 px-3 font-bold text-brandPrimary">{r.companyAssetId}</td>
                      <td className="py-2 px-3 font-sans text-textPrimary">{r.assetName}</td>
                      <td className="py-2 px-3 text-textSecondary">{r.sourceAssetType}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${r.sourceAssetStatus === 'Active' ? 'text-emerald-400 bg-emerald-950/40' : 'text-zinc-400 bg-zinc-800'}`}>
                          {r.sourceAssetStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-sans text-textPrimary">{r.location}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${r.sourceAllocationStatus === 'Allocated' ? 'text-blue-400 bg-blue-950/40' : 'text-zinc-400 bg-zinc-800'}`}>
                          {r.sourceAllocationStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3">{r.criticality || '—'}</td>
                      <td className="py-2 px-3 font-sans text-textPrimary">
                        {r.employeeNameSource || <span className="text-zinc-500 italic">—</span>}
                      </td>
                      <td className="py-2 px-3 text-textSecondary">{r.lanIp || '—'}</td>
                      <td className="py-2 px-3 text-textSecondary">{r.ram || '—'}</td>
                      <td className="py-2 px-3 font-bold text-textPrimary">{r.cpu || '—'}</td>
                      <td className="py-2 px-3">
                        {r.dataQualityStatus === 'NEEDS_REVIEW' ? (
                          <span className="text-amber-400 text-[10px]">Review</span>
                        ) : r.dataQualityStatus === 'WARNING' ? (
                          <span className="text-yellow-400/80 text-[10px]">Warning</span>
                        ) : (
                          <span className="text-emerald-400 text-[10px]">Clean</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredRows.length > 15 && (
              <p className="text-[11px] text-textSecondary mt-2 text-right">
                Showing first 15 of {filteredRows.length} analyzed rows.
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Section 6: Import History (Section 40) */}
      <Card
        title="Data Import Batch History"
        subtitle="Audited record of all past Excel uploads and database commits."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-borderBase text-[10px] text-textSecondary uppercase">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">File Name</th>
                <th className="py-2.5 px-3">Uploaded By</th>
                <th className="py-2.5 px-3 text-center">Total</th>
                <th className="py-2.5 px-3 text-center">Imported</th>
                <th className="py-2.5 px-3 text-center">Skipped</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-bgElevated transition-colors">
                  <td className="py-2.5 px-3 text-textSecondary">{new Date(b.createdAt).toLocaleString()}</td>
                  <td className="py-2.5 px-3 font-semibold text-textPrimary">{b.fileName}</td>
                  <td className="py-2.5 px-3 font-sans text-textSecondary">{b.uploadedBy?.username || 'Admin'}</td>
                  <td className="py-2.5 px-3 text-center text-textPrimary">{b.totalRows}</td>
                  <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">{b.importedRows}</td>
                  <td className="py-2.5 px-3 text-center text-zinc-400">{b.skippedRows}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 text-[10px]">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}

              {batches.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-textSecondary">
                    No import batches logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
