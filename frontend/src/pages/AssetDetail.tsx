import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { QRCodeModal } from '../components/QRCodeModal';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Asset } from '../types';
import {
  Edit,
  UserCheck,
  ArrowRightLeft,
  RotateCcw,
  Wrench,
  QrCode,
  ArrowLeft,
  Database,
  Code,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [asset, setAsset] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [employees, setEmployees] = useState<any[]>([]);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [showMaintModal, setShowMaintModal] = useState<boolean>(false);
  const [showQRModal, setShowQRModal] = useState<boolean>(false);
  const [showRawData, setShowRawData] = useState<boolean>(false);

  // Workflow Form States
  const [assignForm, setAssignForm] = useState({ employeeId: '', expectedReturnDate: '', conditionAtAssignment: 'GOOD', remarks: '' });
  const [transferForm, setTransferForm] = useState({ newHolderId: '', reason: '', remarks: '' });
  const [returnForm, setReturnForm] = useState({ conditionAtReturn: 'GOOD', accessoriesReturned: true, damageReported: false, missingAccessories: '', remarks: '' });
  const [maintForm, setMaintForm] = useState({ issueTitle: '', issueDescription: '', technician: '', serviceProvider: '', repairCost: '' });
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchAsset = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/assets/${id}`);
      const isSuccess = res?.success ?? res?.data?.success;
      const data = res?.data ?? res;
      if (isSuccess && data) {
        setAsset(data);
      }
    } catch {
      showToast('Failed to load asset details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAsset();

    const fetchEmps = async () => {
      try {
        const res: any = await api.get('/employees?limit=100&status=ACTIVE');
        const isSuccess = res?.success ?? res?.data?.success;
        const data = res?.data ?? res;
        if (isSuccess && data) setEmployees(data.employees || []);
      } catch {}
    };
    fetchEmps();
  }, [id]);

  if (loading || !asset) {
    return (
      <div className="py-20 text-center text-textSecondary">
        <div className="inline-block w-8 h-8 border-4 border-brandPrimary border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Loading Asset Specifications & Real Company History...</p>
      </div>
    );
  }

  // Workflows
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/assets/${asset.id}/assign`, assignForm);
      showToast('Asset assigned successfully!', 'success');
      setShowAssignModal(false);
      fetchAsset();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Assignment failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/assets/${asset.id}/transfer`, transferForm);
      showToast('Asset transferred successfully!', 'success');
      setShowTransferModal(false);
      fetchAsset();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Transfer failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/assets/${asset.id}/return`, returnForm);
      showToast('Asset returned successfully!', 'success');
      setShowReturnModal(false);
      fetchAsset();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Return failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMaintSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post(`/assets/${asset.id}/maintenance`, {
        ...maintForm,
        repairCost: maintForm.repairCost ? parseFloat(maintForm.repairCost) : 0,
      });
      showToast('Maintenance logged successfully!', 'success');
      setShowMaintModal(false);
      fetchAsset();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Maintenance failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const isAct = asset.sourceAssetStatus === 'Active';
  const isAlloc = asset.sourceAllocationStatus === 'Allocated' || asset.allocationStatus === 'ALLOCATED';

  const allocDateFormatted = asset.dateOfAllocation
    ? new Date(asset.dateOfAllocation).toLocaleDateString('en-GB')
    : '—';
  const deallocDateFormatted = asset.dateOfDeallocation
    ? new Date(asset.dateOfDeallocation).toLocaleDateString('en-GB')
    : '—';

  let rawDataParsed: any = null;
  try {
    if (asset.sourceRawData) rawDataParsed = JSON.parse(asset.sourceRawData);
  } catch {}

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`${asset.companyAssetId || asset.assetCode} — ${asset.assetName || asset.model}`}
        subtitle={`S/N: ${asset.serialNumber || '—'} | Registered ${new Date(asset.createdAt).toLocaleDateString()}`}
        actions={
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4 mr-1" />} onClick={() => navigate('/assets')}>
              Back
            </Button>
            <Button variant="secondary" icon={<QrCode className="w-4 h-4 mr-1" />} onClick={() => setShowQRModal(true)}>
              QR Tag
            </Button>
            {hasPermission('ASSET_UPDATE') && (
              <Button variant="secondary" icon={<Edit className="w-4 h-4 mr-1" />} onClick={() => navigate(`/assets/${asset.id}/edit`)}>
                Edit
              </Button>
            )}
            {asset.status === 'AVAILABLE' && hasPermission('ASSIGNMENT_CREATE') && (
              <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowAssignModal(true)}>
                <UserCheck className="w-4 h-4 mr-1" />
                Assign Asset
              </Button>
            )}
            {(asset.status === 'ASSIGNED' || asset.status === 'IN_USE') && hasPermission('TRANSFER_CREATE') && (
              <Button variant="primary" className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowTransferModal(true)}>
                <ArrowRightLeft className="w-4 h-4 mr-1" />
                Transfer
              </Button>
            )}
            {(asset.status === 'ASSIGNED' || asset.status === 'IN_USE') && hasPermission('RETURN_CREATE') && (
              <Button variant="primary" className="bg-amber-600 hover:bg-amber-700" onClick={() => setShowReturnModal(true)}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Return Asset
              </Button>
            )}
            {asset.status !== 'UNDER_REPAIR' && hasPermission('MAINTENANCE_CREATE') && (
              <Button variant="danger" onClick={() => setShowMaintModal(true)}>
                <Wrench className="w-4 h-4 mr-1" />
                Maintenance
              </Button>
            )}
          </div>
        }
      />

      {/* Top Banner Status & Company Identity Info */}
      <div className="bg-bgElevated border border-borderBase rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-6 flex-wrap gap-y-2">
          <div>
            <span className="text-[10px] text-textSecondary uppercase font-semibold block font-mono">Company Asset ID</span>
            <span className="text-xl font-bold text-brandPrimary font-mono mt-0.5 block">
              {asset.companyAssetId || asset.assetCode}
            </span>
          </div>

          <div className="border-l border-borderBase pl-6">
            <span className="text-[10px] text-textSecondary uppercase font-semibold block font-mono">Asset Status</span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mt-1 font-mono ${
                isAct
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {asset.sourceAssetStatus || (isAct ? 'Active' : 'Inactive')}
            </span>
          </div>

          <div className="border-l border-borderBase pl-6">
            <span className="text-[10px] text-textSecondary uppercase font-semibold block font-mono">Allocation Status</span>
            <span
              className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mt-1 font-mono ${
                isAlloc
                  ? 'bg-blue-950/40 text-blue-400 border border-blue-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              {asset.sourceAllocationStatus || (isAlloc ? 'Allocated' : 'Not Allocated')}
            </span>
          </div>

          <div className="border-l border-borderBase pl-6">
            <span className="text-[10px] text-textSecondary uppercase font-semibold block font-mono">Criticality</span>
            {asset.criticality ? (
              <span
                className={`inline-block px-2.5 py-0.5 rounded text-xs font-semibold mt-1 font-mono ${
                  asset.criticality.toLowerCase() === 'high'
                    ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                    : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                }`}
              >
                {asset.criticality}
              </span>
            ) : (
              <span className="text-zinc-500 mt-1 block font-mono">—</span>
            )}
          </div>
        </div>

        <div className="text-right text-xs">
          <p className="text-textSecondary">
            Location / Area: <strong className="text-textPrimary">{asset.location || '—'}</strong>
          </p>
          <p className="text-textSecondary mt-0.5">
            Facility: <strong className="text-textPrimary">{asset.locationRel?.name || 'Faith Automation HQ'}</strong>
          </p>
        </div>
      </div>

      {/* EXACT 16 EXCEL FIELDS PRESENTATION (Section 36) */}
      <Card
        title="Complete 16 Source Excel Fields"
        subtitle="Full 1:1 fidelity representation of the imported record. Visual '—' denotes authentic database NULL."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          {/* 1. Asset ID */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">1. Asset ID</span>
            <p className="text-sm font-bold text-brandPrimary mt-0.5">{asset.companyAssetId || asset.assetCode}</p>
          </div>

          {/* 2. Asset Name */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">2. Asset Name</span>
            <p className="text-sm font-bold text-textPrimary mt-0.5">{asset.assetName || asset.model}</p>
          </div>

          {/* 3. Asset Description */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">3. Asset Description</span>
            <p className="text-sm font-medium text-textPrimary mt-0.5">{asset.assetDescription || asset.description || '—'}</p>
          </div>

          {/* 4. Manufacturer's Serial Number */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">4. Manufacturer's Serial Number</span>
            <p className="text-sm font-bold text-textPrimary mt-0.5">{asset.serialNumber || '—'}</p>
          </div>

          {/* 5. Asset Type */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">5. Asset Type</span>
            <p className="text-sm font-bold text-textPrimary mt-0.5">{asset.sourceAssetType || asset.assetType}</p>
          </div>

          {/* 6. Asset Status */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">6. Asset Status</span>
            <p className={`text-sm font-bold mt-0.5 ${isAct ? 'text-emerald-400' : 'text-zinc-400'}`}>
              {asset.sourceAssetStatus || (isAct ? 'Active' : 'Inactive')}
            </p>
          </div>

          {/* 7. Location */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">7. Location</span>
            <p className="text-sm font-bold text-textPrimary mt-0.5">{asset.location || '—'}</p>
          </div>

          {/* 8. Allocation status */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">8. Allocation status</span>
            <p className={`text-sm font-bold mt-0.5 ${isAlloc ? 'text-blue-400' : 'text-zinc-400'}`}>
              {asset.sourceAllocationStatus || (isAlloc ? 'Allocated' : 'Not Allocated')}
            </p>
          </div>

          {/* 9. Criticality of Asset */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">9. Criticality of Asset</span>
            <p className={`text-sm font-bold mt-0.5 ${asset.criticality?.toLowerCase() === 'high' ? 'text-rose-400' : asset.criticality ? 'text-amber-400' : 'text-zinc-500'}`}>
              {asset.criticality || '—'}
            </p>
          </div>

          {/* 10. Employee Name */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">10. Employee Name</span>
            <p className="text-sm font-bold text-textPrimary mt-0.5">
              {asset.employeeNameSource || asset.holderDisplayName || '—'}
            </p>
          </div>

          {/* 11. LAN IP */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">11. LAN IP</span>
            <p className="text-sm font-medium text-textPrimary mt-0.5">{asset.lanIp || '—'}</p>
          </div>

          {/* 12. RAM */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">12. RAM</span>
            <p className="text-sm font-medium text-textPrimary mt-0.5">{asset.ram || '—'}</p>
          </div>

          {/* 13. Date of allocation */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">13. Date of allocation</span>
            <p className="text-sm font-medium text-textPrimary mt-0.5">{allocDateFormatted}</p>
          </div>

          {/* 14. Date of deallocation */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">14. Date of deallocation</span>
            <p className="text-sm font-medium text-zinc-500 mt-0.5">{deallocDateFormatted}</p>
          </div>

          {/* 15. CPU */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">15. CPU</span>
            <p className="text-sm font-bold text-textPrimary mt-0.5">{asset.cpu || '—'}</p>
          </div>

          {/* 16. LAN Mac Address */}
          <div className="p-3 bg-bgBase border border-borderBase rounded-lg">
            <span className="text-[10px] text-textSecondary uppercase block">16. LAN Mac Address</span>
            <p className="text-sm font-medium text-zinc-500 mt-0.5">{asset.lanMacAddress || '—'}</p>
          </div>
        </div>
      </Card>

      {/* Admin Source Data Section (Section 37) */}
      <Card
        title="Admin Source Data Audit"
        subtitle="Raw un-normalized imported Excel row information and verification audit trail."
      >
        <div className="space-y-3 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-bgBase border border-borderBase rounded-lg">
            <div>
              <span className="text-textSecondary block">Imported Source Row Number:</span>
              <span className="font-bold text-textPrimary text-sm">Excel Row #{asset.sourceRowNumber || 'N/A'}</span>
            </div>
            <div>
              <span className="text-textSecondary block">Import Batch ID:</span>
              <span className="font-bold text-brandPrimary">{asset.importBatchId || 'Initial Excel Migration'}</span>
            </div>
            <div>
              <span className="text-textSecondary block">Raw Asset ID Cell:</span>
              <span className="font-bold text-textPrimary">"{asset.sourceAssetId || asset.companyAssetId}"</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowRawData(!showRawData)}>
              <Code className="w-3.5 h-3.5 mr-1" />
              {showRawData ? 'Hide Raw JSON' : 'View Raw Excel Record'}
            </Button>
          </div>

          {showRawData && rawDataParsed && (
            <pre className="p-4 bg-bgBase border border-borderBase rounded-lg text-[11px] text-textSecondary overflow-x-auto">
              {JSON.stringify(rawDataParsed, null, 2)}
            </pre>
          )}
        </div>
      </Card>

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          assetCode={asset.companyAssetId || asset.assetCode}
          assetTitle={`${asset.assetName || asset.model}`}
        />
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="Assign Asset to Employee">
          <form onSubmit={handleAssignSubmit} className="space-y-4">
            <Select
              label="Select Employee"
              value={assignForm.employeeId}
              onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
              options={[{ value: '', label: '-- Select Employee --' }, ...employees.map((emp) => ({ value: emp.id, label: `${emp.fullName} (${emp.employeeCode})` }))]}
              required
            />
            <Input
              label="Expected Return Date"
              type="date"
              value={assignForm.expectedReturnDate}
              onChange={(e) => setAssignForm({ ...assignForm, expectedReturnDate: e.target.value })}
            />
            <Input
              label="Remarks / Assignment Notes"
              value={assignForm.remarks}
              onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
              placeholder="e.g., Assigned for client automation project"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Confirm Assignment</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Transfer Asset to New Holder">
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <Select
              label="Select New Employee Holder"
              value={transferForm.newHolderId}
              onChange={(e) => setTransferForm({ ...transferForm, newHolderId: e.target.value })}
              options={[{ value: '', label: '-- Select New Holder --' }, ...employees.map((emp) => ({ value: emp.id, label: `${emp.fullName} (${emp.employeeCode})` }))]}
              required
            />
            <Input
              label="Reason for Transfer"
              value={transferForm.reason}
              onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
              placeholder="e.g., Project rotation"
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Confirm Transfer</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="Return Asset & Condition Check">
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            <Select
              label="Condition At Return"
              value={returnForm.conditionAtReturn}
              onChange={(e) => setReturnForm({ ...returnForm, conditionAtReturn: e.target.value })}
              options={[
                { value: 'EXCELLENT', label: 'Excellent' },
                { value: 'GOOD', label: 'Good' },
                { value: 'FAIR', label: 'Fair' },
                { value: 'DAMAGED', label: 'Damaged' },
              ]}
              required
            />
            <Input
              label="Return Remarks"
              value={returnForm.remarks}
              onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
              placeholder="e.g., Routine hardware refresh"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowReturnModal(false)}>Cancel</Button>
              <Button variant="primary" type="submit" loading={actionLoading}>Confirm Return</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Maintenance Modal */}
      {showMaintModal && (
        <Modal isOpen={showMaintModal} onClose={() => setShowMaintModal(false)} title="Log Maintenance Ticket">
          <form onSubmit={handleMaintSubmit} className="space-y-4">
            <Input
              label="Issue Title"
              value={maintForm.issueTitle}
              onChange={(e) => setMaintForm({ ...maintForm, issueTitle: e.target.value })}
              placeholder="e.g., Display flickering"
              required
            />
            <Input
              label="Issue Description"
              value={maintForm.issueDescription}
              onChange={(e) => setMaintForm({ ...maintForm, issueDescription: e.target.value })}
              placeholder="Provide detailed description of hardware failure"
              required
            />
            <Input
              label="Technician / Service Provider"
              value={maintForm.technician}
              onChange={(e) => setMaintForm({ ...maintForm, technician: e.target.value })}
              placeholder="e.g., In-house IT or Vendor"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowMaintModal(false)}>Cancel</Button>
              <Button variant="danger" type="submit" loading={actionLoading}>Open Ticket</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
