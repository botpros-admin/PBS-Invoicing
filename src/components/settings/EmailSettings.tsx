import React, { useState } from 'react';
import {
  Mail,
  Save,
  Send,
  AlertTriangle,
  FileText,
  Clock,
  Edit,
  Code,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus
} from 'lucide-react';
import Modal from '../Modal';

// Email template types
interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  htmlContent: string;
  plainTextContent: string;
  variables: string[];
  automationRules: AutomationRule[];
}

interface AutomationRule {
  id: string;
  trigger: string;
  condition?: string;
  delay?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
  active: boolean;
}

// Mock email templates
const mockEmailTemplates: EmailTemplate[] = [
  {
    id: 'invoice-notification',
    name: 'Invoice Notification',
    description: 'Sent when a new invoice is created',
    subject: 'New Invoice: {{invoice_number}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">New Invoice: {{invoice_number}}</h2>
        <p>Dear {{client_name}},</p>
        <p>A new invoice has been created for your account.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p><strong>Amount Due:</strong> $\\{{amount}}</p>
          <p><strong>Due Date:</strong> {{due_date}}</p>
        </div>
        <p>Please review the invoice and process payment at your earliest convenience.</p>
        <p>Thank you for your business!</p>
        <p>Regards,<br>{{company_name}}</p>
      </div>
    `,
    plainTextContent: `
      New Invoice: {{invoice_number}}

      Dear {{client_name}},

      A new invoice has been created for your account.

      Invoice Number: {{invoice_number}}
      Amount Due: $\\{{amount}}
      Due Date: {{due_date}}

      Please review the invoice and process payment at your earliest convenience.

      Thank you for your business!

      Regards,
      {{company_name}}
    `,
    variables: ['invoice_number', 'client_name', 'amount', 'due_date', 'company_name'],
    automationRules: [
      {
        id: 'rule-1',
        trigger: 'invoice_created',
        active: true
      }
    ]
  },
  {
    id: 'payment-receipt',
    name: 'Payment Receipt',
    description: 'Sent when a payment is received',
    subject: 'Payment Received: {{invoice_number}}',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Payment Received</h2>
        <p>Dear {{client_name}},</p>
        <p>We have received your payment for invoice {{invoice_number}}. Thank you!</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p><strong>Payment Amount:</strong> $\\{{payment_amount}}</p>
          <p><strong>Payment Date:</strong> {{payment_date}}</p>
          <p><strong>Payment Method:</strong> {{payment_method}}</p>
        </div>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Regards,<br>{{company_name}}</p>
      </div>
    `,
    plainTextContent: `
      Payment Received

      Dear {{client_name}},

      We have received your payment for invoice {{invoice_number}}. Thank you!

      Invoice Number: {{invoice_number}}
      Payment Amount: $\\{{payment_amount}}
      Payment Date: {{payment_date}}
      Payment Method: {{payment_method}}

      If you have any questions, please don't hesitate to contact us.

      Regards,
      {{company_name}}
    `,
    variables: [
      'invoice_number',
      'client_name',
      'payment_amount',
      'payment_date',
      'payment_method',
      'company_name'
    ],
    automationRules: [
      {
        id: 'rule-1',
        trigger: 'payment_received',
        active: true
      }
    ]
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    description: 'Sent when an invoice is overdue',
    subject: 'Payment Reminder: Invoice {{invoice_number}} is Overdue',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Payment Reminder</h2>
        <p>Dear {{client_name}},</p>
        <p>This is a friendly reminder that invoice {{invoice_number}} is now overdue.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> {{invoice_number}}</p>
          <p><strong>Amount Due:</strong> $\\{{amount}}</p>
          <p><strong>Due Date:</strong> {{due_date}}</p>
          <p><strong>Days Overdue:</strong> {{days_overdue}}</p>
        </div>
        <p>Please process payment at your earliest convenience to avoid any service interruptions.</p>
        <p>If you have already made the payment, please disregard this message.</p>
        <p>Regards,<br>{{company_name}}</p>
      </div>
    `,
    plainTextContent: `
      Payment Reminder

      Dear {{client_name}},

      This is a friendly reminder that invoice {{invoice_number}} is now overdue.

      Invoice Number: {{invoice_number}}
      Amount Due: $\\{{amount}}
      Due Date: {{due_date}}
      Days Overdue: {{days_overdue}}

      Please process payment at your earliest convenience to avoid any service interruptions.

      If you have already made the payment, please disregard this message.

      Regards,
      {{company_name}}
    `,
    variables: [
      'invoice_number',
      'client_name',
      'amount',
      'due_date',
      'days_overdue',
      'company_name'
    ],
    automationRules: [
      {
        id: 'rule-1',
        trigger: 'invoice_overdue',
        condition: 'days_overdue >= 1',
        active: true
      },
      {
        id: 'rule-2',
        trigger: 'invoice_overdue',
        condition: 'days_overdue >= 7',
        active: true
      },
      {
        id: 'rule-3',
        trigger: 'invoice_overdue',
        condition: 'days_overdue >= 30',
        active: true
      }
    ]
  }
];

// Available variables for templates
const availableVariables = [
  { name: 'invoice_number', description: 'The invoice number (e.g., INV-2023-1001)' },
  { name: 'client_name', description: 'The name of the client' },
  { name: 'client_clinic', description: 'The clinic name of the client' }, // Renamed variable
  { name: 'amount', description: 'The total amount of the invoice' },
  { name: 'due_date', description: 'The due date of the invoice' },
  { name: 'days_overdue', description: 'Number of days the invoice is overdue' },
  { name: 'payment_amount', description: 'The amount of the payment received' },
  { name: 'payment_date', description: 'The date the payment was received' },
  { name: 'payment_method', description: 'The method of payment (e.g., credit card, check)' },
  { name: 'company_name', description: 'Your company name' },
  { name: 'patient_name', description: 'The name of the patient' },
  { name: 'reason_type', description: 'The reason type for the invoice (e.g., Hospice, SNF)' },
  { name: 'accession_number', description: 'The accession number for the patient' }
];

// Available triggers for automation
const availableTriggers = [
  { id: 'invoice_created', name: 'Invoice Created', description: 'Triggered when a new invoice is created' },
  { id: 'invoice_sent', name: 'Invoice Sent', description: 'Triggered when an invoice is sent to the client' },
  { id: 'payment_received', name: 'Payment Received', description: 'Triggered when a payment is received' },
  { id: 'invoice_overdue', name: 'Invoice Overdue', description: 'Triggered when an invoice becomes overdue' },
  { id: 'invoice_viewed', name: 'Invoice Viewed', description: 'Triggered when a client views the invoice' },
  { id: 'email_opened', name: 'Email Opened', description: 'Triggered when an email is opened by the recipient' },
  { id: 'link_clicked', name: 'Link Clicked', description: 'Triggered when a link in the email is clicked' }
];

const EmailSettings: React.FC = () => {
  const [smtpServer, setSmtpServer] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [fromName, setFromName] = useState('');
  const [encryption, setEncryption] = useState('tls');
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Email template editor state
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockEmailTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editorView, setEditorView] = useState<'code' | 'preview'>('code');
  const [expandedRules, setExpandedRules] = useState<string[]>([]);
  const [showVariableReference, setShowVariableReference] = useState(false);

  // NEW: Track whether we're creating a new template or editing an existing one
  const [isCreating, setIsCreating] = useState(false);

  const handleSaveSettings = () => {
    // In a real app, this would save the settings to the backend
    alert('Email settings saved successfully!');
  };

  const handleTestConnection = () => {
    setIsTesting(true);
    setTestResult(null);

    // Simulate API call to test SMTP connection
    setTimeout(() => {
      setIsTesting(false);

      // For demo purposes, we'll simulate a successful test if all required fields are filled
      if (smtpServer && smtpPort && smtpUsername && smtpPassword && fromEmail) {
        setTestResult({
          success: true,
          message: 'Connection successful! Test email sent to ' + testEmail
        });
      } else {
        setTestResult({
          success: false,
          message: 'Connection failed. Please check your SMTP settings and try again.'
        });
      }
    }, 2000);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate({ ...template });
    setIsCreating(false);
    setIsTemplateModalOpen(true);
  };

  // NEW: Handle creation of a new template
  const handleCreateTemplate = () => {
    const newTemplate: EmailTemplate = {
      id: `template-${Date.now()}`,
      name: '',
      description: '',
      subject: '',
      htmlContent: '',
      plainTextContent: '',
      variables: [],
      automationRules: []
    };
    setSelectedTemplate(newTemplate);
    setIsCreating(true);
    setIsTemplateModalOpen(true);
  };

  // NEW: Handle delete of a template
  const handleDeleteTemplate = (templateId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this template?');
    if (confirmed) {
      setTemplates((prevTemplates) => prevTemplates.filter((t) => t.id !== templateId));
    }
  };

  const handleSaveTemplate = () => {
    if (selectedTemplate) {
      if (isCreating) {
        // Add new template
        setTemplates([...templates, selectedTemplate]);
        setIsCreating(false);
      } else {
        // Update existing template
        setTemplates(
          templates.map((t) => (t.id === selectedTemplate.id ? selectedTemplate : t))
        );
      }
      setIsTemplateModalOpen(false);
    }
  };

  const toggleRuleExpansion = (ruleId: string) => {
    setExpandedRules((prev) =>
      prev.includes(ruleId) ? prev.filter((id) => id !== ruleId) : [...prev, ruleId]
    );
  };

  const handleAddAutomationRule = () => {
    if (selectedTemplate) {
      const newRule: AutomationRule = {
        id: `rule-${Date.now()}`,
        trigger: availableTriggers[0].id,
        active: true
      };

      setSelectedTemplate({
        ...selectedTemplate,
        automationRules: [...selectedTemplate.automationRules, newRule]
      });

      // Expand the newly added rule
      setExpandedRules([...expandedRules, newRule.id]);
    }
  };

  const handleDeleteAutomationRule = (ruleId: string) => {
    if (selectedTemplate) {
      setSelectedTemplate({
        ...selectedTemplate,
        automationRules: selectedTemplate.automationRules.filter(
          (rule) => rule.id !== ruleId
        )
      });

      // Remove from expanded rules if it was expanded
      setExpandedRules(expandedRules.filter((id) => id !== ruleId));
    }
  };

  const handleUpdateAutomationRule = (
    ruleId: string,
    updates: Partial<AutomationRule>
  ) => {
    if (selectedTemplate) {
      setSelectedTemplate({
        ...selectedTemplate,
        automationRules: selectedTemplate.automationRules.map((rule) =>
          rule.id === ruleId ? { ...rule, ...updates } : rule
        )
      });
    }
  };

  // Function to safely render HTML content with template variables
  const renderPreview = () => {
    if (!selectedTemplate) return null;

    // Create a safe version of the HTML with template variables highlighted
    const processedHtml = selectedTemplate.htmlContent.replace(
      /\{\{([^}]+)\}\}/g,
      '<span style="background-color: #e0f2fe; color: #0369a1; padding: 0 4px; border-radius: 2px;">{{$1}}</span>'
    );

    return { __html: processedHtml };
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Email Server Settings</h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="smtpServer" className="form-label">
                  SMTP Server
                </label>
                <input
                  type="text"
                  id="smtpServer"
                  value={smtpServer}
                  onChange={(e) => setSmtpServer(e.target.value)}
                  placeholder="smtp.example.com"
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="smtpPort" className="form-label">
                  SMTP Port
                </label>
                <input
                  type="text"
                  id="smtpPort"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="smtpUsername" className="form-label">
                  SMTP Username
                </label>
                <input
                  type="text"
                  id="smtpUsername"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="username@example.com"
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="smtpPassword" className="form-label">
                  SMTP Password
                </label>
                <input
                  type="password"
                  id="smtpPassword"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="fromEmail" className="form-label">
                  From Email Address
                </label>
                <input
                  type="email"
                  id="fromEmail"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="invoices@yourcompany.com"
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="fromName" className="form-label">
                  From Name
                </label>
                <input
                  type="text"
                  id="fromName"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="Your Company Billing"
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="encryption" className="form-label">
                  Encryption
                </label>
                <select
                  id="encryption"
                  value={encryption}
                  onChange={(e) => setEncryption(e.target.value)}
                  className="form-select"
                >
                  <option value="tls">TLS</option>
                  <option value="ssl">SSL</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Mail className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    These settings will be used for sending invoices, payment receipts, and
                    system notifications.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Test Email Configuration
        </h2>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-6">
            <div>
              <label htmlFor="testEmail" className="form-label">
                Send Test Email To
              </label>
              <input
                type="email"
                id="testEmail"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="form-input focus:ring-secondary focus:border-secondary" // Added focus color
              />
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isTesting || !testEmail}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 disabled:cursor-not-allowed" // Changed color
            >
              {isTesting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Testing Connection...
                </>
              ) : (
                <>
                  <Send size={16} className="mr-2" />
                  Send Test Email
                </>
              )}
            </button>

            {testResult && (
              <div
                className={`mt-4 p-4 border-l-4 ${
                  testResult.success
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                }`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {testResult.success ? (
                      <Mail className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p
                      className={`text-sm ${
                        testResult.success ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {testResult.message}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EMAIL TEMPLATES SECTION */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Email Templates</h2>
          {/* NEW: "Create Template" Button */}
          <button
            onClick={handleCreateTemplate}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed color
          >
            <Plus size={16} className="mr-1" />
            Create Template
          </button>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <div className="p-4 bg-white">
                    <h3 className="text-md font-medium text-gray-900">{template.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{template.description}</p>
                    <div className="mt-2">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock size={14} className="mr-1" />
                        <span>
                          {template.automationRules.filter((r) => r.active).length} active
                          automation rule(s)
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end space-x-4">
                    {/* EDIT TEMPLATE BUTTON */}
                    <button
                      onClick={() => handleEditTemplate(template)}
                      className="text-sm text-secondary hover:text-secondary/90 flex items-center" // Changed color
                    >
                      <Edit size={14} className="mr-1" />
                      Edit
                    </button>
                    {/* DELETE TEMPLATE BUTTON */}
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="text-sm text-red-600 hover:text-red-900 flex items-center"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Email templates support variables like{' '}
                    <code className="bg-yellow-100 px-1 py-0.5 rounded">
                      {'{{client_name}}'}
                    </code>
                    ,{' '}
                    <code className="bg-yellow-100 px-1 py-0.5 rounded">
                      {'{{invoice_number}}'}
                    </code>
                    , and{' '}
                    <code className="bg-yellow-100 px-1 py-0.5 rounded">
                      {'{{amount}}'}
                    </code>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed color
        >
          <Save size={16} className="mr-2" />
          Save Email Settings
        </button>
      </div>

      {/* Template Editor Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title={
          isCreating
            ? 'Create New Template'
            : `Edit Template: ${selectedTemplate?.name ?? ''}`
        }
        size="xl"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsTemplateModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed color
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTemplate}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed color
            >
              {isCreating ? 'Create Template' : 'Save Template'}
            </button>
          </div>
        }
      >
        {selectedTemplate && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="templateName" className="form-label">
                  Template Name
                </label>
                <input
                  type="text"
                  id="templateName"
                  value={selectedTemplate.name}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, name: e.target.value })
                  }
                  className="form-input"
                />
              </div>

              <div>
                <label htmlFor="templateSubject" className="form-label">
                  Email Subject
                </label>
                <input
                  type="text"
                  id="templateSubject"
                  value={selectedTemplate.subject}
                  onChange={(e) =>
                    setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })
                  }
                  className="form-input"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="templateDescription" className="form-label">
                  Description
                </label>
                <input
                  type="text"
                  id="templateDescription"
                  value={selectedTemplate.description}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      description: e.target.value
                    })
                  }
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="templateContent" className="form-label mb-0">
                  Email Content
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowVariableReference(!showVariableReference)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed color
                  >
                    {showVariableReference ? 'Hide Variables' : 'Show Variables'}
                  </button>
                  <div className="flex border border-gray-300 rounded-md overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setEditorView('code')}
                      className={`inline-flex items-center px-3 py-1 text-sm leading-4 font-medium ${
                        editorView === 'code'
                          ? 'bg-red-100 text-secondary' // Changed color
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Code size={14} className="mr-1" />
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorView('preview')}
                      className={`inline-flex items-center px-3 py-1 text-sm leading-4 font-medium ${
                        editorView === 'preview'
                          ? 'bg-red-100 text-secondary' // Changed color
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Eye size={14} className="mr-1" />
                      Preview
                    </button>
                  </div>
                </div>
              </div>

              {editorView === 'code' ? (
                <textarea
                  id="templateContent"
                  rows={15}
                  value={selectedTemplate.htmlContent}
                  onChange={(e) =>
                    setSelectedTemplate({
                      ...selectedTemplate,
                      htmlContent: e.target.value
                    })
                  }
                  className="form-input font-mono text-sm"
                  placeholder="Enter HTML content here..."
                ></textarea>
              ) : (
                <div className="border border-gray-300 rounded-md p-4 h-96 overflow-auto bg-white">
                  {/* Fix: Check return value before accessing __html */}
                  {renderPreview() ? <div dangerouslySetInnerHTML={renderPreview()!} /> : null}
                </div>
              )}

              {showVariableReference && (
                <div className="mt-4 p-4 bg-gray-100 rounded-md">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Available Variables
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {availableVariables.map((variable) => (
                      <div key={variable.name} className="text-xs">
                        <code className="bg-red-100 px-1 py-0.5 rounded text-secondary"> {/* Changed color */}
                          {'{{' + variable.name + '}}'}
                        </code>
                        <span className="ml-1 text-gray-600">{variable.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium text-gray-900">Automation Rules</h3>
                <button
                  type="button"
                  onClick={handleAddAutomationRule}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary" // Changed color
                >
                  Add Rule
                </button>
              </div>

              {selectedTemplate.automationRules.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md">
                  No automation rules configured. Click "Add Rule" to create one.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedTemplate.automationRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="border border-gray-200 rounded-md overflow-hidden"
                    >
                      <div
                        className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                        onClick={() => toggleRuleExpansion(rule.id)}
                      >
                        <div className="flex items-center">
                          <div
                            className={`h-4 w-4 rounded-full mr-2 ${
                              rule.active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                          ></div>
                          <span className="font-medium">
                            {availableTriggers.find((t) => t.id === rule.trigger)?.name ||
                              rule.trigger}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateAutomationRule(rule.id, { active: !rule.active });
                            }}
                            className={`mr-2 text-xs px-2 py-1 rounded ${
                              rule.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {rule.active ? 'Active' : 'Inactive'}
                          </button>
                          {expandedRules.includes(rule.id) ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </div>
                      </div>

                      {expandedRules.includes(rule.id) && (
                        <div className="p-4 border-t border-gray-200">
                          <div className="space-y-4">
                            <div>
                              <label className="form-label">Trigger</label>
                              <select
                                value={rule.trigger}
                                onChange={(e) =>
                                  handleUpdateAutomationRule(rule.id, {
                                    trigger: e.target.value
                                  })
                                }
                                className="form-select"
                              >
                                {availableTriggers.map((trigger) => (
                                  <option key={trigger.id} value={trigger.id}>
                                    {trigger.name} - {trigger.description}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="form-label">Condition (Optional)</label>
                              <input
                                type="text"
                                value={rule.condition || ''}
                                onChange={(e) =>
                                  handleUpdateAutomationRule(rule.id, {
                                    condition: e.target.value
                                  })
                                }
                                placeholder="e.g., days_overdue >= 7"
                                className="form-input"
                              />
                              <p className="form-hint">
                                Use conditions to specify when this rule should trigger. Leave
                                blank to always trigger.
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="form-label">Delay (Optional)</label>
                                <input
                                  type="number"
                                  value={rule.delay || ''}
                                  onChange={(e) =>
                                    handleUpdateAutomationRule(rule.id, {
                                      delay: parseInt(e.target.value) || undefined
                                    })
                                  }
                                  placeholder="e.g., 3"
                                  className="form-input"
                                />
                              </div>

                              <div>
                                <label className="form-label">Delay Unit</label>
                                <select
                                  value={rule.delayUnit || 'days'}
                                  onChange={(e) =>
                                    handleUpdateAutomationRule(rule.id, {
                                      delayUnit: e.target.value as 'minutes' | 'hours' | 'days'
                                    })
                                  }
                                  className="form-select"
                                  disabled={!rule.delay}
                                >
                                  <option value="minutes">Minutes</option>
                                  <option value="hours">Hours</option>
                                  <option value="days">Days</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                              <div className="form-checkbox-container">
                                <div className="flex items-center h-5">
                                  <input
                                    id={`active-${rule.id}`}
                                    type="checkbox"
                                    checked={rule.active}
                                    onChange={(e) =>
                                      handleUpdateAutomationRule(rule.id, {
                                        active: e.target.checked
                                      })
                                    }
                                    className="focus:ring-secondary h-4 w-4 text-secondary border-gray-300 rounded" // Changed color
                                  />
                                </div>
                                <div className="ml-3 text-sm">
                                  <label
                                    htmlFor={`active-${rule.id}`}
                                    className="font-medium text-gray-700"
                                  >
                                    Active
                                  </label>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteAutomationRule(rule.id)}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                Delete Rule
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      Automation rules determine when emails are sent. You can create multiple
                      rules for each template with different conditions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EmailSettings;
