import React, { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, Column } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { Button } from '../components/Button';
import api from '../services/api';
import { AuditLog } from '../types';
import { exportModuleToExcel } from '../utils/exporters';
import { ShieldCheck, User, FileSpreadsheet } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const res: any = await api.get(`/audit-logs?page=${page}&limit=20`);
      if (res.success) {
        setLogs(res.data.logs);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (item) => (
        <span className="font-mono text-xs text-textMuted">
          {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString()}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User & Role',
      render: (item) => (
        <div>
          <p className="font-semibold text-textPrimary">{item.user?.username || 'System'}</p>
          <p className="text-[10px] text-brandPrimary uppercase">{item.user?.role?.name || 'Automated Process'}</p>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action Executed',
      render: (item) => (
        <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-slate-800 text-brandInfo border border-slate-700">
          {item.action}
        </span>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity / Target ID',
      render: (item) => (
        <div className="text-xs">
          <p className="text-textPrimary font-medium">{item.entityType}</p>
          <p className="text-[10px] text-textMuted font-mono truncate max-w-[120px]">{item.entityId || 'N/A'}</p>
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Audit Payload / Details',
      render: (item) => (
        <span className="text-[11px] text-textSecondary font-mono block max-w-sm truncate" title={item.newValue || item.oldValue || ''}>
          {item.newValue || item.oldValue || '—'}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP / Terminal',
      render: (item) => <span className="font-mono text-[11px] text-textMuted">{item.ipAddress || '127.0.0.1'}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immutable System Audit Logs"
        subtitle="Security audit trail recording all administrative operations, assignments, asset creations, and role changes."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              exportModuleToExcel(logs, 'AuditLogs');
            }}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
            Export Excel
          </Button>
        }
      />

      <DataTable columns={columns} data={logs} loading={loading} />

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalRecords={pagination.total}
        limit={pagination.limit}
        onPageChange={(p) => fetchLogs(p)}
      />
    </div>
  );
};
