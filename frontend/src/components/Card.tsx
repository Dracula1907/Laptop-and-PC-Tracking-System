import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, action, children, className = '' }) => {
  return (
    <div className={`bg-surface border border-borderDark rounded-xl shadow-card p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-borderDark/80">
          <div>
            {title && <h3 className="text-base font-semibold text-textPrimary">{title}</h3>}
            {subtitle && <p className="text-xs text-textSecondary mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
