import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Sub-components
import BillingDashboard from './components/BillingDashboard';
import InvoiceManagement from './components/InvoiceManagement';
import PaymentProcessing from './components/PaymentProcessing';
import CPTManagement from './components/CPTManagement';
import LabBilling from './components/LabBilling';
import BillingOperations from './components/BillingOperations';

// New Laboratory Features
import DisputeTicketingSystem from '../../components/disputes/DisputeTicketingSystem';
import PricingManagement from '../../components/pricing/PricingManagement';

const SimplifiedBillingHub: React.FC = () => {
  return (
    <div className="h-full">
      {/* No tab navigation here - it's now in the sidebar */}
      <Routes>
        <Route path="dashboard" element={<BillingDashboard />} />
        <Route path="invoices/*" element={<InvoiceManagement />} />
        <Route path="payments/*" element={<PaymentProcessing />} />
        <Route path="cpt/*" element={<CPTManagement />} />
        <Route path="lab-billing/*" element={<LabBilling />} />
        <Route path="operations/*" element={<BillingOperations />} />

        {/* New Laboratory Features */}
        <Route path="disputes" element={<DisputeTicketingSystem />} />
        <Route path="pricing" element={<PricingManagement />} />

        <Route index element={<Navigate to="dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default SimplifiedBillingHub;