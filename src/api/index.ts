/**
 * API Service Layer
 *
 * This module centralizes all functions for interacting with the backend API.
 * It re-exports all service functions from the services directory.
 * 
 * Note: Some legacy functions are maintained here for backward compatibility.
 * New code should use the more detailed service functions directly.
 */

// Import all service functions
export * from './services';

// Import client utilities
export { apiRequest, delay } from './client'; // Removed mockApiResponse import

// Removed unused mock data imports
import { Invoice, User, Client, FilterOptions, PaginatedResponse } from '../types';
import { delay } from './client';
import { getInvoices, getInvoiceById, createInvoice } from './services/invoice.service';
import { getCurrentUser } from './services/auth.service';
import { getClients } from './services/client.service';

// Legacy function wrappers - these maintain the same signatures but use the new implementation

/**
 * @deprecated Use getInvoices from api/services/invoice.service instead
 */
export const fetchInvoices = async (params?: FilterOptions): Promise<Invoice[]> => {
  console.log('API: Fetching invoices... (legacy method)');
  const response = await getInvoices(params);
  return response.data;
};

/**
 * @deprecated Use getInvoiceById from api/services/invoice.service instead
 */
export const fetchInvoiceById = async (id: string): Promise<Invoice | undefined> => {
  console.log(`API: Fetching invoice ${id}... (legacy method)`);
  return await getInvoiceById(id);
};

/**
 * @deprecated Use createInvoice from api/services/invoice.service instead
 */
export const createInvoiceLegacy = async (invoiceData: Omit<Invoice, 'id'>): Promise<Invoice> => {
  console.log('API: Creating invoice... (legacy method)', invoiceData);
  return await createInvoice(invoiceData as Partial<Invoice>);
};

/**
 * @deprecated Use getCurrentUser from api/services/auth.service instead
 */
export const fetchCurrentUser = async (): Promise<User> => {
  console.log('API: Fetching current user... (legacy method)');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
};

/**
 * @deprecated Use getClients from api/services/client.service instead
 */
export const fetchClients = async (): Promise<Client[]> => {
  console.log('API: Fetching clients... (legacy method)');
  const response = await getClients();
  return response.data;
};
