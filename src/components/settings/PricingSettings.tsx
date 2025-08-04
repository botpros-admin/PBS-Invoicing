import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Upload, DollarSign } from 'lucide-react';
import DataTable from '../DataTable';
import Modal from '../Modal';
import { getPriceSchedules, createPriceSchedule, updatePriceSchedule } from '../../api/services/pricing.service';

const PricingSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: schedules = [], isLoading } = useQuery<any[], Error>({
    queryKey: ['priceSchedules'],
    queryFn: getPriceSchedules,
    select: (data) => data,
  });

  const handleCreateSchedule = async (scheduleData: any) => {
    setIsCreating(true);
    try {
      await createPriceSchedule(scheduleData);
      queryClient.invalidateQueries({ queryKey: ['priceSchedules'] });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create price schedule:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateSchedule = async (id: string, scheduleData: any) => {
    setIsUpdating(true);
    try {
      await updatePriceSchedule(id, scheduleData);
      queryClient.invalidateQueries({ queryKey: ['priceSchedules'] });
      setSelectedSchedule(null);
    } catch (error) {
      console.error('Failed to update price schedule:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const columns = [
    { header: 'Schedule Name', accessor: 'name', sortable: true },
    { header: 'Type', accessor: 'is_default', sortable: true, cell: ({ value }) => (value ? 'Default' : 'Custom') },
    { header: 'Assigned To', accessor: 'lab_id', sortable: true }, // Simplified for now
  ];

  const renderActions = (schedule: any) => (
    <div className="flex space-x-2">
      <button onClick={() => setSelectedSchedule(schedule)} className="text-blue-600 hover:text-blue-800">
        <Edit size={16} />
      </button>
      <button className="text-red-600 hover:text-red-800">
        <Trash2 size={16} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pricing Management</h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage default and custom price schedules for your labs and clinics.
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary">
            <Upload size={16} className="mr-2" /> Import Schedule
          </button>
          <button onClick={() => setIsModalOpen(true)} className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary">
            <Plus size={16} className="mr-2" /> Create Schedule
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-4">
        {isLoading ? (
          <p>Loading schedules...</p>
        ) : (
          <DataTable
            columns={columns}
            data={schedules}
            keyField="id"
            actions={renderActions}
          />
        )}
      </div>

      <Modal
        isOpen={isModalOpen || !!selectedSchedule}
        onClose={() => { setIsModalOpen(false); setSelectedSchedule(null); }}
        title={selectedSchedule ? 'Edit Price Schedule' : 'Create Price Schedule'}
      >
        {/* Form will go here */}
      </Modal>
    </div>
  );
};

export default PricingSettings;
