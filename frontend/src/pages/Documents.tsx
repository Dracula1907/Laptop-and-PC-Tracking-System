import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { OfficialDocument, DocumentType, DocumentStatus } from '../types';
import { exportOfficialDocumentPDF } from '../utils/exporters';
import {
  FileCheck,
  Search,
  Filter,
  Download,
  Eye,
  Plus,
  Ban,
  ShieldCheck,
  X,
  FileText,
  RotateCcw,
} from 'lucide-react';

export const Documents: React.FC = () => {
  const { showToast } = useToast();

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

  // Generate New Document Modal
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [genType, setGenType] = useState<DocumentType>('HANDOVER');
  const [genEntityId, setGenEntityId] = useState<string>('');
  const [genRemarks, setGenRemarks] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);

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
        showToast('Official PDF certificate downloaded', 'success');
      }
    } catch {
      showToast('Failed to export PDF', 'error');
    }
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidDocId) return;

    setVoiding(true);
    try {
      await api.post(`/documents/${voidDocId}/void`, { reason: voidReason });
      showToast('Document voided successfully', 'info');
      setVoidDocId(null);
      setVoidReason('');
      fetchDocuments();
    } catch (err: any) {
      showToast(err.message || 'Failed to void document', 'error');
    } finally {
      setVoiding(false);
    }
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genEntityId) {
      showToast('Please enter the Record / Entity ID', 'error');
      return;
    }

    setGenerating(true);
    try {
      const res: any = await api.post('/documents', {
        type: genType,
        relatedEntityId: genEntityId.trim(),
        remarks: genRemarks,
      });
      showToast('Official document generated successfully', 'success');
      setShowGenerateModal(false);
      setGenEntityId('');
      setGenRemarks('');
      fetchDocuments();
      if (res?.data) {
        exportOfficialDocumentPDF(res.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to generate document', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Official Document Management"
        subtitle="Cryptographically hashed handover forms, return receipts, clearance records, and retirement certificates."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowGenerateModal(true)}
          >
            Generate Document
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <Card className="p-4 bg-[#10141D] border-[#222A38]">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Total Documents</p>
          <h3 className="text-xl font-bold text-white font-mono mt-1">{total}</h3>
        </Card>
        <Card className="p-4 bg-[#10141D] border-[#222A38]">
          <p className="text-[11px] text-cyan-400 font-bold uppercase tracking-wider">Handovers</p>
          <h3 className="text-xl font-bold text-cyan-400 font-mono mt-1">
            {documents.filter((d) => d.documentType === 'HANDOVER').length}
          </h3>
        </Card>
        <Card className="p-4 bg-[#10141D] border-[#222A38]">
          <p className="text-[11px] text-indigo-400 font-bold uppercase tracking-wider">Transfers</p>
          <h3 className="text-xl font-bold text-indigo-400 font-mono mt-1">
            {documents.filter((d) => d.documentType === 'TRANSFER').length}
          </h3>
        </Card>
        <Card className="p-4 bg-[#10141D] border-[#222A38]">
          <p className="text-[11px] text-amber-400 font-bold uppercase tracking-wider">Return Receipts</p>
          <h3 className="text-xl font-bold text-amber-400 font-mono mt-1">
            {documents.filter((d) => d.documentType === 'RETURN_RECEIPT').length}
          </h3>
        </Card>
        <Card className="p-4 bg-[#10141D] border-[#222A38]">
          <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Clearances</p>
          <h3 className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {documents.filter((d) => d.documentType === 'CLEARANCE').length}
          </h3>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 bg-[#10141D] border-[#222A38]">
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
              <option value="HANDOVER">Handover Certificate</option>
              <option value="TRANSFER">Transfer Order</option>
              <option value="RETURN_RECEIPT">Return Receipt</option>
              <option value="CLEARANCE">Clearance Certificate</option>
              <option value="RETIREMENT">Retirement Certificate</option>
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
          <div className="py-16 text-center text-slate-400">Loading document vault...</div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-30 text-cyan-400" />
            <h4 className="text-sm font-semibold text-white">No official documents found</h4>
            <p className="text-xs text-slate-500 mt-1">
              Official documents are generated automatically upon handover, movement, return, clearance, and retirement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#222A38] text-slate-400">
                  <th className="py-2 px-3">Document Number</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Associated Party</th>
                  <th className="py-2 px-3">Target Asset</th>
                  <th className="py-2 px-3">Version & Status</th>
                  <th className="py-2 px-3">Generated</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2536]">
                {documents.map((d) => (
                  <tr key={d.id} className="hover:bg-[#141923]">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                      {d.documentNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1C2433] text-slate-300 border border-[#2B3547]">
                        {d.documentType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-white font-medium">
                      {d.employee?.fullName ? (
                        <span>
                          {d.employee.fullName}{' '}
                          <span className="text-slate-500 font-mono">({d.employee.employeeCode})</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">
                      {d.asset?.assetCode || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-slate-400 mr-2">v{d.version}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          d.status === 'FINAL'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : d.status === 'SUPERSEDED'
                            ? 'bg-slate-500/20 text-slate-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                      {new Date(d.generatedAt || d.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleOpenPreview(d.id)}
                          title="View Snapshot"
                          className="p-1 rounded hover:bg-[#1C2433] text-slate-400 hover:text-cyan-400"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(d.id)}
                          title="Download PDF"
                          className="p-1 rounded hover:bg-[#1C2433] text-slate-400 hover:text-emerald-400"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {d.status === 'FINAL' && (
                          <button
                            onClick={() => setVoidDocId(d.id)}
                            title="Void Document"
                            className="p-1 rounded hover:bg-[#1C2433] text-slate-400 hover:text-rose-400"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Snapshot Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <div>
                <h3 className="text-sm font-bold text-white">Official Document Snapshot</h3>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">{previewDoc.documentNumber}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={() => exportOfficialDocumentPDF(previewDoc)}>
                  Download PDF
                </Button>
                <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-white p-1">
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
                        Type: {previewDoc.parsedSnapshot.asset.assetType} | Serial: {previewDoc.parsedSnapshot.asset.serialNumber || 'N/A'}
                      </p>
                    </div>
                  )}

                  {previewDoc.parsedSnapshot.employee && (
                    <div className="p-3 rounded-lg bg-[#151C29] border border-[#2A374F] space-y-1">
                      <span className="font-bold text-cyan-400 uppercase text-[10px]">Holder / Recipient</span>
                      <p className="text-white font-semibold">
                        {previewDoc.parsedSnapshot.employee.fullName} ({previewDoc.parsedSnapshot.employee.employeeCode})
                      </p>
                      <p className="text-slate-400">
                        Department: {previewDoc.parsedSnapshot.employee.department || '—'}
                      </p>
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

      {/* Generate Document Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <h3 className="text-sm font-bold text-white">Generate Official Certificate</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Document Classification *</label>
                <select
                  value={genType}
                  onChange={(e) => setGenType(e.target.value as DocumentType)}
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="HANDOVER">Handover & Acceptance Certificate</option>
                  <option value="TRANSFER">Transfer & Movement Order</option>
                  <option value="RETURN_RECEIPT">Return Receipt & Inspection</option>
                  <option value="CLEARANCE">Employee Exit Clearance Certificate</option>
                  <option value="RETIREMENT">Asset Retirement & Disposal Certificate</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Target Record / Entity ID *</label>
                <input
                  type="text"
                  required
                  value={genEntityId}
                  onChange={(e) => setGenEntityId(e.target.value)}
                  placeholder="e.g. Assignment ID, Transfer ID, Return ID, Clearance ID, or Retirement ID"
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Remarks / Compliance Notes</label>
                <textarea
                  rows={2}
                  value={genRemarks}
                  onChange={(e) => setGenRemarks(e.target.value)}
                  placeholder="Official notes..."
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#252F42]">
                <Button size="sm" variant="outline" type="button" onClick={() => setShowGenerateModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={generating}>
                  {generating ? 'Generating...' : 'Generate & Download PDF'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
