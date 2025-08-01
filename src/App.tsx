import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Authentication & Context
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Route Protection
import ProtectedRoute from './components/ProtectedRoute';

// Layout
import Layout from './components/Layout';
import PublicRoute from './components/PublicRoute'; // Import PublicRoute
import ErrorBoundary from './components/ErrorBoundary'; // Import ErrorBoundary

// Pages
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard/index'; // Changed to default import and updated path
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import InvoiceDetail from './pages/InvoiceDetail';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import ImportData from './pages/ImportData';
import Forbidden from './pages/Forbidden';
import NotFound from './pages/NotFound';
import UpdatePassword from './pages/UpdatePassword';
import ResetPassword from './pages/ResetPassword';

// Presentation Pages
import ArchitecturePage from './pages/ArchitecturePage'; // Import the new Architecture page
import PricingPage from './pages/PricingPage'; // Import the new Pricing page

function App() {
  // --- Temporarily Commented Out Ghost State Detection ---
  /*
  useEffect(() => {
    // Set a timer to detect if we're stuck in a ghost state
    const ghostStateTimer = setTimeout(() => {
      const hasAuthSession = !!localStorage.getItem('pbs_invoicing_auth');
      const hasLoadedContent = document.querySelectorAll('.dashboard-card, .invoice-list-item, .settings-panel').length > 0;
      
      // If we have auth but no content loaded, we might be in a ghost state
      if (hasAuthSession && !hasLoadedContent && window.location.pathname !== '/login') {
        console.warn("Detected possible ghost state - no content loaded despite having session");
        console.log("Attempting route refresh");
        
        // Force page refresh to recover
        window.location.reload();
      }
    }, 5000);  // Check after 5 seconds
    
    return () => clearTimeout(ghostStateTimer);
  }, []);
  */
  // --- End Ghost State Detection Comment Out ---

  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/" element={<LandingPage />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              {/* Dashboard - available to all authenticated users, wrapped in ErrorBoundary */}
              <Route 
                index 
                element={
                  <ErrorBoundary fallback={<p className="text-red-500">Error loading Dashboard.</p>}>
                    <Dashboard />
                  </ErrorBoundary>
                } 
              />

              {/* Invoices */}
              <Route path="invoices" element={<Invoices />} />

              {/* Create Invoice */}
              <Route path="invoices/create" element={<CreateInvoice />} />
              
              {/* Invoice Details */}
              <Route path="invoices/:id" element={<InvoiceDetail />} />

              {/* Reports */}
              <Route path="reports" element={<Reports />} />

              {/* Import Data */}
              <Route path="import" element={<ImportData />} />

              {/* Settings */}
              {/* Note: Role checks for settings sub-routes might need to be handled within Settings component */}
              <Route path="settings/*" element={<Settings />} />
            </Route>
            {/* Special Routes */}
            <Route path="/forbidden" element={<Forbidden />} />
            
            {/* Catch-all route - redirect to 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
