import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bgBase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variantStyles = {
    primary: 'bg-brandPrimary hover:bg-indigo-600 text-white focus:ring-indigo-500 shadow-md shadow-indigo-950/40',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:ring-slate-500',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500 shadow-md shadow-emerald-950/40',
    danger: 'bg-rose-600 hover:bg-rose-500 text-white focus:ring-rose-500 shadow-md shadow-rose-950/40',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white focus:ring-amber-500 shadow-md shadow-amber-950/40',
    outline: 'bg-transparent border border-slate-700 hover:bg-slate-800 text-slate-300 focus:ring-slate-500',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 focus:ring-slate-500',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon ? icon : null}
      {children}
    </button>
  );
};
