import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  limit,
  onPageChange,
}) => {
  const startRecord = (currentPage - 1) * limit + 1;
  const endRecord = Math.min(currentPage * limit, totalRecords);

  if (totalRecords === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between pt-4 px-1 gap-3">
      <p className="text-xs text-textSecondary">
        Showing <span className="font-semibold text-textPrimary">{startRecord}</span> to{' '}
        <span className="font-semibold text-textPrimary">{endRecord}</span> of{' '}
        <span className="font-semibold text-textPrimary">{totalRecords}</span> entries
      </p>
      <div className="flex items-center space-x-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          icon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>
        <span className="text-xs text-textSecondary px-2">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          icon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
