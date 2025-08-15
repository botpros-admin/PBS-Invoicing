import React from 'react';
import StatCard from '../../../components/StatCard'; // Re-use existing StatCard component
import { DashboardStat } from '../../../api/services/dashboard.service';
import { AlertCircle } from 'lucide-react'; // Removed unused Loader2

interface StatCardsSectionProps {
  stats: DashboardStat[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

// Helper function to render error state
const renderError = (error: Error | null) => (
    <div className="col-span-full p-4 bg-red-50 text-red-700 rounded-md shadow">
        <div className="flex items-center justify-center h-full">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>Error loading stats: {error?.message || 'Unknown error'}</span>
        </div>
    </div>
);

// Helper function to render loading skeletons
const renderLoadingSkeletons = (count: number = 4) => (
    Array.from({ length: count }).map((_, index) => (
        <div key={`loading-stat-${index}`} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
    ))
);

export const StatCardsSection: React.FC<StatCardsSectionProps> = ({
  stats,
  isLoading,
  isError,
  error,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {isLoading ? (
        renderLoadingSkeletons()
      ) : isError ? (
        renderError(error)
      ) : (
        (stats || []).map((stat) => (
          <StatCard
            key={stat.id}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            link={stat.link}
            // Assuming StatCard doesn't need an icon prop directly,
            // or it could be mapped from stat.id or another property if needed.
          />
        ))
      )}
       {/* Handle case where stats are loaded but empty */}
       {!isLoading && !isError && (!stats || stats.length === 0) && (
         <div className="col-span-full p-4 text-center text-gray-500">
           No statistics available.
         </div>
       )}
    </div>
  );
};
