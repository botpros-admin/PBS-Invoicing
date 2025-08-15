import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ImportData } from './import/ImportData';
import { ExportData } from './export/ExportData';
import { QueueManagement } from './queues/QueueManagement';
import { OperationsDashboard } from './OperationsDashboard';

export const OperationsModule: React.FC = () => {
  return (
    <Routes>
      <Route index element={<OperationsDashboard />} />
      <Route path="import" element={<ImportData />} />
      <Route path="export" element={<ExportData />} />
      <Route path="queues" element={<QueueManagement />} />
      <Route path="*" element={<Navigate to="/operations" replace />} />
    </Routes>
  );
};

export default OperationsModule;