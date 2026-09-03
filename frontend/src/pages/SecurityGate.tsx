import React, { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Camera,
  RefreshCw,
  Plus,
  X,
  ExternalLink,
  Laptop,
  Building,
  User,
  MapPin,
  Calendar,
  Layers,
  StopCircle,
  Eye,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import {
  GateKPIs,
  CurrentOutsideItem,
  GateMovementRecord,
  GateMaster,
  ScannedAssetData,
} from '../types';

export const SecurityGate: React.FC = () => {
  const { showToast } = useToast();

  // Active Main View: 'operations' | 'scanner'
  const [activeView, setActiveView] = useState<'operations' | 'scanner'>('operations');
  const [operationsTab, setOperationsTab] = useState<'outside' | 'history' | 'daily' | 'gates'>('outside');

  // KPIs
  const [kpis, setKpis] = useState<GateKPIs>({
    assetsOutside: 0,
    assetsInside: 0,
    todayOut: 0,
    todayIn: 0,
    overdueReturns: 0,
    totalMovements: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(false);

  // Current Outside Assets State
  const [outsideAssets, setOutsideAssets] = useState<CurrentOutsideItem[]>([]);
  const [outsideLoading, setOutsideLoading] = useState(false);
  const [outsideSearch, setOutsideSearch] = useState('');
  const [outsidePage, setOutsidePage] = useState(1);
  const [outsideTotalPages, setOutsideTotalPages] = useState(1);

  // Movement History State
  const [movements, setMovements] = useState<GateMovementRecord[]>([]);
  const [movementLoading, setMovementLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [historyMovementType, setHistoryMovementType] = useState<'ALL' | 'OUT' | 'IN'>('ALL');
  const [historyGateId, setHistoryGateId] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Daily Register State
  const [dailyDate, setDailyDate] = useState(new Date().toISOString().slice(0, 10));
  const [dailyRegister, setDailyRegister] = useState<any[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);

  // Gate Master State
  const [gates, setGates] = useState<GateMaster[]>([]);
  const [gatesLoading, setGatesLoading] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);
  const [gateForm, setGateForm] = useState({ name: '', code: '', location: '' });

  // Guard Scanner State
  const [scannerTokenInput, setScannerTokenInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannedAsset, setScannedAsset] = useState<ScannedAssetData | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  // Action Modals
  const [showOutModal, setShowOutModal] = useState(false);
  const [showInModal, setShowInModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [outForm, setOutForm] = useState({
    gateId: '',
    destination: '',
    purpose: '',
    expectedReturn: '',
    remarks: '',
  });

  const [inForm, setInForm] = useState({
    gateId: '',
    remarks: '',
  });

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastMovementIdRef = useRef<string | null>(null);

  // Inspected Asset Modal (Full Profile)
  const [inspectedAssetId, setInspectedAssetId] = useState<string | null>(null);
  const [inspectedAsset, setInspectedAsset] = useState<any>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const handleInspectAsset = async (assetId: string) => {
    setInspectedAssetId(assetId);
    setInspectLoading(true);
    try {
      const res = await api.get(`/assets/${assetId}`);
      if (res.data.success) {
        setInspectedAsset(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load asset details', 'error');
    } finally {
      setInspectLoading(false);
    }
  };

  // Live Auto-Refresh Polling every 4 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get('/security-gate/last-movement');
        if (res.data.success && res.data.data) {
          const latestId = res.data.data.id;
          if (lastMovementIdRef.current && lastMovementIdRef.current !== latestId) {
            // New movement detected! Auto refresh view smoothly
            fetchKPIs();
            if (operationsTab === 'outside') fetchOutsideAssets();
            if (operationsTab === 'history') fetchMovementHistory();
            if (operationsTab === 'daily') fetchDailyRegister();
          }
          lastMovementIdRef.current = latestId;
        }
      } catch (e) {
        // Silently catch polling errors
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [operationsTab]);

  // Load KPIs and Gates on Mount
  useEffect(() => {
    fetchKPIs();
    fetchGates();
  }, []);

  useEffect(() => {
    if (activeView === 'operations') {
      if (operationsTab === 'outside') fetchOutsideAssets();
      if (operationsTab === 'history') fetchMovementHistory();
      if (operationsTab === 'daily') fetchDailyRegister();
      if (operationsTab === 'gates') fetchGates();
    }
  }, [
    activeView,
    operationsTab,
    outsidePage,
    outsideSearch,
    historyPage,
    historyMovementType,
    historyGateId,
    historyStartDate,
    historyEndDate,
    dailyDate,
  ]);

  // Clean up camera on unmount or view change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [activeView]);

  const fetchKPIs = async () => {
    try {
      setKpiLoading(true);
      const res = await api.get('/security-gate/kpis');
      if (res.data.success) {
        setKpis(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load gate KPIs', err);
    } finally {
      setKpiLoading(false);
    }
  };

  const fetchGates = async () => {
    try {
      setGatesLoading(true);
      const res = await api.get('/gates');
      if (res.data.success) {
        setGates(res.data.data);
        if (res.data.data.length > 0 && !outForm.gateId) {
          setOutForm((prev) => ({ ...prev, gateId: res.data.data[0].id }));
          setInForm((prev) => ({ ...prev, gateId: res.data.data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch gates', err);
    } finally {
      setGatesLoading(false);
    }
  };

  const fetchOutsideAssets = async () => {
    try {
      setOutsideLoading(true);
      const res = await api.get('/security-gate/current-outside', {
        params: { page: outsidePage, limit: 15, search: outsideSearch },
      });
      if (res.data.success) {
        setOutsideAssets(res.data.data.rows);
        setOutsideTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      showToast('Failed to load current outside assets', 'error');
    } finally {
      setOutsideLoading(false);
    }
  };

  const fetchMovementHistory = async () => {
    try {
      setMovementLoading(true);
      const res = await api.get('/security-gate/history', {
        params: {
          page: historyPage,
          limit: 15,
          search: historySearch,
          movementType: historyMovementType === 'ALL' ? undefined : historyMovementType,
          gateId: historyGateId || undefined,
          startDate: historyStartDate || undefined,
          endDate: historyEndDate || undefined,
        },
      });
      if (res.data.success) {
        setMovements(res.data.data.movements);
        setHistoryTotalPages(res.data.data.totalPages || 1);
      }
    } catch (err) {
      showToast('Failed to load gate movement history', 'error');
    } finally {
      setMovementLoading(false);
    }
  };

  const fetchDailyRegister = async () => {
    try {
      setDailyLoading(true);
      const res = await api.get('/security-gate/daily-register', {
        params: { date: dailyDate },
      });
      if (res.data.success) {
        setDailyRegister(res.data.data);
      }
    } catch (err) {
      showToast('Failed to load daily register', 'error');
    } finally {
      setDailyLoading(false);
    }
  };

  // Camera Scanner Functions
  const startCamera = async () => {
    try {
      setScanError(null);
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleTokenScanned(decodedText);
          stopCamera();
        },
        (errorMessage) => {
          // Ignore frequent frame-read misses
        }
      );
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera start error', err);
      setScanError(
        'Unable to access camera. Please ensure permissions are granted, or enter/scan code via USB reader.'
      );
      setCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error('Error stopping camera', e);
      }
    }
    setCameraActive(false);
  };

  const handleTokenScanned = async (rawToken: string) => {
    if (!rawToken || !rawToken.trim()) return;
    try {
      setScanning(true);
      setScanError(null);
      const token = rawToken.trim();
      const res = await api.post('/security-gate/scan', { token });
      if (res.data.success) {
        setScannedAsset(res.data.data);
        setScannerTokenInput('');
        showToast(`Asset verified: ${res.data.data.assetCode}`, 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to scan QR token.';
      setScanError(msg);
      setScannedAsset(null);
      showToast(msg, 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleManualScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (scannerTokenInput.trim()) {
      handleTokenScanned(scannerTokenInput.trim());
    }
  };

  // Check OUT Submit
  const handleRecordOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedAsset) return;
    if (!outForm.destination.trim() || !outForm.purpose.trim()) {
      showToast('Please specify Destination and Purpose.', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post('/security-gate/out', {
        assetId: scannedAsset.assetId,
        qrCodeId: scannedAsset.qrId,
        gateId: outForm.gateId || undefined,
        destination: outForm.destination.trim(),
        purpose: outForm.purpose.trim(),
        expectedReturn: outForm.expectedReturn || undefined,
        remarks: outForm.remarks.trim() || undefined,
      });

      if (res.data.success) {
        showToast(res.data.message || 'Asset checked OUT successfully!', 'success');
        setShowOutModal(false);
        setScannedAsset(null);
        fetchKPIs();
        if (operationsTab === 'outside') fetchOutsideAssets();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record asset exit.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Check IN Submit
  const handleRecordInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedAsset) return;

    try {
      setActionLoading(true);
      const res = await api.post('/security-gate/in', {
        assetId: scannedAsset.assetId,
        qrCodeId: scannedAsset.qrId,
        gateId: inForm.gateId || undefined,
        remarks: inForm.remarks.trim() || undefined,
      });

      if (res.data.success) {
        showToast(res.data.message || 'Asset checked IN successfully!', 'success');
        setShowInModal(false);
        setScannedAsset(null);
        fetchKPIs();
        if (operationsTab === 'outside') fetchOutsideAssets();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to record asset return.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Create Physical Gate
  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gateForm.name || !gateForm.code) {
      showToast('Gate name and code are required.', 'error');
      return;
    }

    try {
      const res = await api.post('/gates', gateForm);
      if (res.data.success) {
        showToast('Physical gate created successfully.', 'success');
        setShowGateModal(false);
        setGateForm({ name: '', code: '', location: '' });
        fetchGates();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create gate.', 'error');
    }
  };

  // Excel Export
  const exportHistoryToExcel = () => {
    if (!movements || movements.length === 0) {
      showToast('No movements available to export.', 'info');
      return;
    }

    const exportData = movements.map((m) => ({
      'Movement Code': m.movementCode,
      'Date & Time': new Date(m.movementDateTime).toLocaleString(),
      Type: m.movementType,
      'Asset Code': m.asset?.companyAssetId || m.asset?.assetCode || 'N/A',
      'Asset Name / Model': m.asset?.assetName || m.asset?.model || 'N/A',
      'Asset Type': m.asset?.assetType || 'N/A',
      'Current Holder': m.employee?.fullName || 'N/A',
      Department: m.department?.name || 'N/A',
      Gate: m.gate?.name || 'Gate',
      Guard: m.guardUser?.username || 'Security',
      Destination: m.destination || 'N/A',
      Purpose: m.purpose || 'N/A',
      'Expected Return': m.expectedReturn ? new Date(m.expectedReturn).toLocaleString() : 'N/A',
      'Actual Return': m.actualReturn ? new Date(m.actualReturn).toLocaleString() : 'N/A',
      Status: m.status,
      Remarks: m.remarks || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gate Movements');
    XLSX.writeFile(workbook, `Faith_Gate_Movements_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('Gate movements exported to Excel.', 'success');
  };

  const exportDailyRegisterToExcel = () => {
    if (!dailyRegister || dailyRegister.length === 0) {
      showToast('No records found for selected date.', 'info');
      return;
    }

    const exportData = dailyRegister.map((m, idx) => ({
      'S.No': idx + 1,
      'Movement Code': m.movementCode,
      'Time': new Date(m.movementDateTime).toLocaleTimeString(),
      'Direction': m.movementType,
      'Asset Code': m.asset?.companyAssetId || m.asset?.assetCode,
      'Model': m.asset?.model,
      'Holder / Employee': m.employee?.fullName || 'Stock',
      'Gate': m.gate?.name || 'Main Gate',
      'Guard': m.guardUser?.username || 'Guard',
      'Destination': m.destination || '-',
      'Purpose': m.purpose || '-',
      'Remarks': m.remarks || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Register_${dailyDate}`);
    XLSX.writeFile(workbook, `Gate_Register_${dailyDate}.xlsx`);
    showToast('Daily register exported to Excel.', 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0C1220] via-[#0E1729] to-[#0A0D18] p-5 rounded-2xl border border-cyan-950/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-950/50">
            <ScanLine className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Security Gate & Physical Asset Tracking
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Live physical presence monitoring, QR gate checkpoint, and tamper-evident audit ledger
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center p-1 bg-[#121828] border border-[#232F4D] rounded-xl shadow-inner">
          <button
            onClick={() => setActiveView('operations')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeView === 'operations'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Gate Operations & History
          </button>
          <button
            onClick={() => setActiveView('scanner')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeView === 'scanner'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Security Guard Scanner
          </button>
        </div>
      </div>

      {/* Operational KPIs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-[#0D121F] border border-cyan-900/30 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
              CURRENTLY OUTSIDE
            </span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-400 mt-2 tracking-tight">
            {kpiLoading ? '...' : kpis.assetsOutside}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Laptops / Assets off-premises</p>
        </div>

        <div className="bg-[#0D121F] border border-cyan-900/30 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              INSIDE PREMISES
            </span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-2 tracking-tight">
            {kpiLoading ? '...' : kpis.assetsInside}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Physical inventory on-site</p>
        </div>

        <div className="bg-[#0D121F] border border-cyan-900/30 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
              TODAY'S OUT
            </span>
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2 tracking-tight">
            {kpiLoading ? '...' : kpis.todayOut}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Exits recorded today</p>
        </div>

        <div className="bg-[#0D121F] border border-cyan-900/30 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
              TODAY'S IN
            </span>
            <ArrowDownLeft className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2 tracking-tight">
            {kpiLoading ? '...' : kpis.todayIn}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Returns recorded today</p>
        </div>

        <div className="bg-[#0D121F] border border-cyan-900/30 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-400">
              OVERDUE RETURNS
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-400 mt-2 tracking-tight">
            {kpiLoading ? '...' : kpis.overdueReturns}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">Past expected return date</p>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          VIEW 1: GATE OPERATIONS & HISTORY
      ────────────────────────────────────────────────────────────────────────── */}
      {activeView === 'operations' && (
        <div className="space-y-4">
          {/* Sub-Tabs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E273D] pb-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setOperationsTab('outside')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  operationsTab === 'outside'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Current Outside Assets ({kpis.assetsOutside})
              </button>
              <button
                onClick={() => setOperationsTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  operationsTab === 'history'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Movement History Register
              </button>
              <button
                onClick={() => setOperationsTab('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  operationsTab === 'daily'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Daily Gate Register
              </button>
              <button
                onClick={() => setOperationsTab('gates')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  operationsTab === 'gates'
                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Physical Gates ({gates.length})
              </button>
            </div>

            {operationsTab === 'history' && (
              <button
                onClick={exportHistoryToExcel}
                className="px-3 py-1.5 bg-[#121A2D] hover:bg-[#1A2642] text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Movement Log (XLSX)
              </button>
            )}

            {operationsTab === 'daily' && (
              <button
                onClick={exportDailyRegisterToExcel}
                className="px-3 py-1.5 bg-[#121A2D] hover:bg-[#1A2642] text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Daily Ledger (XLSX)
              </button>
            )}

            {operationsTab === 'gates' && (
              <button
                onClick={() => setShowGateModal(true)}
                className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Register New Gate
              </button>
            )}
          </div>

          {/* Sub-Tab Content 1: Currently Outside */}
          {operationsTab === 'outside' && (
            <div className="bg-[#0C101C] border border-[#1E2538] rounded-xl overflow-hidden shadow-lg">
              {/* Filter / Search */}
              <div className="p-3 border-b border-[#1E2538] flex flex-wrap items-center justify-between gap-3 bg-[#0E1424]">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={outsideSearch}
                    onChange={(e) => {
                      setOutsideSearch(e.target.value);
                      setOutsidePage(1);
                    }}
                    placeholder="Search outside assets by code, model, employee..."
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  onClick={fetchOutsideAssets}
                  className="p-2 text-slate-400 hover:text-white bg-[#121828] border border-[#212C44] rounded-lg text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2538] bg-[#0A0E18] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="p-3">Asset Code</th>
                      <th className="p-3">Model / Type</th>
                      <th className="p-3">Current Holder</th>
                      <th className="p-3">Gate Checked OUT</th>
                      <th className="p-3">Exit Date & Time</th>
                      <th className="p-3">Duration Outside</th>
                      <th className="p-3">Destination / Purpose</th>
                      <th className="p-3">Expected Return</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2234]">
                    {outsideLoading ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          Loading outside assets...
                        </td>
                      </tr>
                    ) : outsideAssets.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          No assets currently recorded outside the premises. All inventory is safely on-site!
                        </td>
                      </tr>
                    ) : (
                      outsideAssets.map((row) => (
                        <tr key={row.assetId} className="hover:bg-[#121828]/60 transition-colors">
                          <td className="p-3 font-mono font-semibold text-cyan-400">{row.assetCode}</td>
                          <td className="p-3">
                            <div className="font-medium text-white">{row.model}</div>
                            <div className="text-[10px] text-slate-400">{row.assetType}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-white font-medium">{row.holderName}</div>
                            <div className="text-[10px] text-slate-500">{row.department}</div>
                          </td>
                          <td className="p-3 text-slate-300 font-mono">{row.gateName}</td>
                          <td className="p-3 text-slate-300 font-mono">
                            {row.outDateTime ? new Date(row.outDateTime).toLocaleString() : 'N/A'}
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-medium text-amber-400">
                              {row.durationHours} hrs
                            </span>
                          </td>
                          <td className="p-3 max-w-xs truncate">
                            <span className="text-white font-medium">{row.destination}</span>
                            <span className="text-slate-400 text-[10px] block truncate">{row.purpose}</span>
                          </td>
                          <td className="p-3">
                            {row.expectedReturn ? (
                              <div
                                className={`font-mono text-[11px] ${
                                  row.isOverdue
                                    ? 'text-rose-400 font-bold flex items-center gap-1'
                                    : 'text-slate-300'
                                }`}
                              >
                                {row.isOverdue && <AlertTriangle className="w-3 h-3 text-rose-400" />}
                                {new Date(row.expectedReturn).toLocaleDateString()}
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono">Open return</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleInspectAsset(row.assetId)}
                                className="p-1.5 bg-[#172238] hover:bg-[#202E4C] text-cyan-400 rounded-lg text-[11px] font-medium transition-all"
                                title="View Complete Authorized Asset Profile"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setScannedAsset({
                                    qrId: '',
                                    token: '',
                                    qrStatus: 'ACTIVE',
                                    assetId: row.assetId,
                                    assetCode: row.assetCode,
                                    assetName: row.assetName,
                                    assetType: row.assetType,
                                    manufacturer: '',
                                    model: row.model,
                                    serialNumber: '',
                                    currentHolder: row.holderName,
                                    department: row.department,
                                    location: row.location,
                                    gatePresence: 'OUTSIDE',
                                    openOutMovement: {
                                      id: row.movementId || row.id || row.movementCode,
                                      movementCode: row.movementCode,
                                      movementDateTime: row.outDateTime || new Date().toISOString(),
                                      gateName: row.gateName,
                                      destination: row.destination,
                                      purpose: row.purpose,
                                      expectedReturn: row.expectedReturn,
                                      remarks: row.remarks,
                                      guardName: row.guardName,
                                    },

                                  });
                                  setActiveView('scanner');
                                }}
                                className="px-3 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all"
                              >
                                <ArrowDownLeft className="w-3 h-3" />
                                Check IN
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {outsideTotalPages > 1 && (
                <div className="p-3 border-t border-[#1E2538] flex items-center justify-between bg-[#0A0E18] text-xs text-slate-400 font-mono">
                  <span>
                    Page {outsidePage} of {outsideTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={outsidePage <= 1}
                      onClick={() => setOutsidePage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 bg-[#121828] border border-[#212C44] rounded disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      disabled={outsidePage >= outsideTotalPages}
                      onClick={() => setOutsidePage((p) => Math.min(outsideTotalPages, p + 1))}
                      className="px-2.5 py-1 bg-[#121828] border border-[#212C44] rounded disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab Content 2: Movement History Register */}
          {operationsTab === 'history' && (
            <div className="bg-[#0C101C] border border-[#1E2538] rounded-xl overflow-hidden shadow-lg">
              {/* Filter Toolbar */}
              <div className="p-3 border-b border-[#1E2538] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-[#0E1424]">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setHistoryPage(1);
                    }}
                    placeholder="Search movement, asset..."
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <select
                    value={historyMovementType}
                    onChange={(e) => {
                      setHistoryMovementType(e.target.value as any);
                      setHistoryPage(1);
                    }}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ALL">All Movements (IN & OUT)</option>
                    <option value="OUT">Physical Exit (OUT)</option>
                    <option value="IN">Physical Entry (IN)</option>
                  </select>
                </div>

                <div>
                  <select
                    value={historyGateId}
                    onChange={(e) => {
                      setHistoryGateId(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">All Physical Gates</option>
                    {gates.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => {
                      setHistoryStartDate(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => {
                      setHistoryEndDate(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2538] bg-[#0A0E18] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="p-3">Movement Code</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Asset Code</th>
                      <th className="p-3">Asset / Model</th>
                      <th className="p-3">Holder</th>
                      <th className="p-3">Gate</th>
                      <th className="p-3">Security Guard</th>
                      <th className="p-3">Destination / Purpose</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2234]">
                    {movementLoading ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500">
                          Loading movements...
                        </td>
                      </tr>
                    ) : movements.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500">
                          No movements found matching the selected criteria.
                        </td>
                      </tr>
                    ) : (
                      movements.map((m) => (
                        <tr key={m.id} className="hover:bg-[#121828]/60 transition-colors">
                          <td className="p-3 font-mono font-semibold text-white">{m.movementCode}</td>
                          <td className="p-3 font-mono text-slate-300">
                            {new Date(m.movementDateTime).toLocaleString()}
                          </td>
                          <td className="p-3">
                            {m.movementType === 'OUT' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                <ArrowUpRight className="w-3 h-3" /> OUT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <ArrowDownLeft className="w-3 h-3" /> IN
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-cyan-400">
                            {m.asset?.companyAssetId || m.asset?.assetCode}
                          </td>
                          <td className="p-3 text-slate-200">{m.asset?.model}</td>
                          <td className="p-3 text-slate-300">{m.employee?.fullName || 'Stock'}</td>
                          <td className="p-3 font-mono text-slate-400">{m.gate?.name || 'Gate'}</td>
                          <td className="p-3 text-slate-400">{m.guardUser?.username || 'Security'}</td>
                          <td className="p-3 max-w-xs truncate text-slate-300">
                            {m.destination ? `${m.destination} (${m.purpose})` : m.remarks || '-'}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                m.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}
                            >
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {historyTotalPages > 1 && (
                <div className="p-3 border-t border-[#1E2538] flex items-center justify-between bg-[#0A0E18] text-xs text-slate-400 font-mono">
                  <span>
                    Page {historyPage} of {historyTotalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 bg-[#121828] border border-[#212C44] rounded disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      disabled={historyPage >= historyTotalPages}
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      className="px-2.5 py-1 bg-[#121828] border border-[#212C44] rounded disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab Content 3: Daily Gate Register */}
          {operationsTab === 'daily' && (
            <div className="bg-[#0C101C] border border-[#1E2538] rounded-xl overflow-hidden shadow-lg p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1424] p-3 rounded-lg border border-[#1E2538]">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white">Select Register Date:</span>
                  <input
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className="bg-[#121828] border border-[#212C44] rounded px-3 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  Total Records on {dailyDate}: <span className="text-cyan-400 font-bold">{dailyRegister.length}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E2538] bg-[#0A0E18] text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                      <th className="p-3">Time</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Movement Code</th>
                      <th className="p-3">Asset Code</th>
                      <th className="p-3">Model</th>
                      <th className="p-3">Holder / Department</th>
                      <th className="p-3">Gate & Guard</th>
                      <th className="p-3">Destination / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A2234]">
                    {dailyLoading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          Loading daily register...
                        </td>
                      </tr>
                    ) : dailyRegister.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          No movements recorded for {dailyDate}.
                        </td>
                      </tr>
                    ) : (
                      dailyRegister.map((m) => (
                        <tr key={m.id} className="hover:bg-[#121828]/60 transition-colors">
                          <td className="p-3 font-mono font-medium text-slate-200">
                            {new Date(m.movementDateTime).toLocaleTimeString()}
                          </td>
                          <td className="p-3">
                            {m.movementType === 'OUT' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                OUT
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                IN
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-mono text-white">{m.movementCode}</td>
                          <td className="p-3 font-mono text-cyan-400">
                            {m.asset?.companyAssetId || m.asset?.assetCode}
                          </td>
                          <td className="p-3 text-slate-300">{m.asset?.model}</td>
                          <td className="p-3 text-slate-300">
                            {m.employee?.fullName || 'Stock'}
                            {m.department?.name && (
                              <span className="text-slate-500 text-[10px] block">{m.department.name}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-300">
                            {m.gate?.name || 'Gate'}
                            <span className="text-slate-500 text-[10px] block">
                              Guard: {m.guardUser?.username || 'Security'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300">
                            {m.destination ? `${m.destination} (${m.purpose})` : m.remarks || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sub-Tab Content 4: Gate Masters */}
          {operationsTab === 'gates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {gates.map((g) => (
                <div
                  key={g.id}
                  className="bg-[#0C101C] border border-[#1E2538] rounded-xl p-4 shadow-md space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
                      {g.code}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{g.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {g.location || 'Premises Perimeter'}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#1E2538] flex justify-between text-xs font-mono text-slate-400">
                    <span>Movements:</span>
                    <span className="text-white font-bold">{g._count?.movements || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          VIEW 2: SECURITY GUARD SCANNER STATION
      ────────────────────────────────────────────────────────────────────────── */}
      {activeView === 'scanner' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Scanning Terminal */}
          <div className="lg:col-span-5 bg-[#0C101C] border border-[#1E2538] rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#1E2538] pb-3">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">QR Scanning Terminal</h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                LAN Ready
              </span>
            </div>

            {/* Camera Viewport Container */}
            <div className="relative rounded-xl overflow-hidden bg-black border border-[#232F4D] flex flex-col items-center justify-center min-h-[280px]">
              <div id="qr-reader-container" className="w-full h-full max-w-[340px]" />

              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#070A12]/90">
                  <div className="w-16 h-16 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mb-3">
                    <ScanLine className="w-8 h-8 text-cyan-400 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Camera Checkpoint</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Use your mobile camera or desktop webcam to scan physical asset QR codes.
                  </p>
                  <button
                    onClick={startCamera}
                    className="mt-4 px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    Activate Camera Scanner
                  </button>
                </div>
              )}

              {cameraActive && (
                <button
                  onClick={stopCamera}
                  className="absolute bottom-3 right-3 px-3 py-1.5 bg-rose-500/80 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md transition-all shadow-lg"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  Stop Camera
                </button>
              )}
            </div>

            {/* Manual Code / USB Barcode Scanner Input */}
            <div className="space-y-2 pt-2 border-t border-[#1E2538]">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Handheld USB Scanner / Manual Token</span>
                <span className="text-[10px] text-slate-500 font-mono">Press Enter to Scan</span>
              </label>
              <form onSubmit={handleManualScanSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={scannerTokenInput}
                  onChange={(e) => setScannerTokenInput(e.target.value)}
                  placeholder="e.g. FAITH-QR-FAA001-XXXX"
                  className="flex-1 bg-[#121828] border border-[#232F4D] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={scanning || !scannerTokenInput.trim()}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
                >
                  {scanning ? 'Verifying...' : 'Verify'}
                </button>
              </form>
            </div>

            {/* Error Banner */}
            {scanError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">{scanError}</div>
                <button onClick={() => setScanError(null)} className="text-rose-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Verified Asset Checkpoint Card */}
          <div className="lg:col-span-7 space-y-4">
            {scannedAsset ? (
              <div className="bg-[#0C101C] border border-[#1E2538] rounded-2xl p-6 shadow-xl space-y-5 relative overflow-hidden">
                {/* Gate Presence Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    scannedAsset.gatePresence === 'INSIDE'
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        scannedAsset.gatePresence === 'INSIDE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {scannedAsset.gatePresence === 'INSIDE' ? (
                        <Shield className="w-5 h-5" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest font-bold opacity-80">
                        Current Gate State
                      </div>
                      <div className="text-base font-black tracking-tight">
                        {scannedAsset.gatePresence === 'INSIDE'
                          ? 'PHYSICAL PRESENCE: INSIDE PREMISES'
                          : 'PHYSICAL PRESENCE: CURRENTLY OUTSIDE'}
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-black/40 border border-white/10">
                    QR: {scannedAsset.qrStatus}
                  </span>
                </div>

                {/* Restricted Allowed Details Grid (No IP/MAC/Specs/Prices) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-[#121828]/60 p-3 rounded-xl border border-[#1E273D]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Asset ID</span>
                    <span className="text-sm font-bold font-mono text-cyan-400 block mt-0.5">
                      {scannedAsset.assetCode}
                    </span>
                  </div>

                  <div className="bg-[#121828]/60 p-3 rounded-xl border border-[#1E273D]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Asset Type</span>
                    <span className="text-sm font-semibold text-white block mt-0.5">
                      {scannedAsset.assetType}
                    </span>
                  </div>

                  <div className="bg-[#121828]/60 p-3 rounded-xl border border-[#1E273D]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Model</span>
                    <span className="text-sm font-semibold text-white block mt-0.5 truncate">
                      {scannedAsset.model}
                    </span>
                  </div>

                  <div className="bg-[#121828]/60 p-3 rounded-xl border border-[#1E273D]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Current Holder</span>
                    <span className="text-sm font-semibold text-white block mt-0.5">
                      {scannedAsset.currentHolder}
                    </span>
                    {scannedAsset.employeeCode && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({scannedAsset.employeeCode})
                      </span>
                    )}
                  </div>

                  <div className="bg-[#121828]/60 p-3 rounded-xl border border-[#1E273D]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Department</span>
                    <span className="text-sm font-semibold text-white block mt-0.5">
                      {scannedAsset.department}
                    </span>
                  </div>

                  <div className="bg-[#121828]/60 p-3 rounded-xl border border-[#1E273D]">
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Base Location</span>
                    <span className="text-sm font-semibold text-white block mt-0.5">
                      {scannedAsset.location}
                    </span>
                  </div>
                </div>

                {/* If outside, show open OUT movement info */}
                {scannedAsset.gatePresence === 'OUTSIDE' && scannedAsset.openOutMovement && (
                  <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-amber-400 font-bold">
                      <span>OPEN EXIT RECORD: {scannedAsset.openOutMovement.movementCode}</span>
                      <span>
                        Checked out: {new Date(scannedAsset.openOutMovement.movementDateTime).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs grid grid-cols-2 gap-2 text-slate-300">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Exit Gate:</span>
                        {scannedAsset.openOutMovement.gateName}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Guard:</span>
                        {scannedAsset.openOutMovement.guardName}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Destination:</span>
                        {scannedAsset.openOutMovement.destination}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Purpose:</span>
                        {scannedAsset.openOutMovement.purpose}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 border-t border-[#1E2538] flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => setScannedAsset(null)}
                    className="px-4 py-2.5 bg-[#121828] hover:bg-[#1A2238] text-slate-300 rounded-xl text-xs font-semibold transition-all"
                  >
                    Clear & Scan Next
                  </button>

                  <div className="flex gap-2">
                    {scannedAsset.gatePresence === 'INSIDE' ? (
                      <button
                        onClick={() => setShowOutModal(true)}
                        className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                        RECORD ASSET OUT
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowInModal(true)}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                      >
                        <ArrowDownLeft className="w-4 h-4" />
                        RECORD ASSET IN
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#0C101C] border border-[#1E2538] rounded-2xl p-12 text-center shadow-xl space-y-3">
                <div className="w-16 h-16 rounded-full bg-[#121828] border border-[#212C44] flex items-center justify-center mx-auto text-slate-600">
                  <ScanLine className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-sm font-bold text-white">No Asset Scanned Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Scan a QR code with your camera or enter the unique tag code above to view asset identity and record physical exit or entry.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: RECORD ASSET OUT
      ────────────────────────────────────────────────────────────────────────── */}
      {showOutModal && scannedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0D1220] border border-[#1E273D] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E273D] pb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Record Asset OUT</h3>
              </div>
              <button onClick={() => setShowOutModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-400 bg-[#121828] p-3 rounded-lg font-mono">
              Asset: <span className="text-white font-bold">{scannedAsset.assetCode}</span> ({scannedAsset.model})
            </div>

            <form onSubmit={handleRecordOutSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Exit Gate *</label>
                <select
                  value={outForm.gateId}
                  onChange={(e) => setOutForm({ ...outForm, gateId: e.target.value })}
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  {gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Destination *</label>
                <input
                  type="text"
                  value={outForm.destination}
                  onChange={(e) => setOutForm({ ...outForm, destination: e.target.value })}
                  placeholder="e.g. Client Site Pune, Home Office, Vendor Repair"
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Purpose / Reason *</label>
                <input
                  type="text"
                  value={outForm.purpose}
                  onChange={(e) => setOutForm({ ...outForm, purpose: e.target.value })}
                  placeholder="e.g. Customer Demonstration, Remote Work, Hardware Servicing"
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Expected Return Date & Time</label>
                <input
                  type="datetime-local"
                  value={outForm.expectedReturn}
                  onChange={(e) => setOutForm({ ...outForm, expectedReturn: e.target.value })}
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Guard Remarks</label>
                <textarea
                  value={outForm.remarks}
                  onChange={(e) => setOutForm({ ...outForm, remarks: e.target.value })}
                  placeholder="Any physical notes, bag verified, serial check..."
                  rows={2}
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOutModal(false)}
                  className="px-4 py-2 bg-[#121828] text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-all"
                >
                  {actionLoading ? 'Recording...' : 'Confirm Asset OUT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: RECORD ASSET IN
      ────────────────────────────────────────────────────────────────────────── */}
      {showInModal && scannedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0D1220] border border-[#1E273D] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E273D] pb-3">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Record Asset IN (Return)</h3>
              </div>
              <button onClick={() => setShowInModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-400 bg-[#121828] p-3 rounded-lg font-mono">
              Asset: <span className="text-white font-bold">{scannedAsset.assetCode}</span> ({scannedAsset.model})
            </div>

            <form onSubmit={handleRecordInSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Entry Gate *</label>
                <select
                  value={inForm.gateId}
                  onChange={(e) => setInForm({ ...inForm, gateId: e.target.value })}
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  {gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Return Remarks / Inspection</label>
                <textarea
                  value={inForm.remarks}
                  onChange={(e) => setInForm({ ...inForm, remarks: e.target.value })}
                  placeholder="e.g. Returned in good condition, bag and charger verified"
                  rows={2}
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowInModal(false)}
                  className="px-4 py-2 bg-[#121828] text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition-all"
                >
                  {actionLoading ? 'Recording...' : 'Confirm Asset IN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          MODAL: REGISTER NEW GATE
      ────────────────────────────────────────────────────────────────────────── */}
      {showGateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#0D1220] border border-[#1E273D] rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E273D] pb-3">
              <h3 className="text-sm font-bold text-white">Register Physical Gate</h3>
              <button onClick={() => setShowGateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Gate Code *</label>
                <input
                  type="text"
                  value={gateForm.code}
                  onChange={(e) => setGateForm({ ...gateForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. GATE-05"
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Gate Name *</label>
                <input
                  type="text"
                  value={gateForm.name}
                  onChange={(e) => setGateForm({ ...gateForm, name: e.target.value })}
                  placeholder="e.g. South Plant Entrance"
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Location Details</label>
                <input
                  type="text"
                  value={gateForm.location}
                  onChange={(e) => setGateForm({ ...gateForm, location: e.target.value })}
                  placeholder="e.g. Building B Perimeter"
                  className="w-full bg-[#121828] border border-[#212C44] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGateModal(false)}
                  className="px-4 py-2 bg-[#121828] text-slate-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all"
                >
                  Save Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Full Asset Profile Modal */}
      {inspectedAssetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0D121F] border border-[#212C44] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E273D]">
              <div className="flex items-center gap-2.5">
                <Laptop className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-base font-bold text-white">
                    {inspectedAsset?.companyAssetId || inspectedAsset?.assetCode || 'Asset Profile'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {inspectedAsset?.manufacturer} {inspectedAsset?.model} ({inspectedAsset?.assetType})
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setInspectedAssetId(null); setInspectedAsset(null); }}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inspectLoading ? (
              <div className="p-12 text-center text-slate-400">Loading complete asset profile...</div>
            ) : inspectedAsset ? (
              <div className="space-y-4 text-xs">
                {/* Status Banners */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-[#121828] border border-[#1E273D] rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block font-mono">Status</span>
                    <span className="font-bold text-cyan-400">{inspectedAsset.status}</span>
                  </div>
                  <div className="p-2.5 bg-[#121828] border border-[#1E273D] rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block font-mono">Allocation</span>
                    <span className="font-bold text-white">{inspectedAsset.allocationStatus}</span>
                  </div>
                  <div className="p-2.5 bg-[#121828] border border-[#1E273D] rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block font-mono">Criticality</span>
                    <span className="font-bold text-amber-400">{inspectedAsset.criticality || 'MEDIUM'}</span>
                  </div>
                  <div className="p-2.5 bg-[#121828] border border-[#1E273D] rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase block font-mono">Gate State</span>
                    <span className={`font-bold ${inspectedAsset.gatePresence === 'OUTSIDE' ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {inspectedAsset.gatePresence || 'INSIDE'}
                    </span>
                  </div>
                </div>

                {/* Assignment & Location */}
                <div className="p-3.5 bg-[#121828]/60 border border-[#1E273D] rounded-xl space-y-2">
                  <h4 className="text-[11px] font-mono font-bold text-cyan-400 uppercase">Custody & Placement</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Current Holder</span>
                      <span className="text-white font-semibold">{inspectedAsset.currentHolder?.fullName || inspectedAsset.employeeNameSource || 'Stock'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Department</span>
                      <span className="text-white">{inspectedAsset.department?.name || inspectedAsset.location || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Location</span>
                      <span className="text-white">{inspectedAsset.locationRel?.name || inspectedAsset.location || 'HQ'}</span>
                    </div>
                  </div>
                </div>

                {/* Hardware Specs & Network */}
                <div className="p-3.5 bg-[#121828]/60 border border-[#1E273D] rounded-xl space-y-2">
                  <h4 className="text-[11px] font-mono font-bold text-cyan-400 uppercase">Hardware & Network Configuration</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 block">CPU</span>
                      <span>{inspectedAsset.specifications?.cpu || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">RAM</span>
                      <span>{inspectedAsset.specifications?.ram || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">LAN IP</span>
                      <span className="font-mono text-cyan-300">{inspectedAsset.specifications?.lanIp || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">MAC Address</span>
                      <span className="font-mono text-slate-400">{inspectedAsset.specifications?.lanMacAddress || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Recent Gate Movements */}
                {inspectedAsset.gateMovements && inspectedAsset.gateMovements.length > 0 && (
                  <div className="p-3.5 bg-[#121828]/60 border border-[#1E273D] rounded-xl space-y-2">
                    <h4 className="text-[11px] font-mono font-bold text-cyan-400 uppercase">Recent Physical Gate Movements</h4>
                    <div className="space-y-1.5">
                      {inspectedAsset.gateMovements.slice(0, 3).map((m: any) => (
                        <div key={m.id} className="flex items-center justify-between text-[11px] p-2 bg-[#0D121F] rounded border border-[#1E273D]">
                          <span className={`font-bold font-mono ${m.movementType === 'OUT' ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {m.movementType} ({m.movementCode})
                          </span>
                          <span className="text-slate-400 font-mono">{new Date(m.movementDateTime).toLocaleString()}</span>
                          <span className="text-slate-300 truncate max-w-xs">{m.destination || m.purpose || 'Gate Passage'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => { setInspectedAssetId(null); setInspectedAsset(null); }}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

