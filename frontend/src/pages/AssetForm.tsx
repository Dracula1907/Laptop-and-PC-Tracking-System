import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { useToast } from '../contexts/ToastContext';
import api from '../services/api';
import { Save, ArrowLeft, Laptop, Cpu, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AssetForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form State
  const [formData, setFormData] = useState<any>({
    companyAssetId: '',
    assetName: '',
    assetDescription: '',
    manufacturer: 'Dell',
    model: 'Dell 5440',
    serialNumber: '',
    assetType: 'LAPTOP',
    sourceAssetType: 'Laptop',
    status: 'AVAILABLE',
    sourceAssetStatus: 'Active',
    allocationStatus: 'NOT_ALLOCATED',
    sourceAllocationStatus: 'Not Allocated',
    criticality: 'Medium',
    location: '',
    currentHolderId: '',
    lanIp: '',
    ram: '8GB',
    cpu: 'i5',
    lanMacAddress: '',
    dateOfAllocation: '',
    dateOfDeallocation: '',
    departmentId: '',
    locationId: '',
    notes: '',
    specifications: {
      processor: '',
      ram: '',
      storage: '512GB',
      storageType: 'SSD',
      operatingSystem: 'Windows 11 Pro',
      macAddress: '',
      ipAddress: '',
    },
  });

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [deptRes, locRes, empRes]: any = await Promise.all([
          api.get('/departments'),
          api.get('/locations'),
          api.get('/employees?limit=100'),
        ]);
        if (deptRes?.success ?? deptRes?.data?.success) setDepartments(deptRes.data?.departments || deptRes.data || []);
        if (locRes?.success ?? locRes?.data?.success) setLocations(locRes.data?.locations || locRes.data || []);
        if (empRes?.success ?? empRes?.data?.success) setEmployees(empRes.data?.employees || empRes.data || []);
      } catch (err) {
        console.error('Dropdown fetch error:', err);
      }
    };

    fetchOptions();

    if (isEdit && id) {
      const fetchAsset = async () => {
        setLoading(true);
        try {
          const res: any = await api.get(`/assets/${id}`);
          const isSuccess = res?.success ?? res?.data?.success;
          const a = res?.data || res;
          if (isSuccess && a) {
            setFormData({
              companyAssetId: a.companyAssetId || a.assetCode || '',
              assetName: a.assetName || a.model || '',
              assetDescription: a.assetDescription || '',
              manufacturer: a.manufacturer || 'Dell',
              model: a.model || '',
              serialNumber: a.serialNumber || '',
              assetType: a.assetType || 'LAPTOP',
              sourceAssetType: a.sourceAssetType || 'Laptop',
              status: a.status || 'AVAILABLE',
              sourceAssetStatus: a.sourceAssetStatus || 'Active',
              allocationStatus: a.allocationStatus || 'NOT_ALLOCATED',
              sourceAllocationStatus: a.sourceAllocationStatus || 'Not Allocated',
              criticality: a.criticality || 'Medium',
              location: a.location || '',
              currentHolderId: a.currentHolderId || '',
              lanIp: a.lanIp || '',
              ram: a.ram || '',
              cpu: a.cpu || '',
              lanMacAddress: a.lanMacAddress || '',
              dateOfAllocation: a.dateOfAllocation ? a.dateOfAllocation.split('T')[0] : '',
              dateOfDeallocation: a.dateOfDeallocation ? a.dateOfDeallocation.split('T')[0] : '',
              departmentId: a.departmentId || '',
              locationId: a.locationId || '',
              notes: a.notes || '',
              specifications: {
                processor: a.specifications?.processor || a.cpu || '',
                ram: a.specifications?.ram || a.ram || '',
                storage: a.specifications?.storage || '512GB',
                storageType: a.specifications?.storageType || 'SSD',
                operatingSystem: a.specifications?.operatingSystem || 'Windows 11 Pro',
                macAddress: a.specifications?.macAddress || a.lanMacAddress || '',
                ipAddress: a.specifications?.ipAddress || a.lanIp || '',
              },
            });
          }
        } catch (err: any) {
          showToast('Failed to load asset details', 'error');
        } finally {
          setLoading(false);
        }
      };

      fetchAsset();
    }
  }, [id, isEdit]);

  const handleChange = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.companyAssetId?.trim()) {
      errs.companyAssetId = 'Asset ID is required (e.g. FAA-001)';
    }
    if (!formData.assetName?.trim()) {
      errs.assetName = 'Asset Name is required (e.g. Dell 5440)';
    }
    if (formData.lanIp && !/^(\d{1,3}\.){3}\d{1,3}$/.test(formData.lanIp.trim())) {
      errs.lanIp = 'Enter a valid IPv4 address (e.g. 192.168.1.50)';
    }
    if (formData.lanMacAddress && !/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(formData.lanMacAddress.trim())) {
      errs.lanMacAddress = 'Enter a valid MAC address (e.g. 00:1A:2B:3C:4D:5E)';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Please correct the highlighted validation errors.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Map allocation status
      const isAllocated = formData.allocationStatus === 'ALLOCATED' || formData.sourceAllocationStatus === 'Allocated';
      const payload = {
        ...formData,
        companyAssetId: formData.companyAssetId.trim(),
        assetName: formData.assetName.trim(),
        allocationStatus: isAllocated ? 'ALLOCATED' : 'NOT_ALLOCATED',
        sourceAllocationStatus: isAllocated ? 'Allocated' : 'Not Allocated',
        currentHolderId: formData.currentHolderId || null,
        departmentId: formData.departmentId || null,
        locationId: formData.locationId || null,
        specifications: {
          ...formData.specifications,
          processor: formData.cpu || formData.specifications?.processor,
          ram: formData.ram || formData.specifications?.ram,
          ipAddress: formData.lanIp || formData.specifications?.ipAddress,
          macAddress: formData.lanMacAddress || formData.specifications?.macAddress,
        },
      };

      if (isEdit) {
        const res: any = await api.put(`/assets/${id}`, payload);
        if (res?.success ?? res?.data?.success) {
          showToast(`Asset ${formData.companyAssetId} updated successfully!`, 'success');
          navigate('/assets');
        } else {
          showToast(res?.message || 'Failed to update asset', 'error');
        }
      } else {
        const res: any = await api.post('/assets', payload);
        if (res?.success ?? res?.data?.success) {
          showToast(`Asset ${formData.companyAssetId} registered successfully!`, 'success');
          navigate('/assets');
        } else {
          showToast(res?.message || 'Failed to register asset', 'error');
        }
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to save asset.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-slate-400 font-mono">Loading Asset Information...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto font-sans pb-12">
      <PageHeader
        title={isEdit ? `Edit Asset: ${formData.companyAssetId}` : 'Register New IT Asset'}
        subtitle="Manage hardware configuration, serial numbers, custodian allocations, and network identity."
        actions={
          <Button variant="secondary" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/assets')}>
            Back to Inventory
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* GROUP 1: Primary Asset Identity */}
        <Card title="1. Asset Identity & Core Classification" subtitle="Official Asset ID and hardware model specifications">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">
                Asset ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.companyAssetId}
                onChange={(e) => handleChange('companyAssetId', e.target.value)}
                placeholder="e.g. FAA-001"
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 uppercase font-bold"
              />
              {errors.companyAssetId && <p className="text-rose-400 text-[11px] mt-1">{errors.companyAssetId}</p>}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Asset Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.assetName}
                onChange={(e) => handleChange('assetName', e.target.value)}
                placeholder="e.g. Dell 5440"
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
              />
              {errors.assetName && <p className="text-rose-400 text-[11px] mt-1">{errors.assetName}</p>}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Asset Description</label>
              <input
                type="text"
                value={formData.assetDescription}
                onChange={(e) => handleChange('assetDescription', e.target.value)}
                placeholder="e.g. In Use, Site use Laptop"
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Manufacturer's Serial Number</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                placeholder="e.g. 7XYZ99"
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Asset Type</label>
              <select
                value={formData.sourceAssetType}
                onChange={(e) => {
                  handleChange('sourceAssetType', e.target.value);
                  const mapType: any = { Laptop: 'LAPTOP', 'Office PC': 'DESKTOP', 'Work Station': 'WORKSTATION' };
                  handleChange('assetType', mapType[e.target.value] || 'LAPTOP');
                }}
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Laptop">Laptop</option>
                <option value="Office PC">Office PC</option>
                <option value="Work Station">Work Station</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Asset Status</label>
              <select
                value={formData.sourceAssetStatus}
                onChange={(e) => {
                  handleChange('sourceAssetStatus', e.target.value);
                  handleChange('status', e.target.value === 'Active' ? 'AVAILABLE' : 'UNDER_REPAIR');
                }}
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </Card>

        {/* GROUP 2: Allocation, Custodian & Location */}
        <Card title="2. Allocation & Custodian Mapping" subtitle="Current holder, department, physical location, and criticality">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Allocation Status</label>
              <select
                value={formData.sourceAllocationStatus}
                onChange={(e) => {
                  handleChange('sourceAllocationStatus', e.target.value);
                  handleChange('allocationStatus', e.target.value === 'Allocated' ? 'ALLOCATED' : 'NOT_ALLOCATED');
                }}
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Allocated">Allocated</option>
                <option value="Not Allocated">Not Allocated</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Assigned Custodian (Employee)</label>
              <select
                value={formData.currentHolderId}
                onChange={(e) => {
                  const empId = e.target.value;
                  handleChange('currentHolderId', empId);
                  const emp = employees.find((x) => x.id === empId);
                  if (emp) {
                    handleChange('employeeNameSource', emp.fullName);
                    if (emp.departmentId) handleChange('departmentId', emp.departmentId);
                    if (emp.locationId) handleChange('locationId', emp.locationId);
                    handleChange('sourceAllocationStatus', 'Allocated');
                    handleChange('allocationStatus', 'ALLOCATED');
                  }
                }}
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 font-sans"
              >
                <option value="">-- No Custodian (In IT Stock) --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Location / Project Area</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="e.g. Automation-PLC, Management, Design"
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Criticality</label>
              <select
                value={formData.criticality}
                onChange={(e) => handleChange('criticality', e.target.value)}
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Date of Allocation</label>
              <input
                type="date"
                value={formData.dateOfAllocation}
                onChange={(e) => handleChange('dateOfAllocation', e.target.value)}
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Date of Deallocation</label>
              <input
                type="date"
                value={formData.dateOfDeallocation}
                onChange={(e) => handleChange('dateOfDeallocation', e.target.value)}
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        </Card>

        {/* GROUP 3: Hardware Specifications & Network Identity */}
        <Card title="3. Technical Specifications & Network Identity" subtitle="CPU, RAM, LAN IP, and MAC address">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">CPU Processor</label>
              <input
                type="text"
                value={formData.cpu}
                onChange={(e) => handleChange('cpu', e.target.value)}
                placeholder="e.g. i3, i5, i7, Xeon"
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">RAM Capacity</label>
              <input
                type="text"
                value={formData.ram}
                onChange={(e) => handleChange('ram', e.target.value)}
                placeholder="e.g. 8GB, 16GB, 32GB"
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">LAN IP Address</label>
              <input
                type="text"
                value={formData.lanIp}
                onChange={(e) => handleChange('lanIp', e.target.value)}
                placeholder="e.g. 192.168.1.15"
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              {errors.lanIp && <p className="text-rose-400 text-[11px] mt-1">{errors.lanIp}</p>}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">LAN MAC Address</label>
              <input
                type="text"
                value={formData.lanMacAddress}
                onChange={(e) => handleChange('lanMacAddress', e.target.value)}
                placeholder="e.g. 00:1A:2B:3C:4D:5E"
                className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              {errors.lanMacAddress && <p className="text-rose-400 text-[11px] mt-1">{errors.lanMacAddress}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-slate-400 mb-1 text-xs font-mono">Administrative Remarks & Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="e.g. Assigned to engineering design project team."
              rows={2}
              className="w-full bg-[#080E1C] border border-[#192A45] rounded-lg px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans"
            />
          </div>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={() => navigate('/assets')}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={submitting} className="bg-brandPrimary hover:bg-brandPrimary/90 text-white shadow-lg">
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Save Asset Changes' : 'Register Asset in Inventory'}
          </Button>
        </div>
      </form>
    </div>
  );
};
