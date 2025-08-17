import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Authentication & Context
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { TenantProvider } from './context/TenantContext';

// Route Protection
import ProtectedRoute from './components/ProtectedRoute';

// Layout
import Layout from './components/Layout';
import PublicRoute from './components/PublicRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard/index';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ImportData from './pages/ImportData';
import Labs from './pages/Labs';
import Payments from './pages/Payments';
import Forbidden from './pages/Forbidden';
import NotFound from './pages/NotFound';
import UpdatePassword from './pages/UpdatePassword';
import PayInvoice from './pages/PayInvoice';
import ResetPassword from './pages/ResetPassword';
import PasswordResetHandler from './pages/PasswordResetHandler';
import EnhancedProfile from './pages/EnhancedProfile';
// New restructured pages
import BillingHub from './pages/BillingHub';
import MyAccount from './pages/MyAccount';
import TeamManagement from './pages/TeamManagement';
import ServiceCenter from './pages/ServiceCenter';  // Universal for labs, clinics, facilities
import Analytics from './pages/Analytics';
import DataOperations from './pages/DataOperations';
import ClientPortal from './pages/ClientPortal';  // Client portal for external clients

function App() {
  return (
    <Router future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <AuthProvider>
        <TenantProvider>
          <NotificationProvider>
            <ErrorBoundary>
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
              <Route path="/auth/reset" element={<PasswordResetHandler />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/pay/:invoiceId" element={<PayInvoice />} />

              {/* Protected Routes with Layout - Fixed structure */}
              <Route element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }>
                <Route path="/dashboard" element={<Dashboard />} />
                
                {/* New Operational Sections */}
                <Route path="/billing/*" element={<BillingHub />} />
                <Route path="/service-center/*" element={<ServiceCenter />} />
                <Route path="/team/*" element={<TeamManagement />} />
                <Route path="/analytics/*" element={<Analytics />} />
                <Route path="/data/*" element={<DataOperations />} />
                
                {/* Client Portal - External client access */}
                <Route path="/client-portal/*" element={<ClientPortal />} />
                
                {/* Personal Settings (accessed via user dropdown) */}
                <Route path="/account/*" element={<MyAccount />} />
                
                {/* Legacy routes - will be deprecated */}
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/create" element={<CreateInvoice />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings/*" element={<Settings />} />
                <Route path="/import" element={<ImportData />} />
                <Route path="/labs" element={<Labs />} />
                <Route path="/profile/*" element={<EnhancedProfile />} />
              </Route>

              {/* Error Routes */}
              <Route path="/forbidden" element={<Forbidden />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
          </NotificationProvider>
        </TenantProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;