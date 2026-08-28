import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  Edit,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  Building,
  MapPin,
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

export const Transfers: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showToast } = useToast();

  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Options State
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isEditOpen, setIsEditOpen] = useState<boolean>(false);
  const [transferToEdit, setTransferToEdit] = useState<any | null>(null);
  const [transferToDelete, setTransferToDelete] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  // Create Form State
  const [formData, setFormData] = useState({
    assetId: '',
    newHolderId: '',
    newDepartmentId: '',
    newLocationId: '',
    reason: 'Departmental project reallocation',
    remarks: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/transfers');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && Array.isArray(data)) {
        setTransfers(data);
      }
    } catch (err) {
      console.error('Failed to fetch transfers:', err);
      showToast('Failed to load transfers.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    try {
      const res: any = await api.get('/transfers/options');
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setAssets(data.assets || []);
        setEmployees(data.employees || []);
        setDepartments(data.departments || []);
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error('Failed to load transfer options:', err);
    }
  };

  useEffect(() => {
    fetchTransfers();
    fetchOptions();
  }, []);

  const openCreateModal = () => {
    fetchOptions();
    setFormData({
      assetId: assets[0]?.id || '',
      newHolderId: employees[0]?.id || '',
      newDepartmentId: employees[0]?.departmentId || '',
      newLocationId: employees[0]?.locationId || '',
      reason: 'Departmental project reallocation',
      remarks: '',
    });
    setFormErrors({});
    setIsCreateOpen(true);
  };

  const handleAssetSelect = (assetId: string) => {
    const selected = assets.find((a) => a.id === assetId);
    setFormData((prev) => ({
      ...prev,
      assetId,
    }));
  };

  const handleHolderSelect = (empId: string) => {
    const emp = employees.find((e) => e.id === empId);
    setFormData((prev) => ({
      ...prev,
      newHolderId: empId,
      newDepartmentId: emp?.departmentId || prev.newDepartmentId,
      newLocationId: emp?.locationId || prev.newLocationId,
    }));
  };

  const validateCreate = () => {
    const errs: Record<string, string> = {};
    if (!formData.assetId) errs.assetId = 'Please select an asset to transfer.';
    if (!formData.newHolderId) errs.newHolderId = 'Please select a new recipient employee.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCreate()) return;

    setModalLoading(true);
    try {
      const res: any = await api.post('/transfers', formData);
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Asset transferred successfully!', 'success');
        setIsCreateOpen(false);
        fetchTransfers();
        fetchOptions();
      } else {
        showToast(res?.message || 'Failed to transfer asset.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error processing transfer.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const openEditModal = (item: any) => {
    setTransferToEdit({ ...item });
    setIsEditOpen(true);
  };

  const handleUpdateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferToEdit) return;

    setModalLoading(true);
    try {
      const res: any = await api.put(`/transfers/${transferToEdit.id}`, {
        reason: transferToEdit.reason,
        remarks: transferToEdit.remarks,
        status: transferToEdit.status,
      });
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Transfer record updated successfully.', 'success');
        setIsEditOpen(false);
        fetchTransfers();
      } else {
        showToast(res?.message || 'Failed to update transfer.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error updating transfer.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDeleteTransfer = async () => {
    if (!transferToDelete) return;
    setDeleteLoading(true);
    try {
      const res: any = await api.delete(`/transfers/${transferToDelete.id}`);
      const isSuccess = res?.success ?? res?.data?.success;
      if (isSuccess) {
        showToast('Transfer record deleted successfully.', 'success');
        setTransferToDelete(null);
        fetchTransfers();
      } else {
        showToast(res?.message || 'Failed to delete transfer.', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Error deleting transfer.', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          t.assetCode.toLowerCase().includes(q) ||
          t.assetName.toLowerCase().includes(q) ||
          t.previousHolderName.toLowerCase().includes(q) ||
          t.newHolderName.toLowerCase().includes(q) ||
          t.newDepartmentName.toLowerCase().includes(q) ||
          t.reason.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [transfers, search, filterStatus]);

  const completedCount = transfers.filter((t) => t.status === 'COMPLETED').length;
  const pendingCount = transfers.filter((t) => t.status === 'PENDING').length;

  return (
    <div className="space-y-6 font-sans pb-12">
      <PageHeader
        title="Asset Transfers"
        subtitle="Manage inter-departmental hardware transfers, custodian reallocations, and relocation movements."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportModuleToExcel(transfers, 'Transfers');
                showToast('Excel export generated successfully.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel
            </Button>
            <Button variant="secondary" onClick={fetchTransfers}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Refresh
            </Button>
            {hasPermission('TRANSFER_CREATE') && (
              <Button variant="primary" onClick={openCreateModal} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-md">
                <Plus className="w-4 h-4 mr-1.5" />
                New Transfer
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
              <span className="text-[10px] text-textSecondary uppercase font-semibold">Total Transfers</span>
              <div className="text-2xl font-bold font-mono text-textPrimary mt-0.5">{transfers.length}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center text-brandPrimary">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Completed</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{completedCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-semibold">Pending Approval</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">{pendingCount}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-bgElevated border-borderBase">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase font-semibold">Active Locations</span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-0.5">{locations.length}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <MapPin className="w-5 h-5" />
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
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterStatus === 'ALL' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              All ({transfers.length})
            </button>
            <button
              onClick={() => setFilterStatus('COMPLETED')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterStatus === 'COMPLETED' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                filterStatus === 'PENDING' ? 'bg-brandPrimary text-white shadow-sm' : 'text-textSecondary hover:text-textPrimary'
              }`}
            >
              Pending ({pendingCount})
            </button>
          </div>

          <div className="relative w-72">
            <Search className="w-4 h-4 text-textSecondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, previous, new holder, dept..."
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
                <th className="py-3 px-4">Previous Holder</th>
                <th className="py-3 px-4">New Custodian</th>
                <th className="py-3 px-4">Previous Dept/Area</th>
                <th className="py-3 px-4">New Dept/Area</th>
                <th className="py-3 px-4">Transfer Date</th>
                <th className="py-3 px-4">Reason / Remarks</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase font-mono">
              {filteredTransfers.map((item) => (
                <tr key={item.id} className="hover:bg-bgElevated/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-brandPrimary cursor-pointer hover:underline" onClick={() => navigate(`/assets/${item.assetId}`)}>
                    {item.assetCode}
                    <span className="text-[10px] text-textSecondary block">SN: {item.serialNumber}</span>
                  </td>

                  <td className="py-3 px-4 font-sans font-medium text-textPrimary">
                    {item.assetName}
                    <span className="text-[10px] text-textSecondary block font-mono">{item.assetType}</span>
                  </td>

                  <td className="py-3 px-4 font-sans text-slate-400">
                    <div>{item.previousHolderName}</div>
                    <div className="text-[10px] text-textMuted font-mono">{item.previousHolderCode}</div>
                  </td>

                  <td className="py-3 px-4 font-sans font-semibold text-emerald-400">
                    <div>{item.newHolderName}</div>
                    <div className="text-[10px] text-textMuted font-mono">{item.newHolderCode}</div>
                  </td>

                  <td className="py-3 px-4 font-sans text-textSecondary">
                    <div>{item.previousDepartmentName}</div>
                    <div className="text-[10px] text-textMuted">{item.previousLocationName}</div>
                  </td>

                  <td className="py-3 px-4 font-sans text-textPrimary">
                    <div>{item.newDepartmentName}</div>
                    <div className="text-[10px] text-cyan-400">{item.newLocationName}</div>
                  </td>

                  <td className="py-3 px-4 text-textSecondary">
                    {new Date(item.transferDate).toLocaleDateString()}
                  </td>

                  <td className="py-3 px-4 font-sans text-textSecondary max-w-xs truncate">
                    <div>{item.reason}</div>
                    {item.remarks && <span className="text-[10px] text-textMuted block">{item.remarks}</span>}
                  </td>

                  <td className="py-3 px-4">
                    <StatusBadge status={item.status} type="workflow" />
                  </td>

                  <td className="py-3 px-4 text-right font-sans">
                    <div className="flex items-center justify-end gap-1">
                      {hasPermission('TRANSFER_UPDATE') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(item)}
                          title="Edit Transfer"
                          icon={<Edit className="w-4 h-4" />}
                        />
                      )}
                      {hasPermission('TRANSFER_DELETE') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTransferToDelete(item)}
                          title="Delete Transfer"
                          className="text-rose-400 hover:text-rose-300"
                          icon={<Trash2 className="w-4 h-4" />}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredTransfers.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-textSecondary">
                    <div className="w-12 h-12 rounded-full bg-brandPrimary/10 border border-brandPrimary/30 flex items-center justify-center text-brandPrimary mx-auto mb-3">
                      <ArrowRightLeft className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-textPrimary">No Transfer Records Yet</p>
                    <p className="text-xs text-textMuted mt-1 max-w-sm mx-auto">
                      Create the first asset transfer to begin tracking hardware movement across departments and employees.
                    </p>
                    {hasPermission('TRANSFER_CREATE') && (
                      <div className="mt-4">
                        <Button variant="primary" onClick={openCreateModal} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white">
                          <Plus className="w-4 h-4 mr-1.5" />
                          New Transfer
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

      {/* New Transfer Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Asset Transfer"
        subtitle="Transfer physical possession of an asset to a new employee and department."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs font-sans">
          {/* Select Asset */}
          <div>
            <label className="block text-textSecondary font-medium mb-1">
              Select Asset to Transfer <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.assetId}
              onChange={(e) => handleAssetSelect(e.target.value)}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary font-mono text-xs focus:outline-none focus:border-brandPrimary"
            >
              <option value="">-- Choose Asset --</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.companyAssetId || a.assetCode} — {a.assetName || a.model} | Holder: {a.currentHolder?.fullName || 'In Stock'} ({a.location || 'HQ'})
                </option>
              ))}
            </select>
            {formErrors.assetId && <p className="text-rose-400 text-[11px] mt-1">{formErrors.assetId}</p>}
          </div>

          {/* New Recipient Employee */}
          <div>
            <label className="block text-textSecondary font-medium mb-1">
              New Recipient Holder (Employee) <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.newHolderId}
              onChange={(e) => handleHolderSelect(e.target.value)}
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
            >
              <option value="">-- Choose Target Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.employeeCode}) — {emp.department?.name || 'General'}
                </option>
              ))}
            </select>
            {formErrors.newHolderId && <p className="text-rose-400 text-[11px] mt-1">{formErrors.newHolderId}</p>}
          </div>

          {/* New Department & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Target Department</label>
              <select
                value={formData.newDepartmentId}
                onChange={(e) => setFormData({ ...formData, newDepartmentId: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              >
                <option value="">-- Inherit Employee Department --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Target Location</label>
              <select
                value={formData.newLocationId}
                onChange={(e) => setFormData({ ...formData, newLocationId: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              >
                <option value="">-- Inherit Employee Location --</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transfer Reason & Remarks */}
          <div>
            <label className="block text-textSecondary font-medium mb-1">Transfer Reason</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Assigned to Site automation project, Promotion handover"
              className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
            />
          </div>

          <div>
            <label className="block text-textSecondary font-medium mb-1">Remarks & Inspection Notes</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Condition verified upon transfer. Device in excellent condition."
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
              Confirm Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Transfer Modal */}
      {transferToEdit && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title={`Edit Transfer: ${transferToEdit.assetCode}`}
          subtitle="Update transfer notes, status, or administrative remarks."
          maxWidth="md"
        >
          <form onSubmit={handleUpdateTransfer} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block text-textSecondary font-medium mb-1">Workflow Status</label>
              <select
                value={transferToEdit.status}
                onChange={(e) => setTransferToEdit({ ...transferToEdit, status: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              >
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Transfer Reason</label>
              <input
                type="text"
                value={transferToEdit.reason || ''}
                onChange={(e) => setTransferToEdit({ ...transferToEdit, reason: e.target.value })}
                className="w-full bg-bgBase border border-borderBase rounded-lg px-3 py-2 text-textPrimary text-xs focus:outline-none focus:border-brandPrimary"
              />
            </div>

            <div>
              <label className="block text-textSecondary font-medium mb-1">Remarks</label>
              <textarea
                value={transferToEdit.remarks || ''}
                onChange={(e) => setTransferToEdit({ ...transferToEdit, remarks: e.target.value })}
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
        isOpen={Boolean(transferToDelete)}
        onClose={() => setTransferToDelete(null)}
        title="Confirm Transfer Record Deletion"
        subtitle="Delete an administrative transfer entry from the movement log."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
            <p className="font-semibold text-sm text-white mb-1">
              Delete transfer record for {transferToDelete?.assetCode}?
            </p>
            <p className="text-rose-200/90 text-xs leading-relaxed">
              This will remove the historical transfer entry from the movement log. This action will be recorded in the audit log.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-borderBase">
            <Button variant="secondary" onClick={() => setTransferToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleteLoading}
              onClick={confirmDeleteTransfer}
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
