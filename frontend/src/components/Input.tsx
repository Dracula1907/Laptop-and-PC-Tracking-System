import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && <label className="text-xs font-medium text-slate-300">{label}</label>}
        <div className="relative flex items-center">
          {icon && <div className="absolute left-3 text-slate-400 pointer-events-none">{icon}</div>}
          <input
            ref={ref}
            className={`w-full bg-surface border text-sm text-textPrimary placeholder-slate-500 rounded-lg py-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brandPrimary focus:border-transparent ${
              icon ? 'pl-9 pr-3' : 'px-3'
            } ${error ? 'border-rose-500/80 ring-1 ring-rose-500/50' : 'border-borderDark hover:border-slate-700'} ${className}`}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-rose-400 font-normal">{error}</span>}
      </div>
    );
  }
);
