import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  id?: string;
  header: string | React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode | { display: React.ReactNode, sortValue: any });
  sortable?: boolean;
  className?: string;
  sortValue?: (row: T) => any;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  sortable?: boolean;
  initialSortField?: string;
  initialSortDirection?: 'asc' | 'desc';
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  rowsPerPage?: number;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}

const DataTable = <T,>({
  columns,
  data,
  keyField,
  onRowClick,
  actions,
  pagination,
  sortable = true,
  initialSortField,
  initialSortDirection = 'asc',
  onSort,
  rowsPerPage = 10,
  onRowsPerPageChange,
}: DataTableProps<T>) => {
  const [sortedColumn, setSortedColumn] = useState<Column<T> | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDirection);
  const [sortedData, setSortedData] = useState<T[]>(data);

  useEffect(() => {
    if (initialSortField) {
      const col = columns.find(col => {
        if (col.id) {
          return col.id === initialSortField;
        } else if (typeof col.accessor === 'string') {
          return col.accessor === initialSortField;
        }
        return false;
      });
      if (col) {
        setSortedColumn(col);
      }
    }
  }, [initialSortField, columns]);

  useEffect(() => {
    if (sortedColumn) {
      const sorted = [...data].sort((a, b) => {
        let aValue, bValue;
        if (typeof sortedColumn.accessor === 'function') {
          const aResult = sortedColumn.accessor(a);
          const bResult = sortedColumn.accessor(b);
          aValue = (aResult && typeof aResult === 'object' && 'sortValue' in aResult) ? aResult.sortValue : aResult;
          bValue = (bResult && typeof bResult === 'object' && 'sortValue' in bResult) ? bResult.sortValue : bResult;
        } else {
          aValue = a[sortedColumn.accessor];
          bValue = b[sortedColumn.accessor];
          if (typeof aValue === 'string') aValue = aValue.toLowerCase();
          if (typeof bValue === 'string') bValue = bValue.toLowerCase();
        }
        if (aValue === bValue) return 0;
        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      setSortedData(sorted);
    } else {
      setSortedData(data);
    }
  }, [data, sortedColumn, sortDirection]);

  const handleSort = (column: Column<T>) => {
    if (!sortable || !column.sortable) return;
    if (sortedColumn === column) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
      if (onSort) {
        const field = column.id ? column.id : (typeof column.accessor === 'string' ? column.accessor : '');
        onSort(field, newDirection);
      }
    } else {
      setSortedColumn(column);
      setSortDirection('asc');
      if (onSort) {
        const field = column.id ? column.id : (typeof column.accessor === 'string' ? column.accessor : '');
        onSort(field, 'asc');
      }
    }
  };

  const renderSortIcon = (column: Column<T>) => {
    if (!sortable || !column.sortable) return null;
    if (sortedColumn === column) {
      return sortDirection === 'asc' ? (
        <ChevronUp size={16} className="ml-1" />
      ) : (
        <ChevronDown size={16} className="ml-1" />
      );
    }
    return <ChevronDown size={16} className="ml-1 opacity-0 group-hover:opacity-30" />;
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onRowsPerPageChange) {
      onRowsPerPageChange(Number(e.target.value));
    }
  };

  const renderPageNumbers = () => {
    if (!pagination) return null;
    const { currentPage, totalPages } = pagination;
    const pageNumbers = [];
    if (currentPage > 3) {
      pageNumbers.push(1);
      if (currentPage > 4) {
        pageNumbers.push('ellipsis-start');
      }
    }
    for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
      pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        pageNumbers.push('ellipsis-end');
      }
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };

  const getDisplayValue = (row: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      const result = column.accessor(row);
      if (result && typeof result === 'object' && 'display' in result) {
        return result.display;
      }
      return result;
    } else {
      return String(row[column.accessor]);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  sortable ? 'cursor-pointer group' : ''
                } ${column.className || ''}`}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center">
                  {column.header}
                  {renderSortIcon(column)}
                </div>
              </th>
            ))}
            {actions && <th scope="col" className="relative px-6 py-3"></th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (actions ? 1 : 0)}
                className="px-6 py-4 text-center text-sm text-gray-500"
              >
                No data available
              </td>
            </tr>
          ) : (
            sortedData.map((row) => (
              <tr
                key={String(row[keyField])}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((column, index) => (
                  <td
                    key={index}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || ''}`}
                  >
                    {getDisplayValue(row, column)}
                  </td>
                ))}
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
          <div className="flex items-center mb-4 sm:mb-0">
            <p className="text-sm text-gray-700 mr-4">
              Showing {(pagination.currentPage - 1) * rowsPerPage + 1} to{' '}
              {Math.min(pagination.currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} results
            </p>
            {onRowsPerPageChange && (
              <div className="flex items-center">
                <span className="text-sm text-gray-700 mr-2">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={handleRowsPerPageChange}
                  className="border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-secondary focus:border-secondary"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="250">250</option>
                  <option value="500">500</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium ${
                pagination.currentPage === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-50'
              } mr-2`}
            >
              <span className="sr-only">First Page</span>
              <ChevronLeft size={16} className="mr-1" />
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                pagination.currentPage === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft size={16} />
            </button>
            <div className="hidden md:flex">
              {renderPageNumbers()?.map((page, index) => {
                if (page === 'ellipsis-start' || page === 'ellipsis-end') {
                  return (
                    <span 
                      key={`ellipsis-${index}`}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                    >
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={page}
                    onClick={() => pagination.onPageChange(page as number)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      pagination.currentPage === page
                        ? 'bg-secondary/10 text-secondary border-secondary z-10'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                pagination.currentPage === pagination.totalPages
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="sr-only">Next</span>
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.currentPage === pagination.totalPages}
              className={`relative inline-flex items-center px-2 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium ${
                pagination.currentPage === pagination.totalPages
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:bg-gray-50'
              } ml-2`}
            >
              <span className="sr-only">Last Page</span>
              <ChevronRight size={16} className="mr-1" />
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;