import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  sortKey?: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (item: T) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found matching criteria.',
  emptyAction,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
}: DataTableProps<T>) {
  if (loading) {
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
          <tbody className="divide-y divide-borderDark/60">
            {[...Array(6)].map((_, i) => (
              <tr key={i} className="animate-pulse">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    <div className="h-4 bg-slate-800/80 rounded w-4/5" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-surface border border-borderDark rounded-xl text-center px-4">
        <div className="p-3 bg-surfaceElevated rounded-full text-slate-500 mb-3">
          <Inbox className="w-8 h-8" />
        </div>
        <h4 className="text-base font-semibold text-textPrimary">No Records Found</h4>
        <p className="text-xs text-textSecondary mt-1 max-w-sm">{emptyMessage}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto bg-surface border border-borderDark rounded-xl shadow-card">
      <table className="w-full text-left border-collapse text-sm min-w-full">
        <thead>
          <tr className="bg-surfaceElevated/60 border-b border-borderDark text-xs font-semibold text-textSecondary uppercase tracking-wider select-none">
            {columns.map((col) => {
              const activeSortKey = col.sortKey || col.key;
              const isSorted = sortBy === activeSortKey;
              const canSort = col.sortable && onSort;

              return (
                <th
                  key={col.key}
                  onClick={() => canSort && onSort(activeSortKey)}
                  className={`px-4 py-3.5 whitespace-nowrap ${canSort ? 'cursor-pointer hover:text-white transition-colors' : ''} ${col.className || ''}`}
                >
                  <div className="inline-flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {canSort && (
                      <span className="text-slate-500 hover:text-white">
                        {isSorted ? (
                          sortOrder === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-brandPrimary" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5 text-brandPrimary" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 text-slate-600 hover:text-slate-400" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
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

