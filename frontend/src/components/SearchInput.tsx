import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search asset code, serial, holder, model...',
  className = '',
  debounceMs = 300,
}) => {
  const [searchTerm, setSearchTerm] = useState(value);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== value) {
        onChange(searchTerm);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [searchTerm, onChange, value, debounceMs]);

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface border border-borderDark hover:border-slate-700 text-sm text-textPrimary placeholder-slate-500 rounded-lg pl-9 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-brandPrimary focus:border-transparent transition-all duration-200"
      />
      {searchTerm && (
        <button
          onClick={() => {
            setSearchTerm('');
            onChange('');
          }}
          className="absolute right-2.5 text-slate-400 hover:text-white p-0.5 rounded-full"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
