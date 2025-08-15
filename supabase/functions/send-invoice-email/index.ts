import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

interface EmailRequest {
  invoiceId: string;
  recipientEmail: string;
  recipientName?: string;
  subject?: string;
  message?: string;
  attachPdf?: boolean;
}

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  issue_date: string;
  due_date: string;
  status: string;
  description?: string;
  client: {
    name: string;
    email?: string;
    address?: string;
  };
  organization: {
    name: string;
    email?: string;
    logo_url?: string;
  };
  items?: any[];
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PBS Invoicing <invoices@yourdomain.com>',
        to: [to],
        subject,
        html,
        attachments: attachments || []
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Email sending failed: ${error}`);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function generateInvoiceHTML(invoice: Invoice, message?: string): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoice_number}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px 10px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content {
          background: white;
          padding: 30px;
          border: 1px solid #e5e5e5;
          border-radius: 0 0 10px 10px;
        }
        .invoice-details {
          background: #f7f7f7;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .invoice-details table {
          width: 100%;
          border-collapse: collapse;
        }
        .invoice-details td {
          padding: 8px 0;
        }
        .invoice-details td:first-child {
          font-weight: 600;
          color: #666;
        }
        .amount-due {
          background: #4c51bf;
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
        }
        .amount-due .label {
          font-size: 14px;
          opacity: 0.9;
        }
        .amount-due .amount {
          font-size: 32px;
          font-weight: bold;
          margin: 10px 0;
        }
        .custom-message {
          background: #f0f4ff;
          border-left: 4px solid #4c51bf;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          background: #4c51bf;
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-draft { background: #e5e5e5; color: #666; }
        .status-sent { background: #fef3c7; color: #92400e; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-overdue { background: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${invoice.organization.name}</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Invoice Notification</p>
      </div>
      
      <div class="content">
        <h2 style="color: #333; margin-top: 0;">Invoice ${invoice.invoice_number}</h2>
        <span class="status-badge status-${invoice.status}">${invoice.status}</span>
        
        ${message ? `
          <div class="custom-message">
            <p style="margin: 0;">${message}</p>
          </div>
        ` : ''}
        
        <div class="invoice-details">
          <table>
            <tr>
              <td>Client:</td>
              <td>${invoice.client.name}</td>
            </tr>
            <tr>
              <td>Invoice Number:</td>
              <td>${invoice.invoice_number}</td>
            </tr>
            <tr>
              <td>Issue Date:</td>
              <td>${formatDate(invoice.issue_date)}</td>
            </tr>
            <tr>
              <td>Due Date:</td>
              <td>${formatDate(invoice.due_date)}</td>
            </tr>
            ${invoice.description ? `
              <tr>
                <td>Description:</td>
                <td>${invoice.description}</td>
              </tr>
            ` : ''}
          </table>
        </div>
        
        <div class="amount-due">
          <div class="label">Amount Due</div>
          <div class="amount">${formatCurrency(invoice.total_amount)}</div>
          ${invoice.tax_amount > 0 ? `
            <div style="font-size: 14px; opacity: 0.9;">
              (includes ${formatCurrency(invoice.tax_amount)} tax)
            </div>
          ` : ''}
        </div>
        
        <div style="text-align: center;">
          <a href="${SUPABASE_URL}/invoices/${invoice.id}" class="button">
            View Invoice Online
          </a>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p style="font-size: 12px; color: #999;">
            This is an automated email. Please do not reply directly to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with user's auth
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Parse request body
    const { 
      invoiceId, 
      recipientEmail, 
      recipientName,
      subject: customSubject,
      message,
      attachPdf = false 
    }: EmailRequest = await req.json();

    // Validate required fields
    if (!invoiceId || !recipientEmail) {
      throw new Error('Missing required fields: invoiceId and recipientEmail');
    }

    // Fetch invoice data with related information
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients!inner(name, email, address),
        invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error(`Invoice not found: ${invoiceError?.message}`);
    }

    // Fetch organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, email, logo_url')
      .eq('id', invoice.organization_id)
      .single();

    // Prepare invoice data
    const invoiceData: Invoice = {
      ...invoice,
      client: invoice.clients,
      organization: org || { name: 'PBS Invoicing' },
      items: invoice.invoice_items
    };

    // Generate email subject
    const subject = customSubject || `Invoice ${invoice.invoice_number} from ${invoiceData.organization.name}`;

    // Generate email HTML
    const html = generateInvoiceHTML(invoiceData, message);

    // Prepare attachments if PDF is requested
    let attachments = [];
    if (attachPdf) {
      // TODO: Generate PDF and attach
      // This would require integrating a PDF generation service
      // For now, we'll skip the attachment
    }

    // Send email
    const emailResult = await sendEmail(
      recipientEmail,
      subject,
      html,
      attachments
    );

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email');
    }

    // Log email sent event
    await supabase.from('email_logs').insert({
      invoice_id: invoiceId,
      recipient_email: recipientEmail,
      subject,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    // Update invoice status if it was draft
    if (invoice.status === 'draft') {
      await supabase
        .from('invoices')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', invoiceId);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error sending invoice email:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});