import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotifications } from '../../context/NotificationContext';
import { DateRange } from '../../types';
import { Widget } from './types';
import { AgingBucket, StatusDistribution, TopClient } from '../../api/services/dashboard.service'; // Import data types
import { useDashboardQueries } from './hooks/useDashboardQueries';
import { useWidgetManager } from './hooks/useWidgetManager';
import { DashboardHeader } from './components/DashboardHeader';
// import { StatCardsSection } from './components/StatCardsSection'; // Removed
import { WidgetRenderer } from './components/WidgetRenderer';
import { WidgetForm } from './components/WidgetForm';
import Modal from '../../components/Modal'; // Adjusted path
import { Edit2, GripVertical, Trash2 } from 'lucide-react';
import { HighVolumeMetrics } from '../../components/dashboard/HighVolumeMetrics';
import { 
  DndContext, 
  DragOverlay, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragStartEvent, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  SortableContext, 
  useSortable, 
  rectSortingStrategy,
  AnimateLayoutChanges,
  defaultAnimateLayoutChanges
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DnaSpinner from '../../components/common/DnaSpinner'; // Use default import

// Custom animate layout function that handles animations for widgets
const animateLayoutChanges: AnimateLayoutChanges = (args) => {
  const { isSorting, wasDragging } = args;
  
  // Only animate when not actively sorting and finished dragging
  if (!isSorting && wasDragging) {
    return defaultAnimateLayoutChanges(args);
  }
  
  return true; // Default animation behavior
};

// Wrapper component updated for dnd-kit
const WidgetWrapper: React.FC<{
  widget: Widget;
  children: React.ReactNode;
  onEdit: (widget: Widget) => void;
  onDelete: (id: string) => void;
}> = ({ widget, children, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    active,
    over,
  } = useSortable({ 
    id: widget.id,
    animateLayoutChanges
  });

  // Determine if this widget is the drop target
  const isDropTarget = over?.id === widget.id && active?.id !== widget.id;

  // Determine grid dimensions based on widget size
  const gridClass = widget.size === 'large' 
    ? 'col-span-1 sm:col-span-2 lg:col-span-4 row-span-2' // Large: 4 columns wide, 2 rows tall
    : widget.size === 'medium'
    ? 'col-span-1 sm:col-span-1 lg:col-span-2 row-span-2' // Medium: 2 columns wide, 2 rows tall
    : 'col-span-1 row-span-1'; // Small: 1 column wide, 1 row tall

  return (
    <div 
      ref={setNodeRef} 
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 999 : 'auto',
      }} 
      className={`bg-white rounded-lg shadow ${gridClass} ${
        isDropTarget ? 'ring-2 ring-blue-500 ring-opacity-70' : ''
      } transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-2 p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2">
          {/* Drag handle */}
          <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600 touch-none">
            <GripVertical size={16} />
          </div>
          <h2 className="text-sm font-semibold text-gray-700">{widget.title}</h2>
        </div>
        <div className="flex items-center space-x-1">
          {/* Edit button always rendered */}
          <button onClick={() => onEdit(widget)} className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-100" title="Edit Widget">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(widget.id)} className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-100" title="Delete Widget">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  // const { user } = useAuth(); // Removed unused variable

  const [defaultDateRange, setDefaultDateRange] = useState<DateRange>('30days');

  // Fetch data using the custom hook
  const {
    dashboardStats, isLoadingStats, isErrorStats, statsError,
    agingData, isLoadingAging, isErrorAging, agingError,
    statusData, isLoadingStatus, isErrorStatus, statusError,
    topClientsData, isLoadingTopClients, isErrorTopClients, topClientsError,
  } = useDashboardQueries(defaultDateRange);

  // Manage widgets using the custom hook - remove initialWidgets pass
  const {
    widgets,
    // setWidgets, // Keep for potential direct manipulation if needed
    showAddWidgetModal,
    setShowAddWidgetModal,
    showEditWidgetModal,
    setShowEditWidgetModal,
    selectedWidget,
    // setSelectedWidget, // Removed raw setter
    newWidget,
    // setNewWidget, // Removed raw setter
    updateNewWidgetField, // Use specific handlers instead
    updateNewWidgetConfigField,
    updateSelectedWidgetField,
    updateSelectedWidgetConfigField,
    handleEditWidgetClick,
    handleDeleteWidgetClick, // This is the wrapped version from the hook now
    handleAddWidgetClick,
    handleAddWidgetSubmit,
    handleUpdateWidgetSubmit,
    handleDragEnd: originalHandleDragEnd, // Rename original handler from hook
    isLoadingLayout, // Get loading state
  } = useWidgetManager(defaultDateRange); // Pass only defaultDateRange

  // dnd-kit sensors setup
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  // State for tracking the active dragged item ID
  const [activeId, setActiveId] = useState<string | null>(null);

  // Find the active widget data based on activeId
  const activeWidget = activeId ? widgets.find(w => w.id === activeId) : null;

  // Drag Start Handler
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Enhanced Drag End Handler with size constraint validation
  const handleDragEnd = (event: DragEndEvent) => {
    // Only proceed with reordering if we have both the active and over elements
    if (event.active && event.over) {
      const activeWidget = widgets.find(w => w.id === event.active.id);
      const overWidget = widgets.find(w => w.id === event.over?.id);
      
      if (activeWidget && overWidget) {
        // Get the size of the dragged widget
        const activeSize = activeWidget.size;
        
        // Check if the drag operation is valid based on widget sizes
        const isValidDrag = true; // Default to true, can add conditions later
        let message = `Widget "${activeWidget.title}" moved to new position.`;
        
        // Special validation for large widgets 
        // (future enhancement: add more complex validation logic as needed)
        if (activeSize === 'large') {
          // Large widgets are 4 columns wide so they need special consideration
          // We might want to ensure they can only be dropped at certain positions
          
          // For now, we allow all drops but provide a notification about optimal placement
          message = `Large widget "${activeWidget.title}" moved. For best layout, place at start of row.`;
        }
        
        // Notify the user about the drag result
        addNotification({ 
          type: 'system', 
          message: message
        });
        
        // If it's a valid drag, let the original handler handle the reordering
        if (isValidDrag) {
          originalHandleDragEnd(event);
        }
      }
    } else {
      // Call the original handler for cancellations or other cases
      originalHandleDragEnd(event);
    }
    
    // Clear the active ID for the overlay
    setActiveId(null);
  };

  // Global date range change handler
  const handleGlobalDateRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRange = e.target.value as DateRange;
    setDefaultDateRange(newRange);
    // Hooks handle query invalidation based on defaultDateRange change
    addNotification({ type: 'system', message: `Date range updated. Fetching data for ${newRange}` });
  };

  // Refresh All Data Handler
  const handleRefreshAllData = () => {
    queryClient.invalidateQueries(); // Invalidate all queries managed by react-query
    addNotification({ type: 'system', message: 'Refreshing Data: Fetching latest dashboard data...' });
  };

  // Function to get loading/error state for a specific widget based on its data source
  const getWidgetDataState = (widget: Widget) => {
    switch (widget.config.dataSource) {
      case 'aging': return { data: agingData, isLoading: isLoadingAging, isError: isErrorAging, error: agingError };
      case 'status': return { data: statusData, isLoading: isLoadingStatus, isError: isErrorStatus, error: statusError };
      case 'clients': return { data: topClientsData, isLoading: isLoadingTopClients, isError: isErrorTopClients, error: topClientsError };
      default: return { data: undefined, isLoading: false, isError: false, error: null }; // Handle unknown/custom sources
    }
  };

  // Prepare widget data with the right props
  const prepareWidgetProps = (widget: Widget) => {
    const isStat = widget.type === 'stat';
    const { isLoading, isError, error } = isStat
      ? { isLoading: isLoadingStats, isError: isErrorStats, error: statsError }
      : getWidgetDataState(widget);

    // Prepare props for WidgetRenderer
    const rendererProps: {
      widget: Widget;
      isLoading: boolean;
      isError: boolean;
      error: Error | null;
      agingData?: AgingBucket[]; 
      statusData?: StatusDistribution[]; 
      topClientsData?: TopClient[]; 
      value?: string | number;
      change?: number;
      link?: string;
    } = {
      widget: widget,
      isLoading: isLoading,
      isError: isError,
      error: error,
    };

    // Add specific data for non-stat widgets
    if (!isStat) {
      if (widget.config.dataSource === 'aging') rendererProps.agingData = agingData;
      if (widget.config.dataSource === 'status') rendererProps.statusData = statusData;
      if (widget.config.dataSource === 'clients') rendererProps.topClientsData = topClientsData;
    }
    // Add specific data for stat widgets (value, change, link)
    else if (isStat && dashboardStats) {
      const statData = dashboardStats.find(stat => stat.id === widget.id);
      if (statData) {
        rendererProps.value = statData.value;
        rendererProps.change = statData.change;
        rendererProps.link = statData.link;
      }
    }

    return rendererProps;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <DashboardHeader
        defaultDateRange={defaultDateRange}
        handleGlobalDateRangeChange={handleGlobalDateRangeChange}
        handleRefreshAllData={handleRefreshAllData}
        handleAddWidgetClick={handleAddWidgetClick}
      />

      {/* High Volume Metrics Section - PBS Specific */}
      <div className="mb-6">
        <HighVolumeMetrics />
      </div>

      {/* Dynamic Widgets Section with Drag and Drop */}
      {isLoadingLayout ? (
        <div className="flex justify-center items-center h-64">
          <DnaSpinner /> {/* Or any other loading indicator */}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={widgets.map(w => w.id)}
            strategy={rectSortingStrategy} // Use rect strategy for grid layouts
          >
            {/* Grid layout for widgets */}
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all grid-flow-dense"
              style={{ 
                position: 'relative',
                gridAutoRows: 'minmax(150px, auto)' // Set a minimum row height with automatic sizing
              }}
            >
              {widgets
                .sort((a: Widget, b: Widget) => a.position - b.position)
                .map((widget: Widget) => {
                  const rendererProps = prepareWidgetProps(widget);
                  
                  return (
                    <WidgetWrapper
                      key={widget.id}
                      widget={widget}
                      onEdit={handleEditWidgetClick}
                      onDelete={handleDeleteWidgetClick}
                    >
                      <WidgetRenderer {...rendererProps} />
                    </WidgetWrapper>
                  );
                })
              }
            </div>
          </SortableContext>

          {/* Drag Overlay for visual feedback */}
          <DragOverlay 
            adjustScale={true} 
            dropAnimation={{
              duration: 300,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
          >
            {activeWidget ? (
              <WidgetWrapper
                widget={activeWidget}
                onEdit={() => {}} // Overlay doesn't need interactions
                onDelete={() => {}} // Overlay doesn't need interactions
              >
                <WidgetRenderer {...prepareWidgetProps(activeWidget)} />
              </WidgetWrapper>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Add Widget Modal */}
      <Modal isOpen={showAddWidgetModal} onClose={() => setShowAddWidgetModal(false)} title="Add New Widget" size="md">
        <WidgetForm
          widgetData={newWidget}
          updateField={updateNewWidgetField}
          updateConfigField={updateNewWidgetConfigField}
          handleSubmit={handleAddWidgetSubmit}
          handleCancel={() => setShowAddWidgetModal(false)}
          isEdit={false}
        />
      </Modal>

      {/* Edit Widget Modal */}
      <Modal isOpen={showEditWidgetModal} onClose={() => setShowEditWidgetModal(false)} title={`Edit Widget: ${selectedWidget?.title || ''}`} size="lg">
        <WidgetForm
          widgetData={selectedWidget}
          updateField={updateSelectedWidgetField}
          updateConfigField={updateSelectedWidgetConfigField}
          handleSubmit={handleUpdateWidgetSubmit}
          handleCancel={() => setShowEditWidgetModal(false)}
          isEdit={true}
        />
      </Modal>
    </div>
  );
};

export default Dashboard;
