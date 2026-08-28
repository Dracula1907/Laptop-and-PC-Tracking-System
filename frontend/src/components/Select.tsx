import React from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && <label className="text-xs font-medium text-slate-300">{label}</label>}
        <select
          ref={ref}
          className={`w-full bg-surface border text-sm text-textPrimary rounded-lg px-3 py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brandPrimary focus:border-transparent ${
            error ? 'border-rose-500/80 ring-1 ring-rose-500/50' : 'border-borderDark hover:border-slate-700'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-surface text-textPrimary py-1">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-rose-400 font-normal">{error}</span>}
      </div>
    );
  }
);
