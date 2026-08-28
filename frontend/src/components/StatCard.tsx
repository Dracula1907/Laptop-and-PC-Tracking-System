import React from 'react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'indigo',
  onClick,
}) => {
  const variantStyles = {
    indigo: 'border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-surface to-surface text-indigo-400',
    emerald: 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-surface to-surface text-emerald-400',
    amber: 'border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-surface to-surface text-amber-400',
    rose: 'border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-surface to-surface text-rose-400',
    cyan: 'border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-surface to-surface text-cyan-400',
    slate: 'border-slate-800 bg-surface text-slate-400',
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-xl border transition-all duration-200 ${variantStyles[variant]} ${
        onClick ? 'cursor-pointer hover:scale-[1.02] hover:shadow-lg' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-textSecondary uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-textPrimary mt-1.5">{value}</h3>
          {subtitle && <p className="text-xs text-textMuted mt-1">{subtitle}</p>}
        </div>
        <div className="p-3 rounded-lg bg-surfaceElevated border border-borderDark">{icon}</div>
      </div>
    </div>
  );
};
