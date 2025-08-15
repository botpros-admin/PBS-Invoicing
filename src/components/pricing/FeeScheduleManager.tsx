import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  Plus,
  Edit2,
  Copy,
  Trash2,
  Upload,
  Download,
  TrendingUp,
  AlertCircle,
  Check,
  Clock,
  FileText,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useNotifications } from '../../context/NotificationContext';
import { useTenant } from '../../context/TenantContext';
import { auditLogger } from '../../utils/security/auditLogger';

interface FeeSchedule {
  id: string;
  name: string;
  clinic_id?: string;
  clinic_name?: string;
  laboratory_id: string;
  start_date: string;
  end_date?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string;
  items?: FeeScheduleItem[];
  percentage_change?: number;
  parent_schedule_id?: string;
}

interface FeeScheduleItem {
  id: string;
  fee_schedule_id: string;
  cpt_code: string;
  description: string;
  price: number;
  effective_date: string;
}

interface PriceHistory {
  cpt_code: string;
  description: string;
  prices: {
    date: string;
    price: number;
    schedule_name: string;
  }[];
}

const FeeScheduleManager: React.FC = () => {
  const { addNotification } = useNotifications();
  const { currentTenant } = useTenant();
  
  const [schedules, setSchedules] = useState<FeeSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<FeeSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  
  // Form state
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    clinic_id: '',
    start_date: '',
    end_date: '',
    is_default: false,
    percentage_increase: 0
  });

  const [copyForm, setCopyForm] = useState({
    source_schedule_id: '',
    new_name: '',
    start_date: '',
    end_date: '',
    percentage_change: 0,
    apply_to_clinics: [] as string[]
  });

  useEffect(() => {
    if (currentTenant?.id) {
      fetchSchedules();
    }
  }, [currentTenant]);

  const fetchSchedules = async () => {
    if (!currentTenant?.id) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('fee_schedules')
        .select(`
          *,
          clients(name),
          fee_schedule_items(
            id,
            cpt_code,
            description,
            price,
            effective_date
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .order('start_date', { ascending: false });

      if (error) throw error;

      const formattedSchedules = data?.map(schedule => ({
        ...schedule,
        clinic_name: schedule.clients?.name || 'Default/All Clinics',
        items: schedule.fee_schedule_items || []
      })) || [];

      setSchedules(formattedSchedules);

      // Log access
      await auditLogger.log({
        action: 'view',
        resource_type: 'fee_schedule',
        description: 'Viewed fee schedule management'
      });

    } catch (error) {
      console.error('Error fetching schedules:', error);
      addNotification('error', 'Failed to load fee schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Create the schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('fee_schedules')
        .insert({
          ...scheduleForm,
          tenant_id: currentTenant.id,
          laboratory_id: currentTenant.id,
          created_by: user?.id,
          is_active: true
        })
        .select()
        .single();

      if (scheduleError) throw scheduleError;

      // If percentage increase specified, copy from default with increase
      if (scheduleForm.percentage_increase > 0) {
        await applyPercentageIncrease(schedule.id, scheduleForm.percentage_increase);
      }

      // Log creation
      await auditLogger.log({
        action: 'create',
        resource_type: 'fee_schedule',
        resource_id: schedule.id,
        description: `Created fee schedule: ${scheduleForm.name}`,
        metadata: scheduleForm
      });

      addNotification('success', 'Fee schedule created successfully');
      setShowCreateModal(false);
      setScheduleForm({
        name: '',
        clinic_id: '',
        start_date: '',
        end_date: '',
        is_default: false,
        percentage_increase: 0
      });
      fetchSchedules();

    } catch (error) {
      console.error('Error creating schedule:', error);
      addNotification('error', 'Failed to create fee schedule');
    }
  };

  const handleCopySchedule = async () => {
    if (!copyForm.source_schedule_id || !copyForm.new_name) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get source schedule items
      const { data: sourceItems, error: fetchError } = await supabase
        .from('fee_schedule_items')
        .select('*')
        .eq('fee_schedule_id', copyForm.source_schedule_id);

      if (fetchError) throw fetchError;

      // Create schedules for each selected clinic (or default)
      const schedulePromises = (copyForm.apply_to_clinics.length > 0 
        ? copyForm.apply_to_clinics 
        : ['default']
      ).map(async (clinicId) => {
        // Create new schedule
        const { data: newSchedule, error: scheduleError } = await supabase
          .from('fee_schedules')
          .insert({
            name: copyForm.new_name,
            clinic_id: clinicId === 'default' ? null : clinicId,
            laboratory_id: currentTenant?.id,
            start_date: copyForm.start_date,
            end_date: copyForm.end_date,
            is_default: clinicId === 'default',
            is_active: true,
            parent_schedule_id: copyForm.source_schedule_id,
            percentage_change: copyForm.percentage_change,
            tenant_id: currentTenant?.id,
            created_by: user?.id
          })
          .select()
          .single();

        if (scheduleError) throw scheduleError;

        // Copy items with percentage change
        const newItems = sourceItems?.map(item => ({
          fee_schedule_id: newSchedule.id,
          cpt_code: item.cpt_code,
          description: item.description,
          price: item.price * (1 + copyForm.percentage_change / 100),
          effective_date: copyForm.start_date
        })) || [];

        const { error: itemsError } = await supabase
          .from('fee_schedule_items')
          .insert(newItems);

        if (itemsError) throw itemsError;

        return newSchedule;
      });

      await Promise.all(schedulePromises);

      // Log copy
      await auditLogger.log({
        action: 'create',
        resource_type: 'fee_schedule',
        description: `Copied fee schedule with ${copyForm.percentage_change}% change`,
        metadata: copyForm
      });

      addNotification('success', 
        `Fee schedule copied successfully${copyForm.percentage_change ? ` with ${copyForm.percentage_change}% adjustment` : ''}`
      );
      
      setShowCopyModal(false);
      setCopyForm({
        source_schedule_id: '',
        new_name: '',
        start_date: '',
        end_date: '',
        percentage_change: 0,
        apply_to_clinics: []
      });
      fetchSchedules();

    } catch (error) {
      console.error('Error copying schedule:', error);
      addNotification('error', 'Failed to copy fee schedule');
    }
  };

  const applyPercentageIncrease = async (scheduleId: string, percentage: number) => {
    try {
      // Get default schedule items
      const { data: defaultItems, error } = await supabase
        .from('fee_schedule_items')
        .select('*')
        .eq('fee_schedule_id', schedules.find(s => s.is_default)?.id);

      if (error) throw error;

      // Apply percentage increase
      const newItems = defaultItems?.map(item => ({
        fee_schedule_id: scheduleId,
        cpt_code: item.cpt_code,
        description: item.description,
        price: item.price * (1 + percentage / 100),
        effective_date: new Date().toISOString()
      })) || [];

      const { error: insertError } = await supabase
        .from('fee_schedule_items')
        .insert(newItems);

      if (insertError) throw insertError;

    } catch (error) {
      console.error('Error applying percentage increase:', error);
      throw error;
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this fee schedule?')) return;

    try {
      // Soft delete by marking inactive
      const { error } = await supabase
        .from('fee_schedules')
        .update({ is_active: false })
        .eq('id', scheduleId);

      if (error) throw error;

      // Log deletion
      await auditLogger.log({
        action: 'delete',
        resource_type: 'fee_schedule',
        resource_id: scheduleId,
        description: 'Deleted fee schedule'
      });

      addNotification('success', 'Fee schedule deleted successfully');
      fetchSchedules();

    } catch (error) {
      console.error('Error deleting schedule:', error);
      addNotification('error', 'Failed to delete fee schedule');
    }
  };

  const getPriceForService = (
    cptCode: string,
    dateOfService: string,
    clinicId?: string
  ): number | null => {
    // Find applicable schedule based on date of service
    const applicableSchedules = schedules.filter(schedule => {
      const startDate = new Date(schedule.start_date);
      const endDate = schedule.end_date ? new Date(schedule.end_date) : new Date('2099-12-31');
      const dos = new Date(dateOfService);
      
      const dateInRange = dos >= startDate && dos <= endDate;
      const clinicMatch = !clinicId || schedule.clinic_id === clinicId || schedule.is_default;
      
      return dateInRange && clinicMatch && schedule.is_active;
    });

    // Sort by specificity (clinic-specific first, then default)
    applicableSchedules.sort((a, b) => {
      if (a.clinic_id && !b.clinic_id) return -1;
      if (!a.clinic_id && b.clinic_id) return 1;
      return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });

    // Get price from most specific schedule
    if (applicableSchedules.length > 0) {
      const item = applicableSchedules[0].items?.find(i => i.cpt_code === cptCode);
      return item?.price || null;
    }

    return null;
  };

  const handleImportCSV = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        const items = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          return {
            cpt_code: values[headers.indexOf('CPT Code')] || values[0],
            description: values[headers.indexOf('Description')] || values[1],
            price: parseFloat(values[headers.indexOf('Price')] || values[2])
          };
        }).filter(item => item.cpt_code && !isNaN(item.price));

        if (selectedSchedule) {
          const { error } = await supabase
            .from('fee_schedule_items')
            .upsert(
              items.map(item => ({
                ...item,
                fee_schedule_id: selectedSchedule.id,
                effective_date: selectedSchedule.start_date
              })),
              { onConflict: 'fee_schedule_id,cpt_code' }
            );

          if (error) throw error;

          addNotification('success', `Imported ${items.length} pricing items`);
          fetchSchedules();
        }
      } catch (error) {
        console.error('Error importing CSV:', error);
        addNotification('error', 'Failed to import CSV');
      }
    };
    reader.readAsText(file);
  };

  const exportScheduleToCSV = (schedule: FeeSchedule) => {
    const csv = [
      'CPT Code,Description,Price,Effective Date',
      ...(schedule.items?.map(item => 
        `${item.cpt_code},"${item.description}",${item.price},${item.effective_date}`
      ) || [])
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fee-schedule-${schedule.name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getScheduleStatus = (schedule: FeeSchedule) => {
    const now = new Date();
    const start = new Date(schedule.start_date);
    const end = schedule.end_date ? new Date(schedule.end_date) : null;

    if (now < start) {
      return { label: 'Future', color: 'bg-blue-100 text-blue-800' };
    } else if (end && now > end) {
      return { label: 'Expired', color: 'bg-gray-100 text-gray-800' };
    } else {
      return { label: 'Active', color: 'bg-green-100 text-green-800' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Fee Schedule Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage pricing schedules with date ranges and yearly adjustments
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCopyModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Copy className="h-4 w-4" />
            <span>Copy & Adjust</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Schedule</span>
          </button>
        </div>
      </div>

      {/* Year-over-Year Price Change Alert */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              2025 Price Adjustment Reminder
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              Based on contract terms, most laboratories have a 5% price increase for 2025.
              Use the "Copy & Adjust" feature to create new schedules with percentage changes.
            </p>
          </div>
        </div>
      </div>

      {/* Schedules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedules.map(schedule => {
          const status = getScheduleStatus(schedule);
          
          return (
            <div
              key={schedule.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedSchedule(schedule)}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{schedule.name}</h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {schedule.clinic_name}
                </p>
                
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex items-center justify-between">
                    <span>Start Date:</span>
                    <span>{new Date(schedule.start_date).toLocaleDateString()}</span>
                  </div>
                  {schedule.end_date && (
                    <div className="flex items-center justify-between">
                      <span>End Date:</span>
                      <span>{new Date(schedule.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Items:</span>
                    <span>{schedule.items?.length || 0} CPT codes</span>
                  </div>
                  {schedule.percentage_change && (
                    <div className="flex items-center justify-between text-green-600">
                      <span>Adjustment:</span>
                      <span>+{schedule.percentage_change}%</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center space-x-2">
                    {schedule.is_default && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportScheduleToCSV(schedule);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Export"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSchedule(schedule.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Create Fee Schedule</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Name *
                </label>
                <input
                  type="text"
                  value={scheduleForm.name}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 2025 Standard Pricing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={scheduleForm.start_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  value={scheduleForm.end_date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Percentage Increase from Default (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={scheduleForm.percentage_increase}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, percentage_increase: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 5 for 5% increase"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={scheduleForm.is_default}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, is_default: e.target.checked })}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="is_default" className="ml-2 text-sm text-gray-700">
                  Set as default fee schedule
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setScheduleForm({
                    name: '',
                    clinic_id: '',
                    start_date: '',
                    end_date: '',
                    is_default: false,
                    percentage_increase: 0
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                disabled={!scheduleForm.name || !scheduleForm.start_date}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy & Adjust Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[600px]">
            <h3 className="text-lg font-semibold mb-4">Copy & Adjust Fee Schedule</h3>
            
            <div className="bg-blue-50 p-3 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Use this feature for yearly price adjustments. 
                For example, apply a 5% increase for 2025 contracts.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Schedule *
                </label>
                <select
                  value={copyForm.source_schedule_id}
                  onChange={(e) => setCopyForm({ ...copyForm, source_schedule_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a schedule to copy</option>
                  {schedules.map(schedule => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.name} ({schedule.clinic_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Schedule Name *
                </label>
                <input
                  type="text"
                  value={copyForm.new_name}
                  onChange={(e) => setCopyForm({ ...copyForm, new_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., 2025 Pricing - 5% Increase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={copyForm.start_date}
                    onChange={(e) => setCopyForm({ ...copyForm, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={copyForm.end_date}
                    onChange={(e) => setCopyForm({ ...copyForm, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Adjustment (%)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.1"
                    value={copyForm.percentage_change}
                    onChange={(e) => setCopyForm({ ...copyForm, percentage_change: parseFloat(e.target.value) })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., 5 for 5% increase"
                  />
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setCopyForm({ ...copyForm, percentage_change: 5 })}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    >
                      +5%
                    </button>
                    <button
                      onClick={() => setCopyForm({ ...copyForm, percentage_change: 3 })}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                    >
                      +3%
                    </button>
                  </div>
                </div>
                {copyForm.percentage_change !== 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    All prices will be {copyForm.percentage_change > 0 ? 'increased' : 'decreased'} by {Math.abs(copyForm.percentage_change)}%
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCopyModal(false);
                  setCopyForm({
                    source_schedule_id: '',
                    new_name: '',
                    start_date: '',
                    end_date: '',
                    percentage_change: 0,
                    apply_to_clinics: []
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCopySchedule}
                disabled={!copyForm.source_schedule_id || !copyForm.new_name || !copyForm.start_date}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create Adjusted Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeeScheduleManager;

// Export the pricing lookup function for use in invoice generation
export function getPriceByDateOfService(
  cptCode: string,
  dateOfService: string,
  clinicId?: string,
  schedules?: FeeSchedule[]
): number | null {
  if (!schedules || schedules.length === 0) return null;

  // Find applicable schedule based on date of service
  const applicableSchedules = schedules.filter(schedule => {
    const startDate = new Date(schedule.start_date);
    const endDate = schedule.end_date ? new Date(schedule.end_date) : new Date('2099-12-31');
    const dos = new Date(dateOfService);
    
    const dateInRange = dos >= startDate && dos <= endDate;
    const clinicMatch = !clinicId || schedule.clinic_id === clinicId || schedule.is_default;
    
    return dateInRange && clinicMatch && schedule.is_active;
  });

  // Sort by specificity (clinic-specific first, then default)
  applicableSchedules.sort((a, b) => {
    if (a.clinic_id && !b.clinic_id) return -1;
    if (!a.clinic_id && b.clinic_id) return 1;
    return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
  });

  // Get price from most specific schedule
  if (applicableSchedules.length > 0) {
    const item = applicableSchedules[0].items?.find(i => i.cpt_code === cptCode);
    return item?.price || null;
  }

  return null;
}