import React, { memo, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { formatDistanceToNow } from 'date-fns';
import { FileText, ChevronRight, DollarSign, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useInvoiceStore } from '../../stores/invoiceStore';

interface Invoice {
  id: string;
  invoice_number: string;
  client_name?: string;
  amount: number;
  total_amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  created_at: string;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    invoices: Invoice[];
    onInvoiceClick: (invoice: Invoice) => void;
  };
}

// Memoized row component for performance
const InvoiceRow = memo<RowProps>(({ index, style, data }) => {
  const invoice = data.invoices[index];
  const { onInvoiceClick } = data;
  
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-500'
  };
  
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }, []);
  
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);
  
  return (
    <div 
      style={style}
      className="px-4 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onInvoiceClick(invoice)}
    >
      <div className="flex items-center py-4 border-b border-gray-200">
        <div className="flex-shrink-0 mr-4">
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-indigo-600" />
          </div>
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {invoice.invoice_number}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.status as keyof typeof statusColors] || statusColors.draft}`}>
              {invoice.status}
            </span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 space-x-4">
            <div className="flex items-center">
              <User className="h-3 w-3 mr-1" />
              <span className="truncate">{invoice.client_name || 'Unknown Client'}</span>
            </div>
            <div className="flex items-center">
              <DollarSign className="h-3 w-3 mr-1" />
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span>{formatDate(invoice.due_date)}</span>
            </div>
          </div>
          
          <div className="mt-1 text-xs text-gray-400">
            Created {formatDistanceToNow(new Date(invoice.created_at))} ago
          </div>
        </div>
        
        <div className="flex-shrink-0 ml-4">
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.index === nextProps.index &&
    prevProps.data.invoices[prevProps.index]?.id === nextProps.data.invoices[nextProps.index]?.id &&
    prevProps.data.invoices[prevProps.index]?.status === nextProps.data.invoices[nextProps.index]?.status
  );
});

InvoiceRow.displayName = 'InvoiceRow';

interface VirtualizedInvoiceListProps {
  className?: string;
}

export const VirtualizedInvoiceList: React.FC<VirtualizedInvoiceListProps> = memo(({ 
  className = '' 
}) => {
  const navigate = useNavigate();
  const { invoices, loading } = useInvoiceStore();
  
  const handleInvoiceClick = useCallback((invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}`);
  }, [navigate]);
  
  const itemData = useMemo(() => ({
    invoices,
    onInvoiceClick: handleInvoiceClick
  }), [invoices, handleInvoiceClick]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating a new invoice.</p>
      </div>
    );
  }
  
  return (
    <div className={`h-full ${className}`}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={invoices.length}
            itemSize={100}
            width={width}
            itemData={itemData}
            overscanCount={5}
          >
            {InvoiceRow}
          </List>
        )}
      </AutoSizer>
    </div>
  );
});

VirtualizedInvoiceList.displayName = 'VirtualizedInvoiceList';

// Export a HOC for easy integration
export const withVirtualization = <P extends object>(
  Component: React.ComponentType<P>,
  getItems: (props: P) => any[],
  itemHeight: number = 80
) => {
  return memo((props: P) => {
    const items = getItems(props);
    
    return (
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={itemHeight}
            width={width}
            itemData={{ items, componentProps: props }}
          >
            {({ index, style, data }) => (
              <div style={style}>
                <Component {...data.componentProps} item={items[index]} index={index} />
              </div>
            )}
          </List>
        )}
      </AutoSizer>
    );
  });
};