import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import service center components - map to existing components
import ServiceManagement from './components/ServiceManagement';
import ServiceOperations from './components/ServiceOperations';
import InsuranceVerification from './components/InsuranceVerification';
import ServiceDirectory from './components/ServiceDirectory';

const SimplifiedServiceCenter: React.FC = () => {
  return (
    <div className="h-full">
      {/* No tab navigation here - it's now in the sidebar */}
      <Routes>
        <Route path="service-registry/*" element={<ServiceDirectory />} />
        <Route path="encounter-management/*" element={<ServiceManagement />} />
        <Route path="coverage-verification/*" element={<InsuranceVerification />} />
        <Route path="service-operations/*" element={<ServiceOperations />} />
        <Route index element={<Navigate to="service-registry" replace />} />
      </Routes>
    </div>
  );
};

export default SimplifiedServiceCenter;