import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import {
  RetirementCandidate,
  RetirementRecord,
  RetirementReason,
  DisposalMethod,
  DataSanitizationStatus,
} from '../types';
import { exportRetirementsToExcel, exportOfficialDocumentPDF } from '../utils/exporters';
import {
  Archive,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  X,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const Retirement: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'CANDIDATES' | 'RECORDS'>('CANDIDATES');

  // Candidates State
  const [candidates, setCandidates] = useState<RetirementCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState<boolean>(true);

  // Records State
  const [records, setRecords] = useState<RetirementRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(true);

  // Propose Modal
  const [proposingAsset, setProposingAsset] = useState<RetirementCandidate | null>(null);
  const [reason, setReason] = useState<RetirementReason>('END_OF_LIFE');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [replacementAssetId, setReplacementAssetId] = useState<string>('');
  const [proposeRemarks, setProposeRemarks] = useState<string>('');
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [proposing, setProposing] = useState<boolean>(false);

  // Complete / Execute Modal
  const [selectedRecord, setSelectedRecord] = useState<RetirementRecord | null>(null);
  const [sanitization, setSanitization] = useState<DataSanitizationStatus>('COMPLETED');
  const [disposalMethod, setDisposalMethod] = useState<DisposalMethod>('ELECTRONIC_WASTE_RECYCLER');
  const [disposalVendor, setDisposalVendor] = useState<string>('');
  const [disposalReference, setDisposalReference] = useState<string>('');
  const [residualValue, setResidualValue] = useState<string>('');
  const [finalLocation, setFinalLocation] = useState<string>('Decommissioned Facility');
  const [executing, setExecuting] = useState<boolean>(false);

  // Comparison Modal
  const [comparisonData, setComparisonData] = useState<any | null>(null);

  const fetchCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const res: any = await api.get('/retirements/candidates');
      const data = res?.data ?? res;
      if (Array.isArray(data)) {
        setCandidates(data);
      }
    } catch {
      showToast('Failed to load retirement candidates', 'error');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const res: any = await api.get('/retirements?limit=50');
      const data = res?.data ?? res;
      if (data?.retirements) {
        setRecords(data.retirements);
        setTotalRecords(data.total);
      }
    } catch {
      showToast('Failed to load retirement history', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'CANDIDATES') {
      fetchCandidates();
    } else {
      fetchRecords();
    }
  }, [activeTab]);

  const openProposeModal = async (c: RetirementCandidate) => {
    setProposingAsset(c);
    setReason('END_OF_LIFE');
    setOverrideReason('');
    setReplacementAssetId('');
    setProposeRemarks('');

    try {
      const res: any = await api.get('/assets?status=AVAILABLE&limit=50');
      const data = res?.data?.assets || res?.data || [];
      setAvailableAssets(data);
    } catch {}
  };

  const handleProposeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposingAsset) return;

    setProposing(true);
    try {
      await api.post('/retirements/request', {
        assetId: proposingAsset.assetId,
        reason,
        overrideReason,
        replacementAssetId: replacementAssetId || undefined,
        remarks: proposeRemarks,
      });
      showToast('Retirement request initiated successfully', 'success');
      setProposingAsset(null);
      fetchCandidates();
    } catch (err: any) {
      showToast(err.message || 'Failed to request retirement', 'error');
    } finally {
      setProposing(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setExecuting(true);
    try {
      await api.post(`/retirements/${selectedRecord.id}/complete`, {
        dataSanitizationStatus: sanitization,
        disposalMethod,
        disposalVendor,
        disposalReference,
        residualValue: residualValue ? parseFloat(residualValue) : undefined,
        finalLocation,
      });
      showToast('Asset officially retired and decommissioned', 'success');
      setSelectedRecord(null);

      // Automatically generate Step 14 Retirement Certificate
      const docRes: any = await api.post('/documents', {
        type: 'RETIREMENT',
        relatedEntityId: selectedRecord.id,
        remarks: `Disposal via ${disposalMethod}`,
      });
      if (docRes?.data) {
        exportOfficialDocumentPDF(docRes.data);
      }

      fetchRecords();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete retirement', 'error');
    } finally {
      setExecuting(false);
    }
  };

  const handleOpenComparison = async (oldAssetId: string, repAssetId: string) => {
    try {
      const res: any = await api.get(`/retirements/compare?oldAssetId=${oldAssetId}&replacementAssetId=${repAssetId}`);
      if (res?.data) {
        setComparisonData(res.data);
      }
    } catch {
      showToast('Failed to load asset comparison', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Retirement & Replacement Management"
        subtitle="Transparent end-of-life candidate scoring, approval dispatch, data sanitization tracking, and replacement comparisons."
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={<FileSpreadsheet className="w-4 h-4" />}
            onClick={() => {
              exportRetirementsToExcel(records);
              showToast('Retirement records exported to Excel', 'success');
            }}
          >
            Export XLSX
          </Button>
        }
      />

      {/* Primary Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#232C38] pb-1 text-xs">
        <button
          onClick={() => setActiveTab('CANDIDATES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg font-semibold transition-colors ${
            activeTab === 'CANDIDATES'
              ? 'bg-[#141923] text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white hover:bg-[#141923]/40'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Retirement Candidate Engine ({candidates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RECORDS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg font-semibold transition-colors ${
            activeTab === 'RECORDS'
              ? 'bg-[#141923] text-cyan-400 border-b-2 border-cyan-400'
              : 'text-slate-400 hover:text-white hover:bg-[#141923]/40'
          }`}
        >
          <Archive className="w-4 h-4" />
          <span>Decommission & Disposal Vault ({totalRecords})</span>
        </button>
      </div>

      {/* TAB 1: CANDIDATES */}
      {activeTab === 'CANDIDATES' && (
        <div className="space-y-4">
          <Card className="p-4 bg-[#10141D] border-[#222A38]">
            <p className="text-xs text-slate-300">
              The candidate engine continuously evaluates the fleet against transparent lifecycle criteria:
              <strong> age &ge; 5 years (purchaseDate only)</strong>, <strong>&ge; 4 repair tickets</strong>, <strong>repair cost &ge; Rs. 20,000</strong>, <strong>condition DAMAGED/CRITICAL</strong>, and <strong>expired warranty coverage</strong>.
            </p>
          </Card>

          {loadingCandidates ? (
            <div className="py-20 text-center text-slate-400">Evaluating hardware fleet candidates...</div>
          ) : candidates.length === 0 ? (
            <Card className="py-16 text-center text-slate-400 bg-[#10141D] border-[#222A38]">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-400" />
              <h4 className="text-sm font-semibold text-white">No assets currently recommended for retirement</h4>
              <p className="text-xs text-slate-500 mt-1">
                All active inventory meets normal age, condition, and maintenance thresholds.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {candidates.map((c) => (
                <Card key={c.assetId} className="p-5 bg-[#10141D] border-[#222A38] flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-mono font-bold text-sm text-white">{c.assetCode}</h4>
                          <span className="text-xs text-slate-300 font-semibold">• {c.assetName}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {c.assetType} | S/N: {c.serialNumber || 'N/A'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.recommendation === 'REPLACEMENT_RECOMMENDED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {c.recommendation.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-lg bg-[#141923] border border-[#232C38]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Fleet Age:</span>
                        <span className="text-white font-bold">{c.ageYears}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Condition:</span>
                        <span className="text-white font-bold">{c.condition}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Repairs Logged:</span>
                        <span className="text-white font-bold">{c.maintenanceCount} tickets</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Repair Expense:</span>
                        <span className="text-cyan-400 font-bold">
                          INR {c.maintenanceCost.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Detected Vulnerability Factors:
                      </span>
                      <ul className="space-y-1">
                        {c.reasons.map((r, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start space-x-1.5">
                            <span className="text-rose-400 mt-0.5">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#222A38] mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Holder: {c.currentHolder || 'Unassigned Stock'}
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      icon={<Archive className="w-3.5 h-3.5" />}
                      disabled={c.allocationStatus === 'ALLOCATED'}
                      onClick={() => openProposeModal(c)}
                    >
                      {c.allocationStatus === 'ALLOCATED' ? 'Allocated (Return First)' : 'Propose Retirement'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECORDS */}
      {activeTab === 'RECORDS' && (
        <Card className="p-5 bg-[#10141D] border-[#222A38]">
          {loadingRecords ? (
            <div className="py-20 text-center text-slate-400">Loading retirement records...</div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Archive className="w-10 h-10 mx-auto mb-3 opacity-30 text-rose-400" />
              <h4 className="text-sm font-semibold text-white">No retirement records found</h4>
              <p className="text-xs text-slate-500 mt-1">
                Assets proposed or approved for decommissioning will appear in this audit vault.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#222A38] text-slate-400">
                    <th className="py-2 px-3">Retirement Code</th>
                    <th className="py-2 px-3">Asset Code</th>
                    <th className="py-2 px-3">Model</th>
                    <th className="py-2 px-3">Reason</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">Requested By</th>
                    <th className="py-2 px-3">Replacement</th>
                    <th className="py-2 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D2536]">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-[#141923]">
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-400">{r.retirementCode}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">{r.asset?.assetCode}</td>
                      <td className="py-2.5 px-3 text-slate-300">{r.asset?.model}</td>
                      <td className="py-2.5 px-3 text-slate-300">{r.reason}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : r.status === 'APPROVED'
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{r.requestedBy?.username}</td>
                      <td className="py-2.5 px-3 font-mono">
                        {r.replacementAsset ? (
                          <span className="text-cyan-400">{r.replacementAsset.assetCode}</span>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-2">
                          {r.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => setSelectedRecord(r)}
                            >
                              Execute Disposal
                            </Button>
                          )}
                          {r.replacementAsset && (
                            <button
                              onClick={() => handleOpenComparison((r as any).assetId, (r as any).replacementAssetId)}
                              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center space-x-1 text-[11px]"
                            >
                              <span>Compare</span>
                              <ExternalLink className="w-3 h-3" />
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
      )}

      {/* Propose Retirement Modal */}
      {proposingAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <div>
                <h3 className="text-sm font-bold text-white">Propose Asset Retirement</h3>
                <p className="text-xs text-cyan-400 font-mono mt-0.5">
                  {proposingAsset.assetCode} — {proposingAsset.assetName}
                </p>
              </div>
              <button onClick={() => setProposingAsset(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProposeSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Primary Retirement Reason *</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as RetirementReason)}
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="END_OF_LIFE">END OF LIFE (Standard depreciation/age limit)</option>
                  <option value="OBSOLETE">OBSOLETE (Hardware unsupported by OS/apps)</option>
                  <option value="REPEATED_FAILURE">REPEATED FAILURE (Multiple service tickets)</option>
                  <option value="SEVERE_DAMAGE">SEVERE DAMAGE (Broken chassis, display, motherboard)</option>
                  <option value="UNECONOMICAL_TO_REPAIR">UNECONOMICAL TO REPAIR (Repair &gt; Asset value)</option>
                  <option value="SECURITY_SUPPORT_END">SECURITY SUPPORT END (Firmware vulnerabilities)</option>
                  <option value="OTHER">OTHER (Special circumstances)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Override / Technical Rationale</label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this unit should be taken out of service..."
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Link Available Replacement Asset</label>
                <select
                  value={replacementAssetId}
                  onChange={(e) => setReplacementAssetId(e.target.value)}
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="">-- No Immediate Replacement Required --</option>
                  {availableAssets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assetCode} — {a.model} ({a.assetType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Remarks & Decommissioning Instructions</label>
                <textarea
                  rows={2}
                  value={proposeRemarks}
                  onChange={(e) => setProposeRemarks(e.target.value)}
                  placeholder="Disposal notes, disk sanitization requirements..."
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#252F42]">
                <Button size="sm" variant="outline" type="button" onClick={() => setProposingAsset(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={proposing}>
                  {proposing ? 'Submitting...' : 'Submit to Approval Center'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Execute Disposal Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <div>
                <h3 className="text-sm font-bold text-white">Execute Final Decommission & Disposal</h3>
                <p className="text-xs text-rose-400 font-mono mt-0.5">{selectedRecord.retirementCode}</p>
              </div>
              <button onClick={() => setSelectedRecord(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Data Sanitization Status *</label>
                <select
                  value={sanitization}
                  onChange={(e) => setSanitization(e.target.value as DataSanitizationStatus)}
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="COMPLETED">COMPLETED (Drive wiped / cryptographically erased)</option>
                  <option value="VERIFIED">VERIFIED (Third-party data wipe certificate obtained)</option>
                  <option value="NOT_REQUIRED">NOT REQUIRED (Disk removed / destroyed)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Disposal Method *</label>
                <select
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value as DisposalMethod)}
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="ELECTRONIC_WASTE_RECYCLER">Electronic Waste Recycler</option>
                  <option value="BUYBACK">Vendor / OEM Buyback</option>
                  <option value="SCRAP">Scrap / Component Salvage</option>
                  <option value="DONATION">Charity / Educational Donation</option>
                  <option value="INTERNAL_REPURPOSE">Internal Repurpose (Lab/Test)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Disposal Vendor / Recycler Name</label>
                <input
                  type="text"
                  value={disposalVendor}
                  onChange={(e) => setDisposalVendor(e.target.value)}
                  placeholder="e.g. EcoRecycle Solutions Pvt Ltd"
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Vendor Receipt Reference</label>
                  <input
                    type="text"
                    value={disposalReference}
                    onChange={(e) => setDisposalReference(e.target.value)}
                    placeholder="Receipt # / Gate Pass #"
                    className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Residual Salvage Value (INR)</label>
                  <input
                    type="number"
                    value={residualValue}
                    onChange={(e) => setResidualValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Final Physical Location</label>
                <input
                  type="text"
                  value={finalLocation}
                  onChange={(e) => setFinalLocation(e.target.value)}
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#252F42]">
                <Button size="sm" variant="outline" type="button" onClick={() => setSelectedRecord(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={executing}>
                  {executing ? 'Decommissioning...' : 'Complete & Generate Certificate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Side-by-Side Replacement Comparison Modal */}
      {comparisonData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <div>
                <h3 className="text-sm font-bold text-white">Side-by-Side Replacement Comparison</h3>
                <p className="text-xs text-slate-400 mt-0.5">Hardware specifications & generation upgrade analysis.</p>
              </div>
              <button onClick={() => setComparisonData(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-2 gap-4 text-xs">
              {/* Old Asset */}
              <div className="p-4 rounded-xl bg-[#141923] border border-rose-500/30 space-y-3">
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold">
                  DECOMMISSIONED ASSET
                </span>
                <h4 className="font-mono font-bold text-white text-sm">
                  {comparisonData.oldAsset.assetCode}
                </h4>
                <p className="text-slate-300 font-semibold">{comparisonData.oldAsset.model}</p>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-400 pt-2 border-t border-[#232C38]">
                  <p>CPU: {comparisonData.oldAsset.specs?.processor || 'Standard'}</p>
                  <p>RAM: {comparisonData.oldAsset.specs?.ram || '8 GB'}</p>
                  <p>Storage: {comparisonData.oldAsset.specs?.storage || '256 GB'}</p>
                  <p>Condition: {comparisonData.oldAsset.condition}</p>
                </div>
              </div>

              {/* Replacement Asset */}
              <div className="p-4 rounded-xl bg-[#141923] border border-emerald-500/30 space-y-3">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  UPGRADE REPLACEMENT
                </span>
                <h4 className="font-mono font-bold text-white text-sm">
                  {comparisonData.replacement.assetCode}
                </h4>
                <p className="text-slate-300 font-semibold">{comparisonData.replacement.model}</p>
                <div className="space-y-1.5 font-mono text-[11px] text-slate-400 pt-2 border-t border-[#232C38]">
                  <p>CPU: {comparisonData.replacement.specs?.processor || 'High Performance'}</p>
                  <p>RAM: {comparisonData.replacement.specs?.ram || '16 GB'}</p>
                  <p>Storage: {comparisonData.replacement.specs?.storage || '512 GB SSD'}</p>
                  <p>Condition: {comparisonData.replacement.condition}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
