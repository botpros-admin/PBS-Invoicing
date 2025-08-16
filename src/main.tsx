import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import './styles/global.css';
import { initActivityTracking } from './utils/activityTracker';
import ApiErrorInterceptor from './utils/apiErrorInterceptor';

// Initialize activity tracking to prevent session timeouts
initActivityTracking();

// Initialize global error handling
ApiErrorInterceptor.setup();

// Create a client
const queryClient = new QueryClient();

const rootElement = document.getElementById('root');

if (rootElement) {
  console.log('Root element found, rendering full app with authentication...');
  createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found!');
}
