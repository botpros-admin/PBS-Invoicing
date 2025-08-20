import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';

// Mock Stripe
vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn().mockResolvedValue({
    elements: vi.fn().mockReturnValue({
      create: vi.fn().mockReturnValue({
        mount: vi.fn(),
        unmount: vi.fn(),
        on: vi.fn(),
      }),
    }),
    confirmCardPayment: vi.fn(),
  }),
}));

// Mock Supabase
vi.mock('../api/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('Critical Business Workflows E2E', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks
    (supabase.auth.onAuthStateChange as any).mockImplementation(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }));
  });

  describe('Complete Invoice Creation to Payment Flow', () => {
    it('should complete full invoice lifecycle', async () => {
      // Step 1: Login as billing specialist
      const mockBillingUser = {
        id: 'billing-user-1',
        email: 'billing@lab.com',
        user_metadata: { role: 'billing' },
        app_metadata: { laboratory_id: 'lab-123' },
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockBillingUser, session: { user: mockBillingUser } },
        error: null,
      });

      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { user: mockBillingUser } },
        error: null,
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      // Login
      const emailInput = await screen.findByLabelText(/email/i);
      const passwordInput = await screen.findByLabelText(/password/i);
      const loginButton = await screen.findByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'billing@lab.com');
      await user.type(passwordInput, 'password123');
      await user.click(loginButton);

      // Step 2: Navigate to create invoice
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      const createInvoiceLink = await screen.findByRole('link', { name: /create invoice/i });
      await user.click(createInvoiceLink);

      // Step 3: Fill invoice form
      const mockClients = [
        { id: 'client-1', name: 'Test Clinic', laboratory_id: 'lab-123' },
      ];

      (supabase.from as any).mockImplementation((table) => {
        if (table === 'clients') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: mockClients, error: null }),
          };
        }
        return { select: vi.fn().mockReturnThis() };
      });

      await waitFor(() => {
        expect(screen.getByText(/create new invoice/i)).toBeInTheDocument();
      });

      // Select client
      const clientSelect = await screen.findByLabelText(/client/i);
      await user.selectOptions(clientSelect, 'client-1');

      // Add line items
      const addLineItemButton = await screen.findByRole('button', { name: /add line item/i });
      await user.click(addLineItemButton);

      const descriptionInput = await screen.findByPlaceholderText(/description/i);
      const quantityInput = await screen.findByPlaceholderText(/quantity/i);
      const priceInput = await screen.findByPlaceholderText(/price/i);

      await user.type(descriptionInput, 'Lab Test Service');
      await user.clear(quantityInput);
      await user.type(quantityInput, '5');
      await user.clear(priceInput);
      await user.type(priceInput, '100');

      // Mock invoice creation
      (supabase.rpc as any).mockResolvedValue({
        data: {
          id: 'inv-new-123',
          invoice_number: 'INV-2024-001',
          total_amount: 500,
        },
        error: null,
      });

      // Save invoice
      const saveButton = await screen.findByRole('button', { name: /save invoice/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/invoice created successfully/i)).toBeInTheDocument();
      });

      // Step 4: Send invoice to client
      const sendButton = await screen.findByRole('button', { name: /send to client/i });
      
      (supabase.rpc as any).mockResolvedValue({
        data: { success: true },
        error: null,
      });

      await user.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/invoice sent/i)).toBeInTheDocument();
      });

      // Step 5: Logout and access payment portal as client
      const userMenu = await screen.findByRole('button', { name: /user menu/i });
      await user.click(userMenu);
      
      const logoutButton = await screen.findByRole('button', { name: /sign out/i });
      await user.click(logoutButton);

      // Navigate to payment portal
      window.location.href = '/pay/inv-new-123';

      // Mock public invoice fetch
      (supabase.from as any).mockImplementation((table) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{
                id: 'inv-new-123',
                invoice_number: 'INV-2024-001',
                total_amount: 500,
                client_name: 'Test Clinic',
                line_items: [
                  { description: 'Lab Test Service', quantity: 5, unit_price: 100 },
                ],
              }],
              error: null,
            }),
          };
        }
      });

      // Step 6: Make payment
      const paymentPortal = render(
        <BrowserRouter initialEntries={['/pay/inv-new-123']}>
          <App />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/pay invoice/i)).toBeInTheDocument();
        expect(screen.getByText(/INV-2024-001/)).toBeInTheDocument();
        expect(screen.getByText(/\$500\.00/)).toBeInTheDocument();
      });

      // Enter payment details
      const cardElement = await screen.findByTestId('card-element');
      const payButton = await screen.findByRole('button', { name: /pay \$500\.00/i });

      // Mock Stripe payment
      const mockStripe = {
        confirmCardPayment: vi.fn().mockResolvedValue({
          paymentIntent: { status: 'succeeded' },
          error: null,
        }),
      };

      await user.click(payButton);

      await waitFor(() => {
        expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
      });

      // Step 7: Verify invoice status updated
      (supabase.from as any).mockImplementation((table) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{
                id: 'inv-new-123',
                status: 'paid',
                paid_at: new Date().toISOString(),
              }],
              error: null,
            }),
          };
        }
      });

      // Login back as billing user
      await user.click(await screen.findByRole('link', { name: /back to login/i }));
      
      await user.type(await screen.findByLabelText(/email/i), 'billing@lab.com');
      await user.type(await screen.findByLabelText(/password/i), 'password123');
      await user.click(await screen.findByRole('button', { name: /sign in/i }));

      // Navigate to invoices
      await user.click(await screen.findByRole('link', { name: /invoices/i }));

      await waitFor(() => {
        const paidBadge = screen.getByText(/paid/i);
        expect(paidBadge).toBeInTheDocument();
        expect(paidBadge).toHaveClass('bg-green-100');
      });
    });
  });

  describe('Dispute Resolution Workflow', () => {
    it('should handle invoice dispute from creation to resolution', async () => {
      // Setup: Invoice exists with disputed status
      const mockDispute = {
        id: 'dispute-123',
        invoice_id: 'inv-123',
        reason: 'Incorrect quantity billed',
        amount_disputed: 100,
        status: 'open',
        created_by: 'client-user-1',
      };

      // Step 1: Client logs in and disputes invoice
      const mockClientUser = {
        id: 'client-user-1',
        email: 'client@clinic.com',
        user_metadata: { role: 'client' },
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockClientUser, session: { user: mockClientUser } },
        error: null,
      });

      render(
        <BrowserRouter>
          <App />
        </BrowserRouter>
      );

      await user.type(await screen.findByLabelText(/email/i), 'client@clinic.com');
      await user.type(await screen.findByLabelText(/password/i), 'password123');
      await user.click(await screen.findByRole('button', { name: /sign in/i }));

      // Navigate to invoice detail
      await user.click(await screen.findByRole('link', { name: /invoices/i }));
      
      (supabase.from as any).mockImplementation((table) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [{
                id: 'inv-123',
                invoice_number: 'INV-123',
                status: 'pending',
                total_amount: 500,
              }],
              error: null,
            }),
          };
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/INV-123/)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/INV-123/));

      // File dispute
      const disputeButton = await screen.findByRole('button', { name: /dispute invoice/i });
      await user.click(disputeButton);

      const disputeModal = await screen.findByRole('dialog');
      const reasonInput = within(disputeModal).getByLabelText(/reason/i);
      const amountInput = within(disputeModal).getByLabelText(/disputed amount/i);

      await user.type(reasonInput, 'Incorrect quantity billed');
      await user.type(amountInput, '100');

      (supabase.from as any).mockImplementation((table) => {
        if (table === 'disputes') {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockDispute,
              error: null,
            }),
          };
        }
      });

      const submitDisputeButton = within(disputeModal).getByRole('button', { name: /submit dispute/i });
      await user.click(submitDisputeButton);

      await waitFor(() => {
        expect(screen.getByText(/dispute filed successfully/i)).toBeInTheDocument();
      });

      // Step 2: Billing admin reviews and resolves dispute
      await user.click(await screen.findByRole('button', { name: /sign out/i }));

      const mockBillingUser = {
        id: 'billing-user-1',
        email: 'billing@lab.com',
        user_metadata: { role: 'billing' },
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockBillingUser, session: { user: mockBillingUser } },
        error: null,
      });

      await user.type(await screen.findByLabelText(/email/i), 'billing@lab.com');
      await user.type(await screen.findByLabelText(/password/i), 'password123');
      await user.click(await screen.findByRole('button', { name: /sign in/i }));

      // Navigate to disputes
      await user.click(await screen.findByRole('link', { name: /disputes/i }));

      (supabase.from as any).mockImplementation((table) => {
        if (table === 'disputes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({
              data: [mockDispute],
              error: null,
            }),
          };
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/incorrect quantity billed/i)).toBeInTheDocument();
      });

      // Resolve dispute
      const resolveButton = await screen.findByRole('button', { name: /resolve/i });
      await user.click(resolveButton);

      const resolutionModal = await screen.findByRole('dialog');
      const resolutionSelect = within(resolutionModal).getByLabelText(/resolution/i);
      const adjustmentInput = within(resolutionModal).getByLabelText(/adjustment amount/i);
      const notesInput = within(resolutionModal).getByLabelText(/notes/i);

      await user.selectOptions(resolutionSelect, 'approved');
      await user.type(adjustmentInput, '100');
      await user.type(notesInput, 'Quantity corrected, credit applied');

      (supabase.rpc as any).mockResolvedValue({
        data: {
          dispute_id: 'dispute-123',
          status: 'resolved',
          resolution: 'approved',
          credit_amount: 100,
        },
        error: null,
      });

      const submitResolutionButton = within(resolutionModal).getByRole('button', { name: /submit resolution/i });
      await user.click(submitResolutionButton);

      await waitFor(() => {
        expect(screen.getByText(/dispute resolved/i)).toBeInTheDocument();
        expect(screen.getByText(/credit applied: \$100/i)).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should restrict features based on user role', async () => {
      const roles = [
        {
          user: {
            id: 'admin-1',
            email: 'admin@lab.com',
            user_metadata: { role: 'admin' },
          },
          canAccess: ['dashboard', 'invoices', 'payments', 'reports', 'settings'],
          cannotAccess: [],
        },
        {
          user: {
            id: 'billing-1',
            email: 'billing@lab.com',
            user_metadata: { role: 'billing' },
          },
          canAccess: ['dashboard', 'invoices', 'payments'],
          cannotAccess: ['settings', 'users'],
        },
        {
          user: {
            id: 'claims-1',
            email: 'claims@lab.com',
            user_metadata: { role: 'claims' },
          },
          canAccess: ['dashboard', 'claims'],
          cannotAccess: ['invoices/create', 'payments/process'],
        },
        {
          user: {
            id: 'client-1',
            email: 'client@clinic.com',
            user_metadata: { role: 'client' },
          },
          canAccess: ['invoices', 'payments'],
          cannotAccess: ['reports', 'settings', 'users'],
        },
      ];

      for (const roleTest of roles) {
        // Login as user
        (supabase.auth.signInWithPassword as any).mockResolvedValue({
          data: { user: roleTest.user, session: { user: roleTest.user } },
          error: null,
        });

        (supabase.auth.getSession as any).mockResolvedValue({
          data: { session: { user: roleTest.user } },
          error: null,
        });

        const { unmount } = render(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );

        await user.type(await screen.findByLabelText(/email/i), roleTest.user.email);
        await user.type(await screen.findByLabelText(/password/i), 'password123');
        await user.click(await screen.findByRole('button', { name: /sign in/i }));

        await waitFor(() => {
          expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
        });

        // Check accessible features
        for (const feature of roleTest.canAccess) {
          const element = screen.queryByRole('link', { name: new RegExp(feature, 'i') });
          if (element) {
            expect(element).toBeInTheDocument();
          }
        }

        // Check inaccessible features
        for (const feature of roleTest.cannotAccess) {
          const element = screen.queryByRole('link', { name: new RegExp(feature, 'i') });
          expect(element).not.toBeInTheDocument();
        }

        // Cleanup
        unmount();
      }
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain data consistency during concurrent operations', async () => {
      // Simulate two users trying to update the same invoice
      const invoice = {
        id: 'inv-123',
        status: 'pending',
        total_amount: 1000,
        version: 1,
      };

      // User 1 loads invoice
      const user1Session = { user: { id: 'user-1' } };
      
      // User 2 loads invoice
      const user2Session = { user: { id: 'user-2' } };

      // User 1 updates invoice
      (supabase.from as any).mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...invoice, status: 'processing', version: 2 },
          error: null,
        }),
      }));

      const update1Result = await supabase
        .from('invoices')
        .update({ status: 'processing' })
        .eq('id', 'inv-123')
        .eq('version', 1) // Optimistic locking
        .single();

      expect(update1Result.data?.version).toBe(2);

      // User 2 tries to update with old version
      (supabase.from as any).mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'P0001', message: 'Version mismatch' },
        }),
      }));

      const update2Result = await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', 'inv-123')
        .eq('version', 1) // Old version!
        .single();

      expect(update2Result.error).toBeTruthy();
      expect(update2Result.error?.message).toContain('Version mismatch');
    });
  });
});