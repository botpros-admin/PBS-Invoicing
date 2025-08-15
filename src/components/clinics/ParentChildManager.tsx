import React, { useState, useEffect } from 'react';
import {
  Building,
  Building2,
  Users,
  Link,
  Unlink,
  ChevronRight,
  ChevronDown,
  DollarSign,
  FileText,
  CreditCard,
  Plus,
  Edit2,
  Search,
  Check,
  X
} from 'lucide-react';
import { supabase } from '../../api/supabase';
import { useNotifications } from '../../context/NotificationContext';
import { useTenant } from '../../context/TenantContext';
import { auditLogger } from '../../utils/security/auditLogger';

interface ParentAccount {
  id: string;
  name: string;
  code: string;
  billing_email: string;
  total_children: number;
  total_outstanding: number;
  active: boolean;
  created_at: string;
  children?: ChildClinic[];
}

interface ChildClinic {
  id: string;
  name: string;
  parent_id: string;
  clinic_code: string;
  outstanding_balance: number;
  invoice_count: number;
  last_payment_date?: string;
  sales_rep?: string;
  active: boolean;
}

interface PaymentAllocation {
  clinic_id: string;
  clinic_name: string;
  invoice_ids: string[];
  allocated_amount: number;
  outstanding_amount: number;
}

