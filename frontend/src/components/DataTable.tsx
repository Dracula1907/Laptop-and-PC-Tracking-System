import React from 'react';
import { Loader2, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found matching criteria.',
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-surface border border-borderDark rounded-xl">
        <Loader2 className="w-8 h-8 text-brandPrimary animate-spin mb-3" />
        <p className="text-sm text-textSecondary font-medium">Fetching enterprise asset data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-surface border border-borderDark rounded-xl text-center">
        <div className="p-3 bg-surfaceElevated rounded-full text-slate-500 mb-3">
          <Inbox className="w-8 h-8" />
        </div>
        <h4 className="text-base font-semibold text-textPrimary">No Records Available</h4>
        <p className="text-xs text-textSecondary mt-1 max-w-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-surface border border-borderDark rounded-xl shadow-card">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-surfaceElevated/60 border-b border-borderDark text-xs font-semibold text-textSecondary uppercase tracking-wider">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3.5 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borderDark/60 text-textPrimary font-normal">
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick && onRowClick(item)}
              className={`transition-colors duration-150 ${
                onRowClick ? 'hover:bg-slate-800/50 cursor-pointer' : 'hover:bg-slate-800/30'
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3.5 text-xs ${col.className || ''}`}>
                  {col.render ? col.render(item) : (item as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
