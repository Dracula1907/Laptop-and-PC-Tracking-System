import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-6 mb-6 border-b border-borderDark/60 gap-4">
      <div>
        <h1 className="text-2xl font-bold text-textPrimary tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-textSecondary mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center space-x-3">{actions}</div>}
    </div>
  );
};
