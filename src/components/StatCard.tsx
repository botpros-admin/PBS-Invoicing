import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  id: string; // Add id prop
  title: string;
  value: string | number;
  icon?: string;
  change?: number;
  link?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  id, // Add id to destructuring
  // title, // Removed unused title prop from destructuring
  value,
  change,
  link,
  className = ''
}) => {
  const navigate = useNavigate();
  
  const handleClick = () => {
    if (link) {
      navigate(link);
    }
  };
  
  // Helper function to format numbers (currency or percentage)
  const formatNumber = (num: number | string, type: 'currency' | 'percentage' | 'count'): string => {
    if (typeof num === 'string') return num; // Return string values as is (e.g., for counts)

    const number = Number(num);
    if (isNaN(number)) return 'N/A'; // Handle invalid numbers

    if (type === 'currency') {
      // Format as currency with exactly 2 decimal places using toFixed
      return `$${number.toFixed(2)}`;
    } else if (type === 'percentage') {
      // Format percentage change with max 2 decimal places
      return `${Math.abs(number).toFixed(2)}%`;
    } else {
      // Default: format count or other numbers as integers
      return number.toString();
    }
  };

  // Determine value type based on widget ID
  let valueType: 'currency' | 'percentage' | 'count' | 'string';
  if (typeof value === 'string') {
      valueType = 'string';
  } else if (id === 'total-invoiced' || id === 'total-paid' || id === 'outstanding-balance') {
      valueType = 'currency';
  } else if (id === 'overdue-invoices') { // Assuming overdue is a count
      valueType = 'count';
  } else { // Default or handle other specific IDs
      valueType = typeof value === 'number' ? 'count' : 'string';
  }


  return (
    <div
      className={`bg-white rounded-lg h-full flex flex-col justify-center ${className}`} // Added h-full and flex layout
      onClick={handleClick}
      // Add appropriate padding if needed when used outside WidgetWrapper, or rely on parent padding
    >
      <div className="flex justify-between items-start">
        <div className="w-full">
          {/* Title removed - handled by WidgetWrapper */}
          {/* Format the main value with fixed height to prevent shifts */}
          <p className="text-3xl font-semibold text-gray-900 h-[40px] flex items-center font-mono"> {/* Added fixed height and monospace */}
            {valueType === 'string' ? value : formatNumber(value, valueType)}
          </p>

          {/* Render change percentage if available and valid */}
          {typeof change === 'number' && !isNaN(change) && (
            <div className="mt-2 flex items-center text-sm">
              {change === 0 ? (
                // Case: No change - display "Unchanged" in yellow
                <span className="font-medium text-yellow-600">
                  Unchanged
                </span>
              ) : (
                // Case: Positive or Negative change
                <>
                  {change > 0 ? (
                    <ArrowUpRight size={16} className="text-green-500 mr-1 flex-shrink-0" />
                  ) : (
                    <ArrowDownRight size={16} className="text-red-500 mr-1 flex-shrink-0" />
                  )}
                  <span className={`font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatNumber(change, 'percentage')}
                  </span>
                  <span className="text-gray-500 ml-1">
                    {change > 0 ? 'increase' : 'decrease'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        {/* Optional Icon can be added here */}
      </div>
      {/* Optional Link */}
      {link && (
        <div className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800">
          View details &rarr;
        </div>
      )}
    </div>
  );
};

export default StatCard;
