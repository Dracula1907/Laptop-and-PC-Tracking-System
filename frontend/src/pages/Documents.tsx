import React, { useEffect, useState, useRef } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { OfficialDocument, DocumentType } from '../types';
import { exportOfficialDocumentPDF, printOfficialDocumentPDF } from '../utils/exporters';
import {
  FileCheck,
  Search,
  Download,
  Eye,
  Plus,
  Ban,
  ShieldCheck,
  X,
  RotateCcw,
  Printer,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  HANDOVER: 'Asset Handover',
  RETURN_RECEIPT: 'Asset Return Receipt',
  TRANSFER: 'Asset Transfer',
  CLEARANCE: 'Employee Clearance',
  RETIREMENT: 'Asset Retirement',
};

const DOCUMENT_TYPE_FULL_TITLES: Record<DocumentType, string> = {
  HANDOVER: 'IT Asset Handover & Acceptance Certificate',
  RETURN_RECEIPT: 'IT Asset Return Receipt & Inspection Certificate',
  TRANSFER: 'IT Asset Transfer & Movement Order',
  CLEARANCE: 'Employee Offboarding & IT Asset Clearance Certificate',
  RETIREMENT: 'Official Asset Retirement & Disposal Certificate',
};

export const Documents: React.FC = () => {
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);

  // View / Preview Modal
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);

  // Void Modal
  const [voidDocId, setVoidDocId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [voiding, setVoiding] = useState<boolean>(false);

  // Delete Modal
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Generate New Document Modal State
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [genType, setGenType] = useState<DocumentType>('HANDOVER');
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [assetSearchResults, setAssetSearchResults] = useState<any[]>([]);
  const [searchingAssets, setSearchingAssets] = useState<boolean>(false);
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null);
  const [loadingAssetDetails, setLoadingAssetDetails] = useState<boolean>(false);
  const [genRemarks, setGenRemarks] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);

  const searchDebounceRef = useRef<any>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '25');
      if (search.trim()) params.append('search', search.trim());
      if (typeFilter !== 'ALL') params.append('documentType', typeFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const res: any = await api.get(`/documents?${params.toString()}`);
      const data = res?.data ?? res;
      if (data?.documents) {
        setDocuments(data.documents);
        setTotal(data.total);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to fetch official documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, typeFilter, statusFilter]);

  // Live asset search when typing
  const handleAssetSearchChange = (query: string) => {
    setAssetSearchQuery(query);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!query.trim()) {
      setAssetSearchResults([]);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setSearchingAssets(true);
      try {
        const res: any = await api.get(`/assets?search=${encodeURIComponent(query.trim())}&limit=10`);
        const data = res?.data ?? res;
        const results = data?.assets || [];
        setAssetSearchResults(results);
      } catch (err) {
        console.error('Failed to search assets:', err);
      } finally {
        setSearchingAssets(false);
      }
    }, 250);
  };

  // Select an asset from search results
  const handleSelectAsset = async (asset: any) => {
    setLoadingAssetDetails(true);
    setAssetSearchResults([]);
    setAssetSearchQuery(`${asset.companyAssetId || asset.assetCode} — ${asset.model || asset.assetName}`);
    try {
      const res: any = await api.get(`/assets/${asset.id}`);
      const detailed = res?.data || asset;
      setSelectedAsset(detailed);
    } catch {
      setSelectedAsset(asset);
    } finally {
      setLoadingAssetDetails(false);
    }
  };

  const handleClearSelectedAsset = () => {
    setSelectedAsset(null);
    setAssetSearchQuery('');
    setAssetSearchResults([]);
  };

  const handleOpenPreview = async (id: string) => {
    try {
      const res: any = await api.get(`/documents/${id}`);
      const data = res?.data ?? res;
      setPreviewDoc(data);
    } catch {
      showToast('Failed to load document snapshot', 'error');
    }
  };

  const handleDownloadPDF = async (id: string) => {
    try {
      const res: any = await api.get(`/documents/${id}`);
      const data = res?.data ?? res;
      if (data) {
        exportOfficialDocumentPDF(data);
        showToast('Official PDF downloaded successfully', 'success');
      }
    } catch {
      showToast('Failed to export PDF', 'error');
    }
  };

  const handlePrint = async (id: string) => {
    try {
      const res: any = await api.get(`/documents/${id}`);
      const data = res?.data ?? res;
      if (data) {
        printOfficialDocumentPDF(data);
      }
    } catch {
      showToast('Failed to print official document', 'error');
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidDocId) return;

    setVoiding(true);
    try {
      await api.post(`/documents/${voidDocId}/void`, { reason: voidReason });
      showToast('Document marked as voided', 'info');
      setVoidDocId(null);
      setVoidReason('');
      fetchDocuments();
    } catch (err: any) {
      showToast(err.message || 'Failed to void document', 'error');
    } finally {
      setVoiding(false);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteDocId) return;

    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteDocId}`);
      showToast('Official document deleted from vault', 'success');
      setDeleteDocId(null);
      fetchDocuments();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete document', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (generating) return;

    if (!selectedAsset) {
      showToast('Please search and select an asset first', 'error');
      return;
    }

    setGenerating(true);
    try {
      const res: any = await api.post('/documents', {
        type: genType,
        assetId: selectedAsset.id,
        remarks: genRemarks.trim() || undefined,
      });

      const newDoc = res?.data;
      showToast(`Official document ${newDoc?.documentNumber || ''} created & saved to database`, 'success');
      setShowGenerateModal(false);
      handleClearSelectedAsset();
      setGenRemarks('');

      // Refresh documents table immediately
      await fetchDocuments();

      // Download official PDF immediately
      if (newDoc) {
        exportOfficialDocumentPDF(newDoc);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err.message || 'Failed to generate document', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // Helper values for review card
  const employeeDisplay = selectedAsset?.currentHolder
    ? `${selectedAsset.currentHolder.fullName} (${selectedAsset.currentHolder.employeeCode || '—'})`
    : selectedAsset?.employeeNameSource || '—';

  const departmentDisplay =
    selectedAsset?.currentHolder?.department?.name ||
    selectedAsset?.department?.name ||
    selectedAsset?.location ||
    '—';

  const locationDisplay =
    selectedAsset?.currentHolder?.location?.name ||
    selectedAsset?.locationRel?.name ||
    selectedAsset?.location ||
    '—';

  const canDeactivate = hasPermission('ASSET_DEACTIVATE');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Official Documents Vault"
        subtitle="Authoritative compliance certificates, handovers, returns, transfers, clearances, and retirement orders"
        actions={
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setShowGenerateModal(true);
              handleClearSelectedAsset();
            }}
            className="flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Document</span>
          </Button>
        }
      />

      {/* Filters Card */}
      <Card className="p-4 bg-[#10141D] border-[#222A38]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              fetchDocuments();
            }}
            className="relative flex-1 min-w-[240px]"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search document no, asset, employee..."
              className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </form>

          <div className="flex items-center space-x-2 text-xs">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Document Types</option>
              <option value="HANDOVER">Asset Handover</option>
              <option value="RETURN_RECEIPT">Asset Return Receipt</option>
              <option value="TRANSFER">Asset Transfer</option>
              <option value="CLEARANCE">Employee Clearance</option>
              <option value="RETIREMENT">Asset Retirement</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="FINAL">Final</option>
              <option value="SUPERSEDED">Superseded</option>
              <option value="VOIDED">Voided</option>
            </select>

            {(search || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('ALL');
                  setStatusFilter('ALL');
                  setPage(1);
                }}
                className="px-2 py-1.5 text-slate-400 hover:text-white flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Documents Table */}
      <Card className="p-5 bg-[#10141D] border-[#222A38]">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            <span>Loading official documents vault...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-30 text-cyan-400" />
            <h4 className="text-sm font-semibold text-white">No official documents found</h4>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;Generate Document&quot; above to create an official certified document for any inventory asset.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222A38] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Document ID</th>
                  <th className="py-2.5 px-3">Document Type</th>
                  <th className="py-2.5 px-3">Target Asset</th>
                  <th className="py-2.5 px-3">Associated Party</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Generated Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2536]">
                {documents.map((d: any) => {
                  const assetDisplay = d.asset
                    ? `${d.asset.companyAssetId || d.asset.assetCode} — ${d.asset.model || d.asset.assetName || ''}`
                    : '—';
                  const empDisplay = d.employee?.fullName
                    ? `${d.employee.fullName} (${d.employee.employeeCode || '—'})`
                    : '—';

                  return (
                    <tr key={d.id} className="hover:bg-[#141923] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                        {d.documentNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C2433] text-slate-300 border border-[#2B3547]">
                          {DOCUMENT_TYPE_LABELS[d.documentType as DocumentType] || d.documentType}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white font-medium">
                        <span className="font-mono text-cyan-300 font-semibold">{d.asset?.companyAssetId || d.asset?.assetCode || '—'}</span>
                        {(d.asset?.model || d.asset?.assetName) && (
                          <span className="text-slate-400 ml-1.5 text-[11px]">
                            {d.asset.model || d.asset.assetName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-200">
                        {empDisplay}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-slate-400 text-[10px]">v{d.version}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              d.status === 'FINAL'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : d.status === 'SUPERSEDED'
                                ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                        {new Date(d.generatedAt || d.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(d.id)}
                            title="View Document Snapshot"
                            className="p-1.5 rounded hover:bg-[#1C2433] text-slate-400 hover:text-cyan-400 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(d.id)}
                            title="Download Official PDF"
                            className="p-1.5 rounded hover:bg-[#1C2433] text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(d.id)}
                            title="Print Official Document"
                            className="p-1.5 rounded hover:bg-[#1C2433] text-slate-400 hover:text-blue-400 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {d.status === 'FINAL' && (
                            <button
                              type="button"
                              onClick={() => setVoidDocId(d.id)}
                              title="Void Document"
                              className="p-1.5 rounded hover:bg-[#1C2433] text-slate-400 hover:text-amber-400 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {canDeactivate && (
                            <button
                              type="button"
                              onClick={() => setDeleteDocId(d.id)}
                              title="Delete Document"
                              className="p-1.5 rounded hover:bg-[#1C2433] text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Snapshot Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <div>
                <h3 className="text-sm font-bold text-white">Official Document Snapshot</h3>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">{previewDoc.documentNumber}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={() => handlePrint(previewDoc.id)} className="flex items-center space-x-1">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </Button>
                <Button size="sm" variant="primary" onClick={() => exportOfficialDocumentPDF(previewDoc)} className="flex items-center space-x-1">
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </Button>
                <button type="button" onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-[#141923] border border-[#232C38] flex items-center justify-between text-[11px] font-mono">
                <div>
                  <span className="text-slate-400">Integrity SHA-256 Hash:</span>
                  <p className="text-cyan-400 break-all">{previewDoc.fileHash || 'Verified'}</p>
                </div>
                <ShieldCheck className="w-6 h-6 text-emerald-400 ml-3 shrink-0" />
              </div>

              {previewDoc.parsedSnapshot && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-white border-b border-[#222A38] pb-1">
                    {previewDoc.parsedSnapshot.title}
                  </h4>

                  {previewDoc.parsedSnapshot.asset && (
                    <div className="p-3 rounded-lg bg-[#151C29] border border-[#2A374F] space-y-1">
                      <span className="font-bold text-cyan-400 uppercase text-[10px]">Asset Profile</span>
                      <p className="text-white font-mono font-semibold">
                        {previewDoc.parsedSnapshot.asset.assetCode} — {previewDoc.parsedSnapshot.asset.model || previewDoc.parsedSnapshot.asset.assetName}
                      </p>
                      <p className="text-slate-400">
                        Type: {previewDoc.parsedSnapshot.asset.assetType} | Serial: {previewDoc.parsedSnapshot.asset.serialNumber || '—'}
                      </p>
                      {previewDoc.parsedSnapshot.asset.location && (
                        <p className="text-slate-400">
                          Location: {previewDoc.parsedSnapshot.asset.location} | Department: {previewDoc.parsedSnapshot.asset.department || '—'}
                        </p>
                      )}
                    </div>
                  )}

                  {previewDoc.parsedSnapshot.employee && (
                    <div className="p-3 rounded-lg bg-[#151C29] border border-[#2A374F] space-y-1">
                      <span className="font-bold text-cyan-400 uppercase text-[10px]">Holder / Assigned Employee</span>
                      <p className="text-white font-semibold">
                        {previewDoc.parsedSnapshot.employee.fullName} ({previewDoc.parsedSnapshot.employee.employeeCode})
                      </p>
                      <p className="text-slate-400">
                        Department: {previewDoc.parsedSnapshot.employee.department || '—'} | Location: {previewDoc.parsedSnapshot.employee.location || '—'}
                      </p>
                    </div>
                  )}

                  {previewDoc.parsedSnapshot.from && previewDoc.parsedSnapshot.to && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-[#151C29] border border-[#2A374F] space-y-1">
                        <span className="font-bold text-amber-400 uppercase text-[10px]">Transfer From</span>
                        <p className="text-white font-semibold">{previewDoc.parsedSnapshot.from.employee}</p>
                        <p className="text-slate-400">{previewDoc.parsedSnapshot.from.department} ({previewDoc.parsedSnapshot.from.location})</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#151C29] border border-[#2A374F] space-y-1">
                        <span className="font-bold text-emerald-400 uppercase text-[10px]">Transfer To</span>
                        <p className="text-white font-semibold">{previewDoc.parsedSnapshot.to.employee}</p>
                        <p className="text-slate-400">{previewDoc.parsedSnapshot.to.department} ({previewDoc.parsedSnapshot.to.location})</p>
                      </div>
                    </div>
                  )}

                  {previewDoc.parsedSnapshot.items && (
                    <div className="space-y-1">
                      <span className="font-bold text-white text-[11px]">Clearance Checklist:</span>
                      <div className="divide-y divide-[#222A38] border border-[#222A38] rounded-lg">
                        {previewDoc.parsedSnapshot.items.map((i: any, idx: number) => (
                          <div key={idx} className="p-2 flex justify-between text-[11px]">
                            <span className="font-mono text-white">{i.assetCode}</span>
                            <span className="text-cyan-400 font-semibold">{i.action}</span>
                            <span className="text-slate-400">{i.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewDoc.remarks && (
                    <div className="p-3 rounded-lg bg-[#151C29] border border-[#2A374F]">
                      <span className="font-bold text-slate-300 uppercase text-[10px]">Compliance Remarks</span>
                      <p className="text-slate-400 mt-1">{previewDoc.remarks}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Void Modal */}
      {voidDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-md shadow-2xl p-5 text-xs">
            <h3 className="text-sm font-bold text-white mb-1">Void Official Document</h3>
            <p className="text-slate-400 mb-3">
              Voiding an official certificate marks it as invalid for legal and corporate compliance.
            </p>
            <form onSubmit={handleVoidSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Voiding *</label>
                <textarea
                  rows={3}
                  required
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="e.g. Issued in error, incorrect asset serial..."
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2 text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button size="sm" variant="outline" type="button" onClick={() => setVoidDocId(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={voiding}>
                  {voiding ? 'Voiding...' : 'Confirm Void'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-md shadow-2xl p-5 text-xs">
            <div className="flex items-center space-x-2 text-rose-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete Official Document</h3>
            </div>
            <p className="text-slate-400 mb-4">
              Are you sure you want to permanently delete this document record from the vault? This action is logged in the audit trail.
            </p>
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#252F42]">
              <Button size="sm" variant="outline" type="button" onClick={() => setDeleteDocId(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" type="button" onClick={handleDeleteSubmit} disabled={deleting} className="bg-rose-600 hover:bg-rose-500">
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Document Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <div>
                <h3 className="text-sm font-bold text-white">Generate Official Document</h3>
                <p className="text-xs text-slate-400 mt-0.5">Select document type and asset to auto-populate certified records</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="p-5 space-y-4 text-xs overflow-y-auto">
              {/* 1. Document Type */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  1. Document Classification *
                </label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value as DocumentType)}
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="HANDOVER">Asset Handover (Acceptance Certificate)</option>
                  <option value="RETURN_RECEIPT">Asset Return Receipt (Inspection Report)</option>
                  <option value="TRANSFER">Asset Transfer (Movement Order)</option>
                  <option value="CLEARANCE">Employee Clearance (Exit Offboarding)</option>
                  <option value="RETIREMENT">Asset Retirement (Disposal Certificate)</option>
                </select>
              </div>

              {/* 2. Asset Selection */}
              <div className="relative">
                <label className="block text-slate-300 font-medium mb-1">
                  2. Select Target Asset *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={assetSearchQuery}
                    onChange={(e) => handleAssetSearchChange(e.target.value)}
                    placeholder="Search by Asset ID (e.g. FAA-001), Model, S/N..."
                    className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 pr-9 text-white font-mono placeholder:font-sans focus:outline-none focus:border-cyan-500"
                  />
                  {searchingAssets ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  ) : selectedAsset ? (
                    <button
                      type="button"
                      onClick={handleClearSelectedAsset}
                      title="Clear selection"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  )}
                </div>

                {/* Dropdown search results */}
                {assetSearchResults.length > 0 && !selectedAsset && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-[#131924] border border-[#2B384E] rounded-lg shadow-xl divide-y divide-[#1F293B]">
                    {assetSearchResults.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleSelectAsset(asset)}
                        className="w-full text-left px-3 py-2.5 hover:bg-[#1A2333] transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-mono font-bold text-cyan-300 text-xs">
                            {asset.companyAssetId || asset.assetCode}
                          </div>
                          <div className="text-slate-300 text-[11px]">
                            {asset.model || asset.assetName} • S/N: {asset.serialNumber || '—'}
                          </div>
                        </div>
                        <div className="text-right text-[10px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {asset.allocationStatus === 'ALLOCATED' ? 'Allocated' : 'Available'}
                          </span>
                          <div className="text-slate-400 mt-0.5">
                            {asset.currentHolder?.fullName || asset.employeeNameSource || asset.location || '—'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Review Box (Auto-populated from PostgreSQL) */}
              {selectedAsset && (
                <div className="p-4 rounded-xl bg-[#141A25] border border-[#253246] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#253246]">
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Review Document Snapshot</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 uppercase">
                      {DOCUMENT_TYPE_LABELS[genType]}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Document Title</span>
                      <span className="text-white font-semibold">{DOCUMENT_TYPE_FULL_TITLES[genType]}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Authoritative Date & Time</span>
                      <span className="text-cyan-300 font-mono">{new Date().toLocaleString('en-GB')}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Asset ID & Code</span>
                      <span className="text-white font-mono font-semibold">
                        {selectedAsset.companyAssetId || selectedAsset.assetCode}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Asset Model / Name</span>
                      <span className="text-white font-semibold">
                        {selectedAsset.model || selectedAsset.assetName || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Serial Number</span>
                      <span className="text-slate-300 font-mono">{selectedAsset.serialNumber || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Asset Type & Status</span>
                      <span className="text-slate-300">
                        {selectedAsset.sourceAssetType || selectedAsset.assetType || '—'} ({selectedAsset.sourceAssetStatus || selectedAsset.status || '—'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Assigned Employee</span>
                      <span className="text-white font-medium">{employeeDisplay}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Department & Location</span>
                      <span className="text-slate-300">
                        {departmentDisplay} • {locationDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Remarks / Compliance Notes */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  3. Remarks / Compliance Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={genRemarks}
                  onChange={(e) => setGenRemarks(e.target.value)}
                  placeholder="Official notes, reason, or condition details..."
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Actions & Double-Submission Protection */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-[#252F42]">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  type="submit"
                  disabled={generating || !selectedAsset || loadingAssetDetails}
                  className="flex items-center space-x-1.5"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating & Persisting...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Generate Document</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
