import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Undo2,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Edit,
  Trash2,
  FileSpreadsheet,
  PackageCheck,
  ShieldAlert,
  User,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { exportModuleToExcel } from '../utils/exporters';
import api from '../services/api';

export const Returns: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterCondition, setFilterCondition] = useState<string>('ALL');

  // Options
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [returnToEdit, setReturnToEdit] = useState<any | null>(null);
  const [returnToDelete, setReturnToDelete] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    assetId: '',
    conditionAtReturn: 'GOOD',
    accessoriesReturned: true,
    damageReported: false,
    missingAccessories: '',
    remarks: 'Routine return to IT pool',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/returns');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && Array.isArray(data)) {
        setReturns(data);
      }
    } catch (err) {
      console.error('Failed to fetch returns:', err);
      showToast('Failed to load returns.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res: any = await api.get('/returns/options');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setAssets(data.assets || []);
        setEmployees(data.employees || []);
      }
    } catch (err) {
      console.error('Failed to load return options:', err);
    }
  };

  useEffect(() => {
    fetchReturns();
    fetchOptions();
  }, []);

  const openCreateModal = () => {
    fetchOptions();
    setFormData({
      assetId: assets[0]?.id || '',
      conditionAtReturn: 'GOOD',
      accessoriesReturned: true,
      damageReported: false,
      missingAccessories: '',
      remarks: 'Routine return to IT stock pool',
    });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const validateCreate = () => {
    const errs: Record<string, string> = {};
    if (!formData.assetId) errs.assetId = 'Please select an asset being returned.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreate()) return;

    setModalLoading(true);
    try {
      const res: any = await api.post('/returns', formData);
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Asset returned to stock successfully!', 'success');
        setIsCreateOpen(false);
        fetchReturns();
        fetchOptions();
      } else {
        showToast(res?.message || 'Failed to process asset return.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error processing return.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const openEditModal = (item: any) => {
    setReturnToEdit({ ...item });
    setIsEditOpen(true);
  };

  const handleUpdateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnToEdit) return;

    setModalLoading(true);
    try {
      const res: any = await api.put(`/returns/${returnToEdit.id}`, {
        conditionAtReturn: returnToEdit.conditionAtReturn,
        accessoriesReturned: returnToEdit.accessoriesReturned,
        damageReported: returnToEdit.damageReported,
        missingAccessories: returnToEdit.missingAccessories,
        remarks: returnToEdit.remarks,
      });
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Return record updated successfully.', 'success');
        setIsEditOpen(false);
        fetchReturns();
      } else {
        showToast(res?.message || 'Failed to update return.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error updating return.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDeleteReturn = async () => {
    if (!returnToDelete) return;
    setDeleteLoading(true);
    try {
      const res: any = await api.delete(`/returns/${returnToDelete.id}`);
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Return record deleted successfully.', 'success');
        setReturnToDelete(null);
        fetchReturns();
      } else {
        showToast(res?.message || 'Failed to delete return record.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error deleting return.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      if (filterCondition === 'DAMAGE_ONLY' && !r.damageReported) return false;
      if (filterCondition === 'HEALTHY' && r.damageReported) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.assetCode.toLowerCase().includes(q) ||
          r.assetName.toLowerCase().includes(q) ||
          r.employeeName.toLowerCase().includes(q) ||
          r.conditionAtReturn.toLowerCase().includes(q) ||
          r.remarks.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [returns, search, filterCondition]);

  const healthyCount = returns.filter((r) => !r.damageReported).length;
  const damageCount = returns.filter((r) => r.damageReported).length;
  const missingAccCount = returns.filter((r) => !r.accessoriesReturned).length;

  return (
    <div className="space-y-6 font-sans pb-12">
      <PageHeader
        title="Asset Returns & Quality Inspection"
        subtitle="Manage hardware handovers, return condition diagnostics, and stock deallocations."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportModuleToExcel(returns, 'Returns');
                showToast('Excel export generated successfully.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel
            </Button>
            <Button variant="secondary" onClick={fetchReturns}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            {hasPermission('RETURN_CREATE') && (
              <Button variant="primary" onClick={openCreateModal} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-md">
                <Plus className="w-4 h-4 mr-1.5" />
                New Return
              </Button>
            )}
          </div>
        }
      />

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-textSecondary uppercase font-semibold">Total Handbacks</span>
              <div className="text-2xl font-bold font-mono text-textPrimary mt-0.5">{returns.length}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center text-brandPrimary">
              <Undo2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Healthy Hardware</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{healthyCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-rose-400 uppercase font-semibold">Damage Flagged</span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-0.5">{damageCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-semibold">Missing Parts</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{missingAccCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="p-0 overflow-hidden border-borderBase">
        {/* Controls Bar */}
        <div className="p-4 border-b border-borderBase bg-bgElevated/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-bgBase p-1 rounded-lg border border-borderBase text-xs">
            <button
              onClick={() => setFilterCondition('ALL')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterCondition === 'ALL' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              All ({returns.length})
            </button>
            <button
              onClick={() => setFilterCondition('HEALTHY')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterCondition === 'HEALTHY' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Good Condition ({healthyCount})
            </button>
            <button
              onClick={() => setFilterCondition('DAMAGE_ONLY')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterCondition === 'DAMAGE_ONLY' ? 'bg-rose-600 text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Damaged ({damageCount})
            </button>
          </div>

          <div className="relative w-72">
            <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, returned employee, notes..."
              className="w-full text-xs bg-bgBase border border-borderBase rounded-lg pl-9 pr-3 py-1.5 text-textPrimary placeholder-textSecondary focus:outline-none focus:border-brandPrimary font-mono"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-bgBase/80 border-b border-borderBase text-[10px] text-textSecondary font-mono uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Asset ID</th>
                <th className="py-3 px-4">Device Model</th>
                <th className="py-3 px-4">Returned By (Custodian)</th>
                <th className="py-3 px-4">Return Date</th>
                <th className="py-3 px-4">Condition Diagnostics</th>
                <th className="py-3 px-4">Accessories</th>
                <th className="py-3 px-4">Damage Flag</th>
                <th className="py-3 px-4">Received By IT</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase font-mono">
              {filteredReturns.map((item) => (
                <tr key={item.id} className="hover:bg-bgElevated/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-brandPrimary cursor-pointer hover:underline" onClick={() => navigate(`/assets/${item.assetId}`)}>
                    {item.assetCode}
                    <span className="text-[10px] text-textSecondary block">SN: {item.serialNumber}</span>
                  </td>

                  <td className="py-3 px-4 font-sans font-medium text-textPrimary">
                    {item.assetName}
                    <span className="text-[10px] text-textSecondary block font-mono">{item.assetType}</span>
                  </td>

                  <td className="py-3 px-4 font-sans text-textPrimary">
                    <div>{item.employeeName}</div>
                    <div className="text-[10px] text-textMuted font-mono">{item.employeeCode}</div>
                  </td>

                  <td className="py-3 px-4 text-textSecondary">
                    {new Date(item.returnDate).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4">
                    <StatusBadge status={item.conditionAtReturn} type="condition" />
                  </td>

                  <td className="py-3 px-4 font-sans">
                    {item.accessoriesReturned ? (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Missing: {item.missingAccessories}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-sans">
                    {item.damageReported ? (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/40 text-[11px]">
                        Damage Reported
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">None</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-textSecondary font-sans">
                    {item.receivedByName}
                  </td>

                  <td className="py-3 px-4 font-sans text-textSecondary max-w-xs truncate">
                    {item.remarks}
                  </td>

                  <td className="py-3 px-4 text-right font-sans">
                    <div className="flex items-center justify-end gap-1">
                      {hasPermission('RETURN_UPDATE') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          title="Edit Return Record"
                          icon={<Edit className="w-4 h-4" />}
                        />
                      )}
                      {hasPermission('RETURN_DELETE') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReturnToDelete(item)}
                          title="Delete Return"
                          className="text-rose-400 hover:text-rose-300"
                          icon={<Trash2 className="w-4 h-4" />}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredReturns.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-textSecondary">
                    <div className="w-12 h-12 rounded-full bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center text-brandPrimary mx-auto mb-3">
                      <Undo2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-textPrimary">No Return Records Yet</p>
                    <p className="text-xs text-textMuted mt-1 max-w-sm mx-auto">
                      Process the first equipment handover to safely unassign hardware and return it to IT stock.
                    </p>
                    {hasPermission('RETURN_CREATE') && (
                      <div className="mt-4">
                        <Button variant="primary" onClick={openCreateModal} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white">
                          <Plus className="w-4 h-4 mr-1.5" />
                          New Return
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Return Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Process Asset Return"
        subtitle="Deallocate an asset from its current custodian and perform diagnostic check-in."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateReturn} className="space-y-4 text-xs font-sans">
          {/* Select Asset */}
          <div>
            <label className="block text-textSecondary font-medium mb-1">
              Select Device Being Returned <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.assetId}
              onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono text-xs focus:outline-none focus:border-brandPrimary"
            >
              <option value="">-- Choose Asset --</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.companyAssetId || a.assetCode} — {a.assetName || a.model} | Custodian: {a.currentHolder?.fullName || 'Unassigned'} ({a.status})
                </option>
              ))}
            </select>
            {formErrors.assetId && <p className="text-rose-400 text-[11px] mt-1">{formErrors.assetId}</p>}
          </div>

          {/* Condition Diagnostics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Return Hardware Condition</label>
              <select
                value={formData.conditionAtReturn}
                onChange={(e) => setFormData({ ...formData, conditionAtReturn: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              >
                <option value="EXCELLENT">Excellent (Like New)</option>
                <option value="GOOD">Good (Normal Wear)</option>
                <option value="FAIR">Fair (Minor Scratches)</option>
                <option value="DAMAGED">Damaged (Requires Repair)</option>
                <option value="CRITICAL">Critical (Inoperable / Scrapped)</option>
              </select>
            </div>

            <div className="flex flex-col justify-end space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-textPrimary">
                <input
                  type="checkbox"
                  checked={formData.accessoriesReturned}
                  onChange={(e) => setFormData({ ...formData, accessoriesReturned: e.target.checked })}
                  className="rounded bg-bgBase border-borderBase text-brandPrimary focus:ring-0"
                />
                <span>All Accessories Handed In (Charger, Bag, Dongle)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-rose-300">
                <input
                  type="checkbox"
                  checked={formData.damageReported}
                  onChange={(e) => setFormData({ ...formData, damageReported: e.target.checked })}
                  className="rounded bg-bgBase border-borderBase text-rose-500 focus:ring-0"
                />
                <span>Damage Reported (Flags for Maintenance)</span>
              </label>
            </div>
          </div>

          {!formData.accessoriesReturned && (
            <div>
              <label className="block text-amber-400 font-medium mb-1">Missing Accessories Details</label>
              <input
                type="text"
                value={formData.missingAccessories}
                onChange={(e) => setFormData({ ...formData, missingAccessories: e.target.value })}
                placeholder="e.g. 65W Power Adapter missing, HDMI converter lost"
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="block text-textSecondary font-medium mb-1">Check-in Notes & Handover Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="e.g. Returned upon project completion. Hard drive wiped and re-imaged."
              rows={2}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" loading={modalLoading} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Complete Return
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Return Modal */}
      {returnToEdit && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Return Record: ${returnToEdit.assetCode}`}
          subtitle="Update condition status, reported damages, or inspection remarks."
          maxWidth="md"
        >
          <form onSubmit={handleUpdateReturn} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Condition at Return</label>
              <select
                value={returnToEdit.conditionAtReturn}
                onChange={(e) => setReturnToEdit({ ...returnToEdit, conditionAtReturn: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              >
                <option value="EXCELLENT">Excellent</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="DAMAGED">Damaged</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-textPrimary">
                <input
                  type="checkbox"
                  checked={returnToEdit.accessoriesReturned}
                  onChange={(e) => setReturnToEdit({ ...returnToEdit, accessoriesReturned: e.target.checked })}
                  className="rounded bg-bgBase border-borderBase text-brandPrimary"
                />
                <span>Accessories Returned</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-rose-300">
                <input
                  type="checkbox"
                  checked={returnToEdit.damageReported}
                  onChange={(e) => setReturnToEdit({ ...returnToEdit, damageReported: e.target.checked })}
                  className="rounded bg-bgBase border-borderBase text-rose-500"
                />
                <span>Damage Reported</span>
              </label>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Missing Accessories</label>
              <input
                type="text"
                value={returnToEdit.missingAccessories || ''}
                onChange={(e) => setReturnToEdit({ ...returnToEdit, missingAccessories: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Remarks</label>
              <textarea
                value={returnToEdit.remarks || ''}
                onChange={(e) => setReturnToEdit({ ...returnToEdit, remarks: e.target.value })}
                rows={3}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
              <Button variant="secondary" type="button" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={modalLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(returnToDelete)}
        onClose={() => setReturnToDelete(null)}
        title="Confirm Return Record Deletion"
        subtitle="Remove a return history record from the database."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <p className="font-semibold text-sm text-white mb-1">
              Delete return record for {returnToDelete?.assetCode}?
            </p>
            <p className="text-rose-200/90 text-xs leading-relaxed">
              This will remove the historical return record from the system. This deletion will be registered in the audit trail.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
            <Button variant="secondary" onClick={() => setReturnToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteLoading}
              onClick={confirmDeleteReturn}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
