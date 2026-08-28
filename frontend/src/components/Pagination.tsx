import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
}) => {
  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalRecords);

  if (totalRecords === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between pt-4 px-1 gap-4 select-none">
      <div className="flex items-center gap-3 text-xs text-textSecondary">
        <span>
          Showing <span className="font-semibold text-textPrimary">{startRecord}</span>–
          <span className="font-semibold text-textPrimary">{endRecord}</span> of{' '}
          <span className="font-semibold text-textPrimary">{totalRecords}</span> assets
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-borderBase pl-3">
            <span className="text-[11px] text-textSecondary">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="bg-bgElevated border border-borderBase rounded px-2 py-1 text-xs text-textPrimary focus:outline-none focus:border-brandPrimary"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          title="First Page"
          className="px-2"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Previous Page"
          className="px-2"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="text-xs text-textSecondary px-2">
          Page <span className="font-semibold text-textPrimary">{currentPage}</span> of{' '}
          <span className="font-semibold text-textPrimary">{Math.max(1, totalPages)}</span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Next Page"
          className="px-2"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last Page"
          className="px-2"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

