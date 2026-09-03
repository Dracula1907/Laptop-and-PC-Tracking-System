import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { Clearance, ClearanceItem, ClearanceAction } from '../types';
import { exportOfficialDocumentPDF } from '../utils/exporters';
import {
  UserX,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Laptop,
  RotateCcw,
  ArrowRightLeft,
  FileCheck,
  X,
  ShieldCheck,
  Calendar,
  Building2,
  MapPin,
} from 'lucide-react';

export const ClearanceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [clearance, setClearance] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Resolve Modal
  const [selectedItem, setSelectedItem] = useState<ClearanceItem | null>(null);
  const [action, setAction] = useState<ClearanceAction>('RETURN');
  const [condition, setCondition] = useState<string>('GOOD');
  const [damageDescription, setDamageDescription] = useState<string>('');
  const [missingAccessories, setMissingAccessories] = useState<string>('');
  const [exceptionReason, setExceptionReason] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);

  // Complete Modal
  const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [completing, setCompleting] = useState<boolean>(false);

  const fetchClearance = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res: any = await api.get(`/clearance/${id}`);
      const data = res?.data ?? res;
      setClearance(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load clearance record', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClearance();
  }, [id]);

  const handleOpenResolveModal = (item: ClearanceItem) => {
    setSelectedItem(item);
    setAction(item.action || 'RETURN');
    setCondition((item.conditionAtClearance as string) || 'GOOD');
    setDamageDescription(item.damageDescription || '');
    setMissingAccessories(item.missingAccessories || '');
    setExceptionReason(item.exceptionReason || '');
    setResolutionNotes(item.resolutionNotes || '');
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setResolving(true);
    try {
      await api.put(`/clearance/${id}/items/${selectedItem.id}`, {
        action,
        conditionAtClearance: condition,
        damageDescription,
        missingAccessories,
        exceptionReason,
        resolutionNotes,
      });
      showToast('Asset resolution recorded successfully', 'success');
      setSelectedItem(null);
      fetchClearance();
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve item', 'error');
    } finally {
      setResolving(false);
    }
  };

  const handleCompleteClearance = async () => {
    setCompleting(true);
    try {
      await api.post(`/clearance/${id}/complete`, { notes: completionNotes });
      showToast('Clearance finalized! Generating official clearance certificate...', 'success');
      setShowCompleteModal(false);

      // Generate official Document (Step 14)
      const docRes: any = await api.post('/documents', {
        type: 'CLEARANCE',
        relatedEntityId: id,
        remarks: completionNotes || 'Official exit sign-off',
      });

      if (docRes?.data) {
        exportOfficialDocumentPDF(docRes.data);
      }

      fetchClearance();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete clearance', 'error');
    } finally {
      setCompleting(false);
    }
  };

  if (loading || !clearance) {
    return <div className="py-24 text-center text-slate-400">Loading clearance file...</div>;
  }

  const items: ClearanceItem[] = clearance.items || [];
  const allResolved = items.length > 0 && items.every((i) => i.status === 'RESOLVED');
  const isCleared = clearance.status === 'CLEARED';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Back button & PageHeader */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => navigate('/clearance')}
          className="p-1.5 rounded-lg bg-[#141923] hover:bg-[#1D2536] text-slate-400 hover:text-white border border-[#232C38]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <PageHeader
            title={`Clearance Dossier: ${clearance.clearanceCode}`}
            subtitle={`Offboarding accountability tracking for ${clearance.employee?.fullName} (${clearance.employee?.employeeCode}).`}
            actions={
              !isCleared ? (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!allResolved}
                  icon={<ShieldCheck className="w-4 h-4" />}
                  onClick={() => setShowCompleteModal(true)}
                >
                  Sign-Off & Complete Clearance
                </Button>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center space-x-1.5 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>OFFBOARDING FINALIZED & SIGNED</span>
                </span>
              )
            }
          />
        </div>
      </div>

      {/* Employee & Timeline Profile Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-[#10141D] border-[#222A38] space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Employee Information</p>
          <h4 className="text-base font-bold text-white">{clearance.employee?.fullName}</h4>
          <div className="space-y-1 text-xs text-slate-400 font-mono">
            <p>Code: {clearance.employee?.employeeCode}</p>
            <p>Designation: {clearance.employee?.designation || 'Specialist'}</p>
            <p>Email: {clearance.employee?.email}</p>
          </div>
        </Card>

        <Card className="p-4 bg-[#10141D] border-[#222A38] space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Department & Location</p>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>{clearance.employee?.department?.name || 'Department Unassigned'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>{clearance.employee?.location?.name || 'Main Facility'}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-[#10141D] border-[#222A38] space-y-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Departure Timeline</p>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Exit Date:</span>
              <span className="text-white font-bold">
                {new Date(clearance.exitDate).toLocaleDateString('en-GB')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Initiated:</span>
              <span className="text-slate-300">
                {new Date(clearance.initiatedDate).toLocaleDateString('en-GB')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-cyan-400 font-bold">{clearance.status}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Asset Recovery Checklist */}
      <Card className="p-5 bg-[#10141D] border-[#222A38]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-white">Asset Recovery & Disposition Checklist</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Every asset must be inspected and resolved via Return, Transfer, Maintenance, or Approved Exception before final sign-off.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-cyan-400">
            {items.filter((i) => i.status === 'RESOLVED').length} / {items.length} Resolved
          </span>
        </div>

        {items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No active asset assignments were found for this employee. Clearance can be finalized immediately.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isResolved = item.status === 'RESOLVED';
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isResolved
                      ? 'bg-[#141923]/60 border-[#232C38]'
                      : 'bg-[#151C29] border-[#2C3B54]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2.5 rounded-lg bg-[#1E2638] text-cyan-400 border border-[#2B364D]">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-sm text-white">{item.asset?.assetCode}</span>
                          <span className="text-xs text-slate-400">• {item.asset?.model}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1D2536] text-slate-300">
                            {item.asset?.assetType}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          Serial: {item.asset?.serialNumber || 'N/A'}
                        </p>

                        {isResolved ? (
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                              ACTION: {item.action}
                            </span>
                            {item.conditionAtClearance && (
                              <span className="text-slate-400">
                                Condition: <strong className="text-white">{item.conditionAtClearance}</strong>
                              </span>
                            )}
                            {item.resolutionNotes && (
                              <span className="text-slate-400">
                                Notes: <span className="italic text-slate-300">"{item.resolutionNotes}"</span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-400/90 mt-2 font-medium">
                            Pending physical return or reassignment verification.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      {!isCleared && (
                        <Button
                          size="sm"
                          variant={isResolved ? 'outline' : 'primary'}
                          onClick={() => handleOpenResolveModal(item)}
                        >
                          {isResolved ? 'Update Resolution' : 'Resolve Asset'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Resolve Item Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <div>
                <h3 className="text-sm font-bold text-white">Resolve Clearance Asset</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {selectedItem.asset?.assetCode} — {selectedItem.asset?.model}
                </p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Clearance Action *</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as ClearanceAction)}
                  required
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="RETURN">Return to IT Stock (Standard)</option>
                  <option value="TRANSFER">Transfer to Replacement Employee</option>
                  <option value="MAINTENANCE_REQUIRED">Requires Service / Maintenance</option>
                  <option value="DAMAGED">Asset Returned Damaged</option>
                  <option value="MISSING">Asset Missing / Unrecovered</option>
                  <option value="RETAIN_EXCEPTION">Retain (Authorized Exception)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Inspection Condition *</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  required
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="NEW">NEW - Like new condition</option>
                  <option value="GOOD">GOOD - Fully operational, normal wear</option>
                  <option value="FAIR">FAIR - Operational with cosmetic flaws</option>
                  <option value="DAMAGED">DAMAGED - Physical/hardware fault</option>
                  <option value="CRITICAL">CRITICAL - Severe inoperability</option>
                </select>
              </div>

              {action === 'DAMAGED' && (
                <div>
                  <label className="block text-rose-400 font-medium mb-1">Damage Description *</label>
                  <textarea
                    rows={2}
                    value={damageDescription}
                    onChange={(e) => setDamageDescription(e.target.value)}
                    required
                    placeholder="Describe cracks, spills, or broken components..."
                    className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {action === 'RETAIN_EXCEPTION' && (
                <div>
                  <label className="block text-amber-400 font-medium mb-1">Exception Justification *</label>
                  <textarea
                    rows={2}
                    value={exceptionReason}
                    onChange={(e) => setExceptionReason(e.target.value)}
                    required
                    placeholder="Provide managerial approval reason for non-recovery..."
                    className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Missing Accessories / Peripherals</label>
                <input
                  type="text"
                  value={missingAccessories}
                  onChange={(e) => setMissingAccessories(e.target.value)}
                  placeholder="e.g. Charger, USB Dongle, Carrying Bag"
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Inspection / Resolution Notes</label>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Data wipe verified, physical inspection completed..."
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#252F42]">
                <Button size="sm" variant="outline" type="button" onClick={() => setSelectedItem(null)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={resolving}>
                  {resolving ? 'Saving...' : 'Save Resolution'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Clearance Sign-Off Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#10141D] border border-[#252F42] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-[#252F42] flex items-center justify-between bg-[#151B27]">
              <h3 className="text-sm font-bold text-white">Final Sign-Off & Official Clearance Certificate</h3>
              <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-300 leading-relaxed">
                All {items.length} assigned asset(s) have been verified and resolved. Completing this clearance will:
                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px]">
                  <li>Mark the employee clearance dossier as <strong>CLEARED</strong>.</li>
                  <li>Update employee status in directory to <strong>EXITED</strong>.</li>
                  <li>Generate and cryptographically sign the official <strong>Clearance Certificate (PDF)</strong>.</li>
                </ul>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Final Clearance Sign-Off Remarks</label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="All corporate assets and data accounts have been successfully surrendered."
                  className="w-full bg-[#181F2C] border border-[#2B3547] rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#252F42]">
                <Button size="sm" variant="outline" onClick={() => setShowCompleteModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={handleCompleteClearance} disabled={completing}>
                  {completing ? 'Completing...' : 'Sign Off & Issue Certificate'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
