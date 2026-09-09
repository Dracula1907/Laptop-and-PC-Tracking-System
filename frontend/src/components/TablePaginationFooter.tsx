import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export interface TablePaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  recordLabel?: string;
}

export const TablePaginationFooter: React.FC<TablePaginationFooterProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [25, 50, 100],
  recordLabel = 'records',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalRecords);
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div
      className={`border-t px-4 py-3 sm:px-5 select-none transition-colors ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#090D17] border-[#222E3E]'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left: Showing Range & Rows-per-page Dropdown */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          <div
            className={`flex items-center gap-1 font-medium ${
              isLight ? 'text-slate-600' : 'text-[#8C9BAE]'
            }`}
          >
            <span>Showing</span>
            <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {startRecord}
            </span>
            <span>–</span>
            <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {endRecord}
            </span>
            <span>of</span>
            <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {totalRecords}
            </span>
            <span>{recordLabel}</span>
          </div>

          {onLimitChange && (
            <>
              <div
                className={`hidden sm:block h-4 w-px ${
                  isLight ? 'bg-slate-300' : 'bg-[#222E3E]'
                }`}
              />

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold ${
                    isLight ? 'text-slate-600' : 'text-[#8C9BAE]'
                  }`}
                >
                  Rows:
                </span>
                <div className="relative inline-block">
                  <select
                    value={limit}
                    onChange={(e) => onLimitChange(Number(e.target.value))}
                    aria-label={`Rows per page for ${recordLabel}`}
                    className={`appearance-none font-mono font-bold text-xs rounded-lg pl-3 pr-8 py-1.5 cursor-pointer transition-all border outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                      isLight
                        ? 'bg-white text-slate-900 border-slate-300 hover:border-slate-400 shadow-sm'
                        : 'bg-[#121B2B] text-white border-[#2A394E] hover:border-[#3E526F] shadow-inner'
                    }`}
                  >
                    {pageSizeOptions.map((opt) => (
                      <option
                        key={opt}
                        value={opt}
                        className={isLight ? 'bg-white text-slate-900' : 'bg-[#121B2B] text-white'}
                      >
                        {opt}
                      </option>
                    ))}
                  </select>
                  <div
                    className={`pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 ${
                      isLight ? 'text-slate-600' : 'text-[#8C9BAE]'
                    }`}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Full Navigation Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title="First Page"
            aria-label="First Page"
            className={`inline-flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border transition-all ${
              currentPage <= 1
                ? isLight
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-[#0E1524]/60 text-slate-600 border-[#1E2838] cursor-not-allowed'
                : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-sm active:scale-95 cursor-pointer'
                  : 'bg-[#121B2B] hover:bg-[#1A263B] text-slate-200 hover:text-white border-[#2A394E] hover:border-[#3E526F] active:scale-95 cursor-pointer'
            }`}
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Previous Page"
            aria-label="Previous Page"
            className={`inline-flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border transition-all ${
              currentPage <= 1
                ? isLight
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-[#0E1524]/60 text-slate-600 border-[#1E2838] cursor-not-allowed'
                : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-sm active:scale-95 cursor-pointer'
                  : 'bg-[#121B2B] hover:bg-[#1A263B] text-slate-200 hover:text-white border-[#2A394E] hover:border-[#3E526F] active:scale-95 cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span
            className={`px-2 text-xs select-none whitespace-nowrap ${
              isLight ? 'text-slate-600' : 'text-[#8C9BAE]'
            }`}
          >
            Page{' '}
            <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {currentPage}
            </span>{' '}
            of{' '}
            <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              {safeTotalPages}
            </span>
          </span>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= safeTotalPages}
            title="Next Page"
            aria-label="Next Page"
            className={`inline-flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border transition-all ${
              currentPage >= safeTotalPages
                ? isLight
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-[#0E1524]/60 text-slate-600 border-[#1E2838] cursor-not-allowed'
                : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-sm active:scale-95 cursor-pointer'
                  : 'bg-[#121B2B] hover:bg-[#1A263B] text-slate-200 hover:text-white border-[#2A394E] hover:border-[#3E526F] active:scale-95 cursor-pointer'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={currentPage >= safeTotalPages}
            title="Last Page"
            aria-label="Last Page"
            className={`inline-flex items-center justify-center p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg border transition-all ${
              currentPage >= safeTotalPages
                ? isLight
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-[#0E1524]/60 text-slate-600 border-[#1E2838] cursor-not-allowed'
                : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-sm active:scale-95 cursor-pointer'
                  : 'bg-[#121B2B] hover:bg-[#1A263B] text-slate-200 hover:text-white border-[#2A394E] hover:border-[#3E526F] active:scale-95 cursor-pointer'
            }`}
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
