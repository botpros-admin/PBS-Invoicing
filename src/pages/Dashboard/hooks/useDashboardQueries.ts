import { useQuery } from '@tanstack/react-query';
import {
  getDashboardStats,
  getAgingOverview,
  getStatusDistribution,
  getTopClientsByRevenue,
  DashboardStat,
  AgingBucket,
  StatusDistribution,
  TopClient
} from '../../../api/services/dashboard.service';
import { 
  fetchVolumeMetrics, 
  fetchLabMetrics,
  VolumeMetrics,
  LabMetric 
} from '../../../api/services/volumeMetrics.service';
import { DateRange } from '../../../types';
import { useNotifications } from '../../../context/NotificationContext'; // Corrected import name
import { useEffect, useRef } from 'react'; // Import useRef

export const useDashboardQueries = (defaultDateRange: DateRange) => {
  const { addNotification } = useNotifications(); // Corrected hook name
  const notifiedErrors = useRef<Set<Error>>(new Set()); // Ref to track notified errors

  const {
    data: dashboardStats,
    isLoading: isLoadingStats,
    isError: isErrorStats,
    error: statsError,
  } = useQuery<DashboardStat[], Error>({
    queryKey: ['dashboardStats', defaultDateRange],
    queryFn: () => getDashboardStats(defaultDateRange),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: agingData,
    isLoading: isLoadingAging,
    isError: isErrorAging,
    error: agingError,
  } = useQuery<AgingBucket[], Error>({
    queryKey: ['agingOverview'], // Removed dateRange from key if API doesn't use it
    queryFn: () => getAgingOverview(), // Removed argument based on error
    staleTime: 15 * 60 * 1000,
  });

  const {
    data: statusData,
    isLoading: isLoadingStatus,
    isError: isErrorStatus,
    error: statusError,
  } = useQuery<StatusDistribution[], Error>({
    queryKey: ['statusDistribution', defaultDateRange],
    queryFn: () => getStatusDistribution(defaultDateRange),
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: topClientsData,
    isLoading: isLoadingTopClients,
    isError: isErrorTopClients,
    error: topClientsError,
  } = useQuery<TopClient[], Error>({
    queryKey: ['topClients', defaultDateRange],
    queryFn: () => getTopClientsByRevenue(defaultDateRange),
    staleTime: 15 * 60 * 1000,
  });

  const {
    data: volumeMetrics,
    isLoading: isLoadingVolume,
    isError: isErrorVolume,
    error: volumeError,
  } = useQuery<VolumeMetrics, Error>({
    queryKey: ['volumeMetrics', defaultDateRange],
    queryFn: () => fetchVolumeMetrics(defaultDateRange),
    staleTime: 30 * 1000, // Refresh every 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh
  });

  const {
    data: labMetrics,
    isLoading: isLoadingLabs,
    isError: isErrorLabs,
    error: labsError,
  } = useQuery<LabMetric[], Error>({
    queryKey: ['labMetrics', defaultDateRange],
    queryFn: () => fetchLabMetrics(defaultDateRange),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  // --- Error Handling Effect ---
  useEffect(() => {
    const checkAndNotify = (error: Error | null | undefined, type: string) => {
      if (error && !notifiedErrors.current.has(error)) {
        addNotification({ type: 'system', message: `${type} Error: ${error.message}` });
        notifiedErrors.current.add(error); // Mark this error instance as notified
      }
    };

    checkAndNotify(statsError, 'Stats');
    checkAndNotify(agingError, 'Aging');
    checkAndNotify(statusError, 'Status');
    checkAndNotify(topClientsError, 'Top Clients');
    checkAndNotify(volumeError, 'Volume Metrics');
    checkAndNotify(labsError, 'Lab Metrics');

    // Note: The dependency array still includes the error objects.
    // If a *new* error object instance occurs for the same query, it will be notified.
    // If the same error object instance persists across renders, it won't be re-notified.
  }, [statsError, agingError, statusError, topClientsError, volumeError, labsError, addNotification]);

  return {
    dashboardStats, isLoadingStats, isErrorStats, statsError,
    agingData, isLoadingAging, isErrorAging, agingError,
    statusData, isLoadingStatus, isErrorStatus, statusError,
    topClientsData, isLoadingTopClients, isErrorTopClients, topClientsError,
    volumeMetrics, isLoadingVolume, isErrorVolume, volumeError,
    labMetrics, isLoadingLabs, isErrorLabs, labsError,
  };
};
