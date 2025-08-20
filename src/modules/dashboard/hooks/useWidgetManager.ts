import { useState, useEffect, useCallback } from 'react';
import { Widget, WidgetConfig } from '../types';
import { useNotifications } from '../../../context/NotificationContext';
import { DateRange } from '../../../types';
import { supabase } from '../../../api/supabase'; // Import supabase client
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import debounce from 'lodash/debounce'; // Using lodash debounce

// Define a default layout structure including potential stat cards
// This will be used if no layout is found in the database.
// NOTE: Actual stat card data (value, change) needs to be merged in the Dashboard component.
const defaultLayout: Widget[] = [
    // Stat Cards using IDs from dashboard.service.ts
    { id: 'total-invoiced', type: 'stat', title: 'Total Invoiced', size: 'small', position: 0, config: { dateRange: '30days' } },
    { id: 'total-paid', type: 'stat', title: 'Total Paid', size: 'small', position: 1, config: { dateRange: '30days' } },
    { id: 'outstanding-balance', type: 'stat', title: 'Outstanding Balance', size: 'small', position: 2, config: { dateRange: '30days' } },
    { id: 'overdue-invoices', type: 'stat', title: 'Overdue Invoices', size: 'small', position: 3, config: { dateRange: '30days' } },
    // Original dynamic widgets
    { id: 'aging-overview', type: 'chart', title: 'AR Aging Overview', size: 'medium', position: 4, config: { dateRange: '30days', chartType: 'bar', dataSource: 'aging' } },
    { id: 'status-distribution', type: 'chart', title: 'Invoice Status Distribution', size: 'medium', position: 5, config: { dateRange: '30days', chartType: 'bar', dataSource: 'status' } },
    { id: 'top-clients', type: 'table', title: 'Top Clients by Revenue', size: 'large', position: 6, config: { dateRange: '30days', dataSource: 'clients' } }
];