const ParentChildManager: React.FC = () => {
  const { addNotification } = useNotifications();
  const { currentTenant } = useTenant();
  
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentAccount | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form states
  const [parentForm, setParentForm] = useState({
    name: '',
    code: '',
    billing_email: '',
    billing_address: '',
    payment_terms: 30
  });

  const [linkForm, setLinkForm] = useState({
    parent_id: '',
    clinic_ids: [] as string[]
  });

  const [paymentForm, setPaymentForm] = useState({
    parent_id: '',
    payment_amount: 0,
    payment_method: 'check',
    check_number: '',
    allocations: [] as PaymentAllocation[]
  });

  useEffect(() => {
    if (currentTenant?.id) {
      fetchParentAccounts();
    }
  }, [currentTenant]);

  const fetchParentAccounts = async () => {
    if (!currentTenant?.id) return;

    try {
      setLoading(true);

      // Fetch parent accounts with children
      const { data, error } = await supabase
        .from('parent_accounts')
        .select(`
          *,
          clients!parent_id(
            id,
            name,
            clinic_code,
            sales_rep,
            active,
            invoices(
              balance,
              status
            )
          )
        `)
        .eq('tenant_id', currentTenant.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Process data to calculate totals
      const processedAccounts = data?.map(parent => {
        const children = parent.clients || [];
        const totalOutstanding = children.reduce((sum: number, child: any) => {
          const childBalance = child.invoices?.reduce((total: number, inv: any) => 
            inv.status !== 'paid' ? total + (inv.balance || 0) : total, 0) || 0;
          return sum + childBalance;
        }, 0);

        return {
          ...parent,
          total_children: children.length,
          total_outstanding: totalOutstanding,
          children: children.map((child: any) => ({
            ...child,
            outstanding_balance: child.invoices?.reduce((total: number, inv: any) => 
              inv.status !== 'paid' ? total + (inv.balance || 0) : total, 0) || 0,
            invoice_count: child.invoices?.filter((inv: any) => inv.status !== 'paid').length || 0
          }))
        };
      }) || [];

      setParentAccounts(processedAccounts);

      // Log access
      await auditLogger.log({
        action: 'view',
        resource_type: 'clinic',
        description: 'Viewed parent/child account management'
      });

    } catch (error) {
      console.error('Error fetching parent accounts:', error);
      addNotification('error', 'Failed to load parent accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateParent = async () => {
    if (!currentTenant?.id) return;

    try {
      const { data, error } = await supabase
        .from('parent_accounts')
        .insert({
          ...parentForm,
          tenant_id: currentTenant.id,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      // Log creation
      await auditLogger.log({
        action: 'create',
        resource_type: 'clinic',
        resource_id: data.id,
        description: `Created parent account: ${parentForm.name}`,
        metadata: parentForm
      });

      addNotification('success', 'Parent account created successfully');
      setShowCreateModal(false);
      setParentForm({
        name: '',
        code: '',
        billing_email: '',
        billing_address: '',
        payment_terms: 30
      });
      fetchParentAccounts();

    } catch (error) {
      console.error('Error creating parent account:', error);
      addNotification('error', 'Failed to create parent account');
    }
  };

  const handleLinkClinics = async () => {
    if (!linkForm.parent_id || linkForm.clinic_ids.length === 0) return;

    try {
      // Update clinics with parent_id
      const { error } = await supabase
        .from('clients')
        .update({ parent_id: linkForm.parent_id })
        .in('id', linkForm.clinic_ids);

      if (error) throw error;

      // Log linking
      await auditLogger.log({
        action: 'update',
        resource_type: 'clinic',
        description: `Linked ${linkForm.clinic_ids.length} clinics to parent account`,
        metadata: linkForm
      });

      addNotification('success', `Linked ${linkForm.clinic_ids.length} clinics successfully`);
      setShowLinkModal(false);
      setLinkForm({ parent_id: '', clinic_ids: [] });
      fetchParentAccounts();

    } catch (error) {
      console.error('Error linking clinics:', error);
      addNotification('error', 'Failed to link clinics');
    }
  };

  const handleUnlinkClinic = async (clinicId: string, parentId: string) => {
    if (!confirm('Are you sure you want to unlink this clinic from its parent account?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ parent_id: null })
        .eq('id', clinicId);

      if (error) throw error;

      // Log unlinking
      await auditLogger.log({
        action: 'update',
        resource_type: 'clinic',
        resource_id: clinicId,
        description: `Unlinked clinic from parent account ${parentId}`
      });

      addNotification('success', 'Clinic unlinked successfully');
      fetchParentAccounts();

    } catch (error) {
      console.error('Error unlinking clinic:', error);
      addNotification('error', 'Failed to unlink clinic');
    }
  };

  const handleParentPayment = async () => {
    if (!paymentForm.parent_id || !paymentForm.payment_amount) return;

    try {
      // Create parent payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          parent_account_id: paymentForm.parent_id,
          amount: paymentForm.payment_amount,
          payment_method: paymentForm.payment_method,
          check_number: paymentForm.check_number,
          tenant_id: currentTenant?.id,
          status: 'pending_allocation'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create allocations for each clinic
      const allocations = paymentForm.allocations.map(allocation => ({
        payment_id: payment.id,
        clinic_id: allocation.clinic_id,
        amount: allocation.allocated_amount,
        invoice_ids: allocation.invoice_ids
      }));

      const { error: allocationError } = await supabase
        .from('payment_allocations')
        .insert(allocations);

      if (allocationError) throw allocationError;

      // Log payment
      await auditLogger.logPaymentPost(
        payment.id,
        paymentForm.payment_amount,
        paymentForm.parent_id,
        paymentForm.allocations.flatMap(a => a.invoice_ids)
      );

      addNotification('success', `Payment of $${paymentForm.payment_amount} posted successfully`);
      setShowPaymentModal(false);
      setPaymentForm({
        parent_id: '',
        payment_amount: 0,
        payment_method: 'check',
        check_number: '',
        allocations: []
      });
      fetchParentAccounts();

    } catch (error) {
      console.error('Error posting parent payment:', error);
      addNotification('error', 'Failed to post payment');
    }
  };

  const calculatePaymentAllocations = async (parentId: string, amount: number) => {
    // Fetch all outstanding invoices for children
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        balance,
        due_date,
        clients!inner(
          id,
          name,
          parent_id
        )
      `)
      .eq('clients.parent_id', parentId)
      .gt('balance', 0)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching invoices for allocation:', error);
      return [];
    }

    // Allocate payment oldest to newest
    let remainingAmount = amount;
    const allocations: PaymentAllocation[] = [];
    const clinicAllocations = new Map<string, PaymentAllocation>();

    invoices?.forEach(invoice => {
      if (remainingAmount <= 0) return;

      const allocation = Math.min(remainingAmount, invoice.balance);
      remainingAmount -= allocation;

      const clinicId = invoice.clients.id;
      if (!clinicAllocations.has(clinicId)) {
        clinicAllocations.set(clinicId, {
          clinic_id: clinicId,
          clinic_name: invoice.clients.name,
          invoice_ids: [],
          allocated_amount: 0,
          outstanding_amount: 0
        });
      }

      const clinicAlloc = clinicAllocations.get(clinicId)!;
      clinicAlloc.invoice_ids.push(invoice.id);
      clinicAlloc.allocated_amount += allocation;
      clinicAlloc.outstanding_amount += invoice.balance - allocation;
    });

    return Array.from(clinicAllocations.values());
  };

  const toggleParent = (parentId: string) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(parentId)) {
      newExpanded.delete(parentId);
    } else {
      newExpanded.add(parentId);
    }
    setExpandedParents(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredParents = parentAccounts.filter(parent =>
    parent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.children?.some(child => 
      child.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Parent/Child Account Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage corporate accounts and their child clinics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowLinkModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Link className="h-4 w-4" />
            <span>Link Clinics</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Parent Account</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search parent accounts or clinics..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Parent Accounts List */}
      <div className="bg-white rounded-lg shadow">
        {filteredParents.map(parent => (
          <div key={parent.id} className="border-b last:border-0">
            {/* Parent Header */}
            <div
              className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => toggleParent(parent.id)}
            >
              <div className="flex items-center space-x-3">
                <button className="p-1">
                  {expandedParents.has(parent.id) ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-gray-900">{parent.name}</h3>
                  <p className="text-sm text-gray-500">
                    Code: {parent.code} • {parent.total_children} clinics
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(parent.total_outstanding)}
                  </p>
                  <p className="text-xs text-gray-500">Outstanding</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedParent(parent);
                    setShowPaymentModal(true);
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center space-x-1"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Pay All</span>
                </button>
              </div>
            </div>

            {/* Children Clinics */}
            {expandedParents.has(parent.id) && parent.children && (
              <div className="bg-gray-50 border-t">
                {parent.children.map(child => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between px-12 py-3 border-b last:border-0 border-gray-200"
                  >
                    <div className="flex items-center space-x-3">
                      <Building className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{child.name}</p>
                        <p className="text-xs text-gray-500">
                          {child.clinic_code} • {child.invoice_count} open invoices
                          {child.sales_rep && ` • Rep: ${child.sales_rep}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(child.outstanding_balance)}
                        </p>
                        {child.last_payment_date && (
                          <p className="text-xs text-gray-500">
                            Last payment: {new Date(child.last_payment_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnlinkClinic(child.id, parent.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Unlink from parent"
                      >
                        <Unlink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredParents.length === 0 && !loading && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No parent accounts found</p>
          </div>
        )}
      </div>

      {/* Create Parent Account Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px]">
            <h3 className="text-lg font-semibold mb-4">Create Parent Account</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={parentForm.name}
                  onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., Amedysis Corporate"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Code *
                </label>
                <input
                  type="text"
                  value={parentForm.code}
                  onChange={(e) => setParentForm({ ...parentForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g., AMED-CORP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Email *
                </label>
                <input
                  type="email"
                  value={parentForm.billing_email}
                  onChange={(e) => setParentForm({ ...parentForm, billing_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="billing@company.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Address
                </label>
                <textarea
                  value={parentForm.billing_address}
                  onChange={(e) => setParentForm({ ...parentForm, billing_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Corporate billing address..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms (Days)
                </label>
                <input
                  type="number"
                  value={parentForm.payment_terms}
                  onChange={(e) => setParentForm({ ...parentForm, payment_terms: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setParentForm({
                    name: '',
                    code: '',
                    billing_email: '',
                    billing_address: '',
                    payment_terms: 30
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateParent}
                disabled={!parentForm.name || !parentForm.code || !parentForm.billing_email}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedParent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[700px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              Post Payment for {selectedParent.name}
            </h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Total Outstanding: <strong>{formatCurrency(selectedParent.total_outstanding)}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Payment will be allocated to oldest invoices first, line by line
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.payment_amount}
                    onChange={async (e) => {
                      const amount = parseFloat(e.target.value);
                      setPaymentForm({ ...paymentForm, payment_amount: amount });
                      
                      // Calculate allocations
                      if (amount > 0) {
                        const allocations = await calculatePaymentAllocations(selectedParent.id, amount);
                        setPaymentForm(prev => ({ ...prev, allocations }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <select
                    value={paymentForm.payment_method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="check">Check</option>
                    <option value="ach">ACH</option>
                    <option value="card">Credit Card</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>

              {paymentForm.payment_method === 'check' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check Number
                  </label>
                  <input
                    type="text"
                    value={paymentForm.check_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, check_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Check #"
                  />
                </div>
              )}

              {/* Allocation Preview */}
              {paymentForm.allocations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Allocation</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Clinic</th>
                          <th className="px-4 py-2 text-right">Allocated</th>
                          <th className="px-4 py-2 text-right">Remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paymentForm.allocations.map(allocation => (
                          <tr key={allocation.clinic_id}>
                            <td className="px-4 py-2">{allocation.clinic_name}</td>
                            <td className="px-4 py-2 text-right text-green-600">
                              {formatCurrency(allocation.allocated_amount)}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-600">
                              {formatCurrency(allocation.outstanding_amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedParent(null);
                  setPaymentForm({
                    parent_id: '',
                    payment_amount: 0,
                    payment_method: 'check',
                    check_number: '',
                    allocations: []
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleParentPayment}
                disabled={!paymentForm.payment_amount || paymentForm.allocations.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Post Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentChildManager;