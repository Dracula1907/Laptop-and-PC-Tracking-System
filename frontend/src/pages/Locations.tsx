import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '../components/PageHeader';
import { SearchInput } from '../components/SearchInput';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Location, Department, LocationCounts } from '../types';
import { exportLocationsToExcel } from '../utils/exporters';
import {
  Plus,
  Eye,
  Edit,
  MapPin,
  FileSpreadsheet,
  Users,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  PowerOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Locations: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [counts, setCounts] = useState<LocationCounts>({ total: 0, active: 0, inactive: 0 });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalRecords, setTotalRecords] = useState<number>(0);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    description: '',
    building: '',
    floor: '',
    roomZone: '',
    city: '',
    departmentId: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Details Modal State
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [selectedLoc, setSelectedLoc] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Deactivate Modal State
  const [showDeactivateModal, setShowDeactivateModal] = useState<boolean>(false);
  const [deactivatingLoc, setDeactivatingLoc] = useState<Location | null>(null);
  const [deactivating, setDeactivating] = useState<boolean>(false);

  const fetchCounts = async () => {
    try {
      const res: any = await api.get('/locations/counts');
      if (res.success) setCounts(res.data);
    } catch (err) {
      console.error('Failed to fetch location counts:', err);
    }
  };

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('isActive', statusFilter === 'ACTIVE' ? 'true' : 'false');

      const res: any = await api.get(`/locations?${params.toString()}`);
      if (res.success) {
        setLocations(res.data.locations || res.data);
        if (res.data.pagination) {
          setTotalPages(res.data.pagination.totalPages || 1);
          setTotalRecords(res.data.pagination.total || 0);
        } else {
          setTotalRecords(res.data.length || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch locations:', err);
      showToast('Error loading facility locations.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => {
    fetchCounts();
    const fetchDepts = async () => {
      try {
        const res: any = await api.get('/departments?limit=100');
        if (res.success) setDepartments(res.data.departments || res.data);
      } catch (err) {
        console.error('Failed to fetch departments for locations:', err);
      }
    };
    fetchDepts();
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openCreateModal = () => {
    setEditId(null);
    setForm({
      name: '',
      code: '',
      address: '',
      description: '',
      building: '',
      floor: '',
      roomZone: '',
      city: '',
      departmentId: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (loc: Location) => {
    setEditId(loc.id);
    setForm({
      name: loc.name,
      code: loc.code,
      address: loc.address || '',
      description: loc.description || '',
      building: loc.building || '',
      floor: loc.floor || '',
      roomZone: loc.roomZone || '',
      city: loc.city || '',
      departmentId: loc.departmentId || '',
      isActive: loc.isActive,
    });
    setShowModal(true);
  };

  const openDetailsModal = async (locId: string) => {
    setDetailsLoading(true);
    setShowDetailsModal(true);
    try {
      const res: any = await api.get(`/locations/${locId}`);
      if (res.success) setSelectedLoc(res.data);
    } catch (err) {
      showToast('Failed to load facility details.', 'error');
      setShowDetailsModal(false);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openDeactivateModal = (loc: Location) => {
    setDeactivatingLoc(loc);
    setShowDeactivateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      showToast('Location name and code are mandatory.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        departmentId: form.departmentId || null,
      };

      if (editId) {
        await api.put(`/locations/${editId}`, payload);
        showToast('Location updated successfully.', 'success');
      } else {
        await api.post('/locations', payload);
        showToast('Location created successfully.', 'success');
      }
      setShowModal(false);
      fetchLocations();
      fetchCounts();
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingLoc) return;
    setDeactivating(true);
    try {
      await api.post(`/locations/${deactivatingLoc.id}/deactivate`, {});
      showToast(`Facility "${deactivatingLoc.name}" deactivated.`, 'success');
      setShowDeactivateModal(false);
      setDeactivatingLoc(null);
      fetchLocations();
      fetchCounts();
    } catch (err: any) {
      showToast(err.message || 'Failed to deactivate location.', 'error');
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Office & Facility Locations"
        subtitle="Manage physical corporate facilities, office branches, zones, and equipment distribution."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                exportLocationsToExcel(locations);
                showToast('Locations Excel export generated.', 'success');
              }}
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Export Excel (XLSX)
            </Button>
            {hasPermission('LOCATION_MANAGE') && (
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
                Create Location
              </Button>
            )}
          </div>
        }
      />

      {/* Summary Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-[#151D2A] border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 font-mono uppercase">Total Facilities</span>
            <MapPin className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-1.5 font-mono">{counts.total}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Configured physical sites</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('ACTIVE');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'bg-[#151D2A] border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 font-mono uppercase">Active Facilities</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-300 mt-1.5 font-mono">{counts.active}</p>
          <span className="text-[11px] text-emerald-500/80 mt-0.5 block">Eligible for assignments & transfers</span>
        </div>

        <div
          onClick={() => {
            setStatusFilter('INACTIVE');
            setPage(1);
          }}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'INACTIVE'
              ? 'bg-[#151D2A] border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-[#0E131F]/80 border-[#1E2535] hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 font-mono uppercase">Decommissioned / Inactive</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-300 mt-1.5 font-mono">{counts.inactive}</p>
          <span className="text-[11px] text-rose-500/80 mt-0.5 block">Restricted from new allocations</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="w-72">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Search code, name, building, zone, city..."
            />
          </div>
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Only' },
                { value: 'INACTIVE', label: 'Inactive Only' },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>Rows:</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="bg-[#121624] border border-[#2B3550] rounded px-2 py-1 text-slate-200 text-xs outline-none"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="font-mono">
            Total: <strong className="text-white">{totalRecords}</strong>
          </span>
        </div>
      </div>

      {/* 11-Column Table */}
      <div className="bg-[#0E131F] border border-[#1E2535] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto min-w-[1350px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#1E2535] bg-[#0A0D15]/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-3 px-3.5">Location Code</th>
                <th className="py-3 px-3.5">Facility Name</th>
                <th className="py-3 px-3.5">Department / Area</th>
                <th className="py-3 px-3.5">Building</th>
                <th className="py-3 px-3.5">Floor</th>
                <th className="py-3 px-3.5">Room / Zone</th>
                <th className="py-3 px-3.5">City / Address</th>
                <th className="py-3 px-3.5 text-center">Assets Stationed</th>
                <th className="py-3 px-3.5 text-center">Staff Count</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2535]/50">
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-slate-500 font-medium">
                    Loading Location Master...
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 text-slate-500 font-medium">
                    No matching facilities found.
                  </td>
                </tr>
              ) : (
                locations.map((loc) => {
                  const empCount = loc._count?.employees || 0;
                  const assetCount = loc._count?.assets || 0;
                  return (
                    <tr
                      key={loc.id}
                      onClick={() => openDetailsModal(loc.id)}
                      className="hover:bg-[#141A28] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3.5 font-mono font-bold text-indigo-400">{loc.code}</td>
                      <td className="py-3 px-3.5 font-semibold text-slate-200 group-hover:text-white">
                        {loc.name}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">{loc.department?.name || '—'}</td>
                      <td className="py-3 px-3.5 text-slate-400">{loc.building || '—'}</td>
                      <td className="py-3 px-3.5 text-slate-400">{loc.floor || '—'}</td>
                      <td className="py-3 px-3.5 text-slate-400">{loc.roomZone || '—'}</td>
                      <td className="py-3 px-3.5 text-slate-400 max-w-xs truncate">
                        {loc.city || loc.address || '—'}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                          <Laptop className="w-3 h-3 text-indigo-400" />
                          {assetCount} Assets
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] bg-slate-800/40 text-slate-300 border border-slate-700/50">
                          <Users className="w-3 h-3 text-indigo-400" />
                          {empCount} Staff
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        {loc.isActive ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View Facility Assets & Staff"
                            onClick={() => openDetailsModal(loc.id)}
                            className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-indigo-300 hover:border-indigo-500 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {hasPermission('LOCATION_MANAGE') && (
                            <>
                              <button
                                title="Edit Location Parameters"
                                onClick={() => openEditModal(loc)}
                                className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-amber-300 hover:border-amber-500 transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {loc.isActive && (
                                <button
                                  title="Deactivate Facility Location"
                                  onClick={() => openDeactivateModal(loc)}
                                  className="p-1.5 rounded-lg bg-[#141A28] border border-[#232C3E] text-slate-400 hover:text-rose-400 hover:border-rose-500 transition-colors"
                                >
                                  <PowerOff className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E2535] bg-[#0A0D15]/60 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{locations.length ? (page - 1) * limit + 1 : 0}</strong> to{' '}
            <strong className="text-white">{Math.min(page * limit, totalRecords)}</strong> of{' '}
            <strong className="text-white">{totalRecords}</strong> locations
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="font-mono text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT LOCATION MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Facility Location Master' : 'Create New Facility Location'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Facility Code *"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="e.g. LOC-PUNE-01"
              required
            />
            <Input
              label="Location / Facility Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Faith Pune Tech Center"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Associated Department / Area"
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              options={[
                { value: '', label: 'General / Multi-Department' },
                ...departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
              ]}
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="e.g. Pune"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Building / Wing"
              value={form.building}
              onChange={(e) => setForm({ ...form, building: e.target.value })}
              placeholder="Building A"
            />
            <Input
              label="Floor"
              value={form.floor}
              onChange={(e) => setForm({ ...form, floor: e.target.value })}
              placeholder="2nd Floor"
            />
            <Input
              label="Room / Zone"
              value={form.roomZone}
              onChange={(e) => setForm({ ...form, roomZone: e.target.value })}
              placeholder="Automation Lab 4"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Physical Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Postal address, landmark, PIN code..."
              className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Operational Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Facility purpose, access protocols, site lead..."
              className="w-full bg-[#121624] border border-[#2B3550] rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-[#2B3550] text-indigo-600 focus:ring-0 w-4 h-4 bg-[#121624]"
              />
              <span>Facility Location is Active (Available for new asset assignments & transfers)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2535]">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {editId ? 'Save Master Updates' : 'Create Location'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* LOCATION DETAILS MODAL (Section 19) */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title={selectedLoc ? `${selectedLoc.name} (${selectedLoc.code})` : 'Facility Location Details'}
        maxWidth="xl"
      >
        {detailsLoading || !selectedLoc ? (
          <div className="py-16 text-center text-slate-400 text-xs font-mono">Loading Facility Profile...</div>
        ) : (
          <div className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Stationed Staff</span>
                <p className="text-xl font-bold font-mono text-white mt-0.5">{selectedLoc.metrics?.employeeCount || 0}</p>
                <span className="text-[10px] text-slate-500">Personnel count</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Total Assets</span>
                <p className="text-xl font-bold font-mono text-indigo-400 mt-0.5">
                  {selectedLoc.metrics?.totalAssetCount || 0}
                </p>
                <span className="text-[10px] text-slate-500">At facility</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Allocated</span>
                <p className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {selectedLoc.metrics?.allocatedAssetCount || 0}
                </p>
                <span className="text-[10px] text-slate-500">In staff hands</span>
              </div>
              <div className="p-3 rounded-lg bg-[#141A28] border border-[#232C3E]">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">In Repair</span>
                <p className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                  {selectedLoc.metrics?.maintenanceAssetCount || 0}
                </p>
                <span className="text-[10px] text-slate-500">Maintenance</span>
              </div>
            </div>

            {/* Geographical details */}
            <div className="p-3.5 rounded-lg bg-[#121624] border border-[#1E2535] text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500 block">Building / Wing</span>
                <span className="text-white font-medium">{selectedLoc.building || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Floor</span>
                <span className="text-white font-medium">{selectedLoc.floor || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Room / Zone</span>
                <span className="text-white font-medium">{selectedLoc.roomZone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">City</span>
                <span className="text-white font-medium">{selectedLoc.city || '—'}</span>
              </div>
            </div>

            {/* Assets Table */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase font-mono mb-2">
                Stationed IT Equipment ({selectedLoc.assets?.length || 0})
              </h5>
              <div className="max-h-48 overflow-y-auto border border-[#232C3E] rounded-lg bg-[#0E131F]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#0A0D15] text-slate-400 font-mono sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Asset ID</th>
                      <th className="py-2 px-3">Model</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Custodian</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2535]">
                    {!selectedLoc.assets || selectedLoc.assets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No hardware assets stationed at this facility.
                        </td>
                      </tr>
                    ) : (
                      selectedLoc.assets.map((a: any) => (
                        <tr
                          key={a.id}
                          onClick={() => navigate(`/assets/${a.id}`)}
                          className="hover:bg-[#141A28] cursor-pointer"
                        >
                          <td className="py-2 px-3 font-mono font-bold text-indigo-400">
                            {a.companyAssetId || a.assetCode}
                          </td>
                          <td className="py-2 px-3 text-slate-200">{a.model || a.assetName}</td>
                          <td className="py-2 px-3 text-slate-400">{a.assetType}</td>
                          <td className="py-2 px-3 text-slate-300">
                            {a.currentHolder ? a.currentHolder.fullName : '— (IT Stock)'}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-[10px] text-slate-300">{a.status}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Personnel Table */}
            <div>
              <h5 className="text-xs font-bold text-white uppercase font-mono mb-2">
                Stationed Personnel ({selectedLoc.employees?.length || 0})
              </h5>
              <div className="max-h-40 overflow-y-auto border border-[#232C3E] rounded-lg bg-[#0E131F]">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#0A0D15] text-slate-400 font-mono sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Employee ID</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3 text-right">Assets Held</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2535]">
                    {!selectedLoc.employees || selectedLoc.employees.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No staff stationed at this facility.
                        </td>
                      </tr>
                    ) : (
                      selectedLoc.employees.map((e: any) => (
                        <tr
                          key={e.id}
                          onClick={() => navigate(`/employees/${e.id}`)}
                          className="hover:bg-[#141A28] cursor-pointer"
                        >
                          <td className="py-2 px-3 font-mono font-bold text-indigo-400">{e.employeeCode}</td>
                          <td className="py-2 px-3 text-slate-200 font-medium">{e.fullName}</td>
                          <td className="py-2 px-3 text-slate-400">{e.department?.name || '—'}</td>
                          <td className="py-2 px-3 text-slate-300">{e.status}</td>
                          <td className="py-2 px-3 text-right font-mono text-indigo-300">
                            {e._count?.heldAssets || 0} Assets
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1E2535]">
              <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DEACTIVATE CONFIRMATION MODAL */}
      <Modal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Deactivate Facility Location"
        maxWidth="md"
      >
        {deactivatingLoc && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-amber-300">Non-Destructive Deactivation Protection</h5>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  Deactivating facility <strong className="text-white">"{deactivatingLoc.name}"</strong> will prevent
                  it from being selected in new asset assignments, transfers, or employee onboardings. Historical
                  movement and asset logs will remain intact and continue referencing this facility.
                </p>
              </div>
            </div>

            <p className="text-slate-400">
              Are you sure you want to mark this location as <strong className="text-rose-400">INACTIVE</strong>?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#1E2535]">
              <Button variant="outline" onClick={() => setShowDeactivateModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" loading={deactivating} onClick={handleDeactivate}>
                Confirm Deactivation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