export const useWidgetManager = (defaultDateRange: DateRange) => {
  const { addNotification } = useNotifications();
  const [widgets, setWidgets] = useState<Widget[]>([]); // Initialize empty, load from DB
  const [isLoadingLayout, setIsLoadingLayout] = useState(true); // Loading state
  const [showAddWidgetModal, setShowAddWidgetModal] = useState(false);
  const [showEditWidgetModal, setShowEditWidgetModal] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [newWidget, setNewWidget] = useState<Partial<Widget>>({
    type: 'chart',
    title: '',
    size: 'medium',
    config: { dateRange: defaultDateRange } // Initialize with default date range
  });

  const handleEditWidgetClick = (widget: Widget) => {
    setSelectedWidget(widget);
    setShowEditWidgetModal(true);
  };

  // Removed original handleDeleteWidgetClick as it's redefined in the return object

  const handleAddWidgetClick = () => {
    // Reset form state with the current default date range
    setNewWidget({ type: 'chart', title: '', size: 'medium', config: { dateRange: defaultDateRange } });
    setShowAddWidgetModal(true);
  };

  const handleAddWidgetSubmit = () => {
    if (!newWidget.title || !newWidget.type || !newWidget.size) {
      addNotification({ type: 'system', message: 'Validation Error: Please fill all widget details.' }); // Use 'system' type
      return;
    }
    const widgetToAdd: Widget = {
      id: `widget-${Date.now()}`,
      position: widgets.length,
      ...newWidget,
      config: { ...newWidget.config, dateRange: defaultDateRange } // Ensure date range from state
    } as Widget;

    const updatedWidgets = [...widgets, widgetToAdd]; // Calculate new state first
    setWidgets(updatedWidgets);
    setShowAddWidgetModal(false);
    addNotification({ type: 'system', message: 'Widget added successfully.' });
    // Trigger save after adding
    saveLayoutDebounced(updatedWidgets); // Pass the calculated state
  };

   const handleUpdateWidgetSubmit = () => {
    if (!selectedWidget) return;
    const updatedWidgets = widgets.map(w => w.id === selectedWidget.id ? selectedWidget : w);
    setWidgets(updatedWidgets);
    setShowEditWidgetModal(false);
    setSelectedWidget(null);
    addNotification({ type: 'system', message: 'Widget updated successfully.' });
    // Trigger save after updating
    saveLayoutDebounced(updatedWidgets);
  };

  // --- Drag and Drop Logic ---
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        // Update positions based on new order
        const finalOrder = newOrder.map((widget, index) => ({ ...widget, position: index }));
        // Trigger layout save
        saveLayoutDebounced(finalOrder);
        return finalOrder;
      });
    }
  };
  // Note: handleDragStart is often not needed with dnd-kit sortable context

  // --- Persistence Logic ---

  // Debounced function to save layout to Supabase
  const saveLayoutDebounced = useCallback(
    debounce(async (currentWidgets: Widget[]) => {
      const { error } = await supabase.rpc('update_dashboard_layout', {
        new_layout: currentWidgets,
      });

      if (error) {
        addNotification({ type: 'system', message: `Failed to save layout: ${error.message}` }); // Changed type to 'system'
      } else {
        // Optional: add a subtle success notification
        // addNotification({ type: 'success', message: 'Layout saved.' });
      }
    }, 1500), // Debounce time in ms (e.g., 1.5 seconds)
    [addNotification] // Dependencies for useCallback
  );

  // Effect to load layout on initial mount
  useEffect(() => {
    const loadLayout = async () => {
      setIsLoadingLayout(true);
      // Fetch user ID - assuming AuthContext provides this or similar mechanism
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
          // Handle case where user is not logged in - maybe redirect?
          // For now, load default layout but don't save.
          setWidgets(defaultLayout.map(w => ({...w, config: {...w.config, dateRange: defaultDateRange}})));
          setIsLoadingLayout(false);
          return;
      }

      const { data, error } = await supabase
        .from('users') // Use 'users' table
        .select('dashboard_layout')
        .eq('auth_id', user.id) // Match on auth_id
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore 'resource not found' error
        addNotification({ type: 'system', message: `Failed to load layout: ${error.message}` }); // Changed type to 'system'
        // Load default layout on error
        setWidgets(defaultLayout.map(w => ({...w, config: {...w.config, dateRange: defaultDateRange}})));
      } else if (data?.dashboard_layout && Array.isArray(data.dashboard_layout)) {
         // Ensure loaded widgets have the current defaultDateRange if not set
         const loadedWidgets = (data.dashboard_layout as Widget[]).map(w => ({
             ...w,
             config: { ...w.config, dateRange: w.config?.dateRange || defaultDateRange }
         }));
        setWidgets(loadedWidgets);
      } else {
        // Load default layout if none saved
        setWidgets(defaultLayout.map(w => ({...w, config: {...w.config, dateRange: defaultDateRange}})));
      }
      setIsLoadingLayout(false);
    };

    loadLayout();
  }, [addNotification, defaultDateRange]); // Dependency array

  // Override setWidgets to trigger save (optional, debounce handles most cases)
  // const setWidgetsAndSave = (newWidgets: Widget[] | ((prevState: Widget[]) => Widget[])) => {
  //   setWidgets(prevWidgets => {
  //       const updatedWidgets = typeof newWidgets === 'function' ? newWidgets(prevWidgets) : newWidgets;
  //       saveLayoutDebounced(updatedWidgets);
  //       return updatedWidgets;
  //   });
  // };

  // Specific update handlers for forms
  const updateNewWidgetField = (field: keyof Partial<Widget>, value: string | number | boolean) => { // Typed value
      setNewWidget(prev => ({ ...prev, [field]: value }));
  };

  const updateNewWidgetConfigField = (field: keyof WidgetConfig, value: string | number | boolean) => { // Typed value and field
      setNewWidget(prev => ({
          ...prev,
          // Ensure config exists and has dateRange before updating
          config: { ...(prev.config || { dateRange: defaultDateRange }), [field]: value }
      }));
  };

   const updateSelectedWidgetField = (field: keyof Widget, value: string | number | boolean) => { // Typed value
      setSelectedWidget(prev => prev ? { ...prev, [field]: value } : null);
  };

   const updateSelectedWidgetConfigField = (field: keyof WidgetConfig, value: string | number | boolean) => { // Typed value and field
      setSelectedWidget(prev => {
          if (!prev) return null;
          const currentConfig = prev.config; // Should exist on a full Widget
          // Construct the update payload
          const updatePayload = { [field]: value };
          // Create final config ensuring dateRange exists
          const finalConfig: WidgetConfig = {
              // dateRange: currentConfig.dateRange, // REMOVED: Redundant - included in ...currentConfig
              ...currentConfig, // Spread existing config (includes dateRange)
              ...updatePayload, // Apply the update (overwrites dateRange if field === 'dateRange')
          };
          // Ensure dateRange wasn't made invalid
          if (!finalConfig.dateRange || !['7days', '30days', '90days', 'ytd'].includes(finalConfig.dateRange)) {
             finalConfig.dateRange = '30days';
          }
          return { ...prev, config: finalConfig };
      });
  };


  return {
    widgets,
    setWidgets, // Keep for potential drag/drop
    showAddWidgetModal,
    setShowAddWidgetModal,
    showEditWidgetModal,
    setShowEditWidgetModal,
    selectedWidget,
    // setSelectedWidget, // Don't expose raw setter
    newWidget,
    // setNewWidget, // Don't expose raw setter
    updateNewWidgetField, // Expose specific handlers
    updateNewWidgetConfigField, // Expose specific handlers
    updateSelectedWidgetField, // Expose specific handlers
    updateSelectedWidgetConfigField,
    handleEditWidgetClick,
    handleDeleteWidgetClick: (widgetId: string) => {
        // Find the widget title for the confirmation message
        const widgetToDelete = widgets.find(w => w.id === widgetId);
        const title = widgetToDelete ? widgetToDelete.title : 'this widget';
        // Add confirmation dialog
        if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
            const updatedWidgets = widgets.filter(w => w.id !== widgetId);
            setWidgets(updatedWidgets);
            addNotification({ type: 'system', message: 'Widget removed successfully.' });
            saveLayoutDebounced(updatedWidgets);
        }
    },
    handleAddWidgetClick,
    handleAddWidgetSubmit,
    handleUpdateWidgetSubmit,
    // handleDragStart, // Not needed for sortable
    handleDragEnd,   // Expose dnd-kit handler
    // updateWidgetOrder, // Internal logic now handled by handleDragEnd
    isLoadingLayout, // Expose loading state
  };
};
