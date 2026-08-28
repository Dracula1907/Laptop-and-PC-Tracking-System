import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'assetStatus' | 'condition' | 'workflow' | 'maintenance' | 'employee';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'assetStatus' }) => {
  const getColors = () => {
    switch (status) {
      // ── Active / healthy states ──
      case 'AVAILABLE':
      case 'EXCELLENT':
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

      // ── Completed / approved ──
      case 'APPROVED':
      case 'COMPLETED':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';

      // ── Returned ──
      case 'RETURNED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';

      // ── In-use / assigned ──
      case 'ASSIGNED':
      case 'IN_USE':
      case 'GOOD':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';

      // ── Pending / in-progress ──
      case 'UNDER_REPAIR':
      case 'IN_PROGRESS':
      case 'WAITING_FOR_PARTS':
      case 'FAIR':
      case 'REPORTED':
      case 'PENDING':
      case 'ON_LEAVE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';

      // ── Error / rejected / critical ──
      case 'DAMAGED':
      case 'CRITICAL':
      case 'LOST':
      case 'STOLEN':
      case 'REJECTED':
      case 'EXITED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';

      // ── Cancelled ──
      case 'CANCELLED':
        return 'bg-rose-900/20 text-rose-300 border-rose-900/40';

      // ── Retired / inactive / default ──
      case 'RETIRED':
      case 'SCRAPPED':
      case 'INACTIVE':
      default:
        return 'bg-slate-700/30 text-slate-400 border-slate-700';
    }
  };

  const formattedStatus = status.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getColors()}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {formattedStatus}
    </span>
  );
};
