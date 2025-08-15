import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Authentication & Context
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { NotificationProvider } from './context/NotificationContext';

// Route Protection
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Layout
import Layout from './components/Layout';
import DnaSpinner from './components/common/DnaSpinner';

// Public Pages
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import ResetPassword from './pages/ResetPassword';
import PasswordResetHandler from './pages/PasswordResetHandler';
import UpdatePassword from './pages/UpdatePassword';
import PayInvoice from './pages/PayInvoice';
import Forbidden from './pages/Forbidden';
import NotFound from './pages/NotFound';

// Lazy load modules for better performance
const DashboardModule = lazy(() => import('./modules/dashboard'));
const BillingModule = lazy(() => import('./modules/billing'));
const OperationsModule = lazy(() => import('./modules/operations'));
const AnalyticsModule = lazy(() => import('./modules/analytics'));
const AdminModule = lazy(() => import('./modules/admin'));
const AccountModule = lazy(() => import('./modules/account'));

// Legacy pages (to be migrated)
const Invoices = lazy(() => import('./pages/Invoices'));
const CreateInvoice = lazy(() => import('./pages/CreateInvoice'));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail'));
const Payments = lazy(() => import('./pages/Payments'));
const Reports = lazy(() => import('./pages/Reports'));
const Labs = lazy(() => import('./pages/Labs'));

// Loading component for lazy loaded modules
const ModuleLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <DnaSpinner />
  </div>
);

function EnhancedApp() {
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

                {/* Protected Routes with Layout */}
                <Route element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }>
                  {/* Module Routes */}
                  <Route path="/dashboard/*" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <DashboardModule />
                    </Suspense>
                  } />
                  
                  <Route path="/billing/*" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <BillingModule />
                    </Suspense>
                  } />
                  
                  <Route path="/operations/*" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <OperationsModule />
                    </Suspense>
                  } />
                  
                  <Route path="/analytics/*" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <AnalyticsModule />
                    </Suspense>
                  } />
                  
                  <Route path="/admin/*" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <AdminModule />
                    </Suspense>
                  } />
                  
                  <Route path="/account/*" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <AccountModule />
                    </Suspense>
                  } />

                  {/* Legacy Routes (gradually migrate to modules) */}
                  <Route path="/invoices" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <Invoices />
                    </Suspense>
                  } />
                  <Route path="/invoices/create" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <CreateInvoice />
                    </Suspense>
                  } />
                  <Route path="/invoices/:id" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <InvoiceDetail />
                    </Suspense>
                  } />
                  <Route path="/payments" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <Payments />
                    </Suspense>
                  } />
                  <Route path="/reports" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <Reports />
                    </Suspense>
                  } />
                  <Route path="/labs" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <Labs />
                    </Suspense>
                  } />
                  
                  {/* Redirect old routes to new modules */}
                  <Route path="/settings/*" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <AdminModule />
                    </Suspense>
                  } />
                  <Route path="/import" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <OperationsModule />
                    </Suspense>
                  } />
                  <Route path="/profile" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <AccountModule />
                    </Suspense>
                  } />
                  <Route path="/user-settings" element={
                    <Suspense fallback={<ModuleLoader />}>
                      <AccountModule />
                    </Suspense>
                  } />
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

export default EnhancedApp;