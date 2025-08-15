import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from '../../api/supabase';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_type: string;
  clinic_name: string;
  clinic_address: string;
  clinic_city: string;
  clinic_state: string;
  clinic_zip: string;
  laboratory_name: string;
  laboratory_address: string;
  laboratory_city: string;
  laboratory_state: string;
  laboratory_zip: string;
  laboratory_phone: string;
  laboratory_email: string;
  tax_id?: string;
  invoice_date: string;
  due_date: string;
  payment_terms: number;
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  balance_due: number;
  payments: Payment[];
  credits: Credit[];
  notes?: string;
  status: string;
}

interface InvoiceLineItem {
  id: string;
  patient_first_name: string;
  patient_last_name: string;
  patient_dob: string;
  accession_number: string;
  date_of_service: string;
  cpt_code: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_deleted: boolean;
  deletion_reason?: string;
  is_disputed: boolean;
  dispute_reason?: string;
  payment_status: string;
}

interface Payment {
  payment_date: string;
  payment_method: string;
  amount: number;
  check_number?: string;
}

interface Credit {
  credit_date: string;
  amount: number;
  reason: string;
}

export class InvoicePDFGenerator {
  private doc: jsPDF;
  private pageHeight: number;
  private pageWidth: number;
  private margins = {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20
  };
  private currentY: number;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.currentY = this.margins.top;
  }

  async generateInvoicePDF(invoiceId: string): Promise<Blob> {
    try {
      // Fetch complete invoice data
      const invoiceData = await this.fetchInvoiceData(invoiceId);
      
      if (!invoiceData) {
        throw new Error('Invoice not found');
      }

      // Build PDF
      this.addHeader(invoiceData);
      this.addInvoiceInfo(invoiceData);
      this.addBillingInfo(invoiceData);
      this.addLineItems(invoiceData);
      this.addSummary(invoiceData);
      this.addPaymentHistory(invoiceData);
      this.addFooter(invoiceData);

      // Return as blob
      return this.doc.output('blob');

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  private async fetchInvoiceData(invoiceId: string): Promise<InvoiceData | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(
          name,
          address_line1,
          address_line2,
          city,
          state,
          zip,
          tax_id
        ),
        laboratories(
          name,
          address,
          city,
          state,
          zip,
          phone,
          email,
          tax_id
        ),
        invoice_line_items(
          id,
          patient_first_name,
          patient_last_name,
          patient_dob,
          accession_number,
          date_of_service,
          cpt_code,
          description,
          quantity,
          unit_price,
          total_price,
          is_deleted,
          deletion_reason,
          is_disputed,
          dispute_reason,
          payment_status
        ),
        payments(
          payment_date,
          payment_method,
          amount,
          check_number
        ),
        credit_applications(
          applied_at,
          amount,
          credits(reason)
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (error || !data) return null;

    // Format the data
    return {
      id: data.id,
      invoice_number: data.invoice_number,
      invoice_type: data.invoice_type,
      clinic_name: data.clients?.name || '',
      clinic_address: data.clients?.address_line1 || '',
      clinic_city: data.clients?.city || '',
      clinic_state: data.clients?.state || '',
      clinic_zip: data.clients?.zip || '',
      laboratory_name: data.laboratories?.name || '',
      laboratory_address: data.laboratories?.address || '',
      laboratory_city: data.laboratories?.city || '',
      laboratory_state: data.laboratories?.state || '',
      laboratory_zip: data.laboratories?.zip || '',
      laboratory_phone: data.laboratories?.phone || '',
      laboratory_email: data.laboratories?.email || '',
      tax_id: data.laboratories?.tax_id,
      invoice_date: data.invoice_date,
      due_date: data.due_date,
      payment_terms: data.payment_terms || 30,
      line_items: data.invoice_line_items || [],
      subtotal: data.subtotal || 0,
      tax_amount: data.tax_amount || 0,
      discount_amount: data.discount_amount || 0,
      total_amount: data.amount || 0,
      balance_due: data.balance || 0,
      payments: data.payments || [],
      credits: data.credit_applications?.map((ca: any) => ({
        credit_date: ca.applied_at,
        amount: ca.amount,
        reason: ca.credits?.reason || 'Credit applied'
      })) || [],
      notes: data.notes,
      status: data.status
    };
  }

  private addHeader(data: InvoiceData) {
    // Laboratory header
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(data.laboratory_name, this.margins.left, this.currentY);
    
    this.currentY += 8;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.laboratory_address, this.margins.left, this.currentY);
    
    this.currentY += 5;
    this.doc.text(
      `${data.laboratory_city}, ${data.laboratory_state} ${data.laboratory_zip}`,
      this.margins.left,
      this.currentY
    );
    
    this.currentY += 5;
    this.doc.text(`Phone: ${data.laboratory_phone}`, this.margins.left, this.currentY);
    
    this.currentY += 5;
    this.doc.text(`Email: ${data.laboratory_email}`, this.margins.left, this.currentY);
    
    if (data.tax_id) {
      this.currentY += 5;
      this.doc.text(`Tax ID: ${data.tax_id}`, this.margins.left, this.currentY);
    }

    // Invoice title
    this.currentY += 10;
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('INVOICE', this.pageWidth - this.margins.right - 40, this.margins.top);
    
    // Status badge
    if (data.status === 'paid') {
      this.doc.setTextColor(0, 128, 0);
      this.doc.setFontSize(14);
      this.doc.text('PAID', this.pageWidth - this.margins.right - 40, this.margins.top + 10);
      this.doc.setTextColor(0, 0, 0);
    } else if (data.status === 'overdue') {
      this.doc.setTextColor(255, 0, 0);
      this.doc.setFontSize(14);
      this.doc.text('OVERDUE', this.pageWidth - this.margins.right - 40, this.margins.top + 10);
      this.doc.setTextColor(0, 0, 0);
    }

    this.currentY += 10;
  }

  private addInvoiceInfo(data: InvoiceData) {
    const rightX = this.pageWidth - this.margins.right - 60;
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    // Invoice details on the right
    this.doc.text('Invoice Number:', rightX, this.currentY);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(data.invoice_number, rightX + 30, this.currentY);
    
    this.currentY += 5;
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Invoice Date:', rightX, this.currentY);
    this.doc.text(new Date(data.invoice_date).toLocaleDateString(), rightX + 30, this.currentY);
    
    this.currentY += 5;
    this.doc.text('Due Date:', rightX, this.currentY);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(new Date(data.due_date).toLocaleDateString(), rightX + 30, this.currentY);
    
    this.currentY += 5;
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Payment Terms:', rightX, this.currentY);
    this.doc.text(`Net ${data.payment_terms}`, rightX + 30, this.currentY);
    
    this.currentY += 5;
    this.doc.text('Invoice Type:', rightX, this.currentY);
    this.doc.text(data.invoice_type, rightX + 30, this.currentY);
    
    this.currentY += 10;
  }

  private addBillingInfo(data: InvoiceData) {
    // Bill To section
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Bill To:', this.margins.left, this.currentY);
    
    this.currentY += 5;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.clinic_name, this.margins.left, this.currentY);
    
    this.currentY += 5;
    this.doc.text(data.clinic_address, this.margins.left, this.currentY);
    
    this.currentY += 5;
    this.doc.text(
      `${data.clinic_city}, ${data.clinic_state} ${data.clinic_zip}`,
      this.margins.left,
      this.currentY
    );
    
    this.currentY += 15;
  }

  private addLineItems(data: InvoiceData) {
    // Filter out deleted items for clinic view
    const visibleItems = data.line_items.filter(item => !item.is_deleted);
    
    const tableData = visibleItems.map(item => [
      `${item.patient_first_name} ${item.patient_last_name}`,
      item.patient_dob ? new Date(item.patient_dob).toLocaleDateString() : '',
      item.accession_number,
      new Date(item.date_of_service).toLocaleDateString(),
      item.cpt_code,
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.total_price.toFixed(2)}`
    ]);

    this.doc.autoTable({
      startY: this.currentY,
      head: [[
        'Patient Name',
        'DOB',
        'Accession',
        'DOS',
        'CPT',
        'Description',
        'Qty',
        'Rate',
        'Amount'
      ]],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 35 }, // Patient Name
        1: { cellWidth: 20 }, // DOB
        2: { cellWidth: 25 }, // Accession
        3: { cellWidth: 20 }, // DOS
        4: { cellWidth: 15 }, // CPT
        5: { cellWidth: 40 }, // Description
        6: { cellWidth: 10, halign: 'center' }, // Qty
        7: { cellWidth: 20, halign: 'right' }, // Rate
        8: { cellWidth: 20, halign: 'right' } // Amount
      },
      margin: { left: this.margins.left, right: this.margins.right },
      didDrawPage: (data: any) => {
        this.currentY = data.cursor.y;
      }
    });

    this.currentY += 10;
  }

  private addSummary(data: InvoiceData) {
    const rightX = this.pageWidth - this.margins.right - 60;
    
    // Draw summary box
    this.doc.setDrawColor(200, 200, 200);
    this.doc.rect(rightX - 10, this.currentY - 5, 70, 40);
    
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    // Subtotal
    this.doc.text('Subtotal:', rightX, this.currentY);
    this.doc.text(`$${data.subtotal.toFixed(2)}`, rightX + 40, this.currentY, { align: 'right' });
    
    this.currentY += 5;
    
    // Tax
    if (data.tax_amount > 0) {
      this.doc.text('Tax:', rightX, this.currentY);
      this.doc.text(`$${data.tax_amount.toFixed(2)}`, rightX + 40, this.currentY, { align: 'right' });
      this.currentY += 5;
    }
    
    // Discount
    if (data.discount_amount > 0) {
      this.doc.text('Discount:', rightX, this.currentY);
      this.doc.text(`-$${data.discount_amount.toFixed(2)}`, rightX + 40, this.currentY, { align: 'right' });
      this.currentY += 5;
    }
    
    // Total
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Total:', rightX, this.currentY);
    this.doc.text(`$${data.total_amount.toFixed(2)}`, rightX + 40, this.currentY, { align: 'right' });
    
    this.currentY += 5;
    
    // Payments
    const totalPayments = data.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPayments > 0) {
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('Payments:', rightX, this.currentY);
      this.doc.text(`-$${totalPayments.toFixed(2)}`, rightX + 40, this.currentY, { align: 'right' });
      this.currentY += 5;
    }
    
    // Credits
    const totalCredits = data.credits.reduce((sum, c) => sum + c.amount, 0);
    if (totalCredits > 0) {
      this.doc.text('Credits:', rightX, this.currentY);
      this.doc.text(`-$${totalCredits.toFixed(2)}`, rightX + 40, this.currentY, { align: 'right' });
      this.currentY += 5;
    }
    
    // Balance Due
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.text('Balance Due:', rightX, this.currentY);
    this.doc.text(`$${data.balance_due.toFixed(2)}`, rightX + 40, this.currentY, { align: 'right' });
    
    this.currentY += 15;
  }

  private addPaymentHistory(data: InvoiceData) {
    if (data.payments.length === 0 && data.credits.length === 0) return;
    
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 60) {
      this.doc.addPage();
      this.currentY = this.margins.top;
    }
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Payment History', this.margins.left, this.currentY);
    
    this.currentY += 5;
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    // Payments
    data.payments.forEach(payment => {
      const paymentText = `${new Date(payment.payment_date).toLocaleDateString()} - ${
        payment.payment_method
      }${payment.check_number ? ` #${payment.check_number}` : ''}: $${payment.amount.toFixed(2)}`;
      this.doc.text(paymentText, this.margins.left + 5, this.currentY);
      this.currentY += 5;
    });
    
    // Credits
    data.credits.forEach(credit => {
      const creditText = `${new Date(credit.credit_date).toLocaleDateString()} - Credit (${
        credit.reason
      }): $${credit.amount.toFixed(2)}`;
      this.doc.text(creditText, this.margins.left + 5, this.currentY);
      this.currentY += 5;
    });
    
    this.currentY += 10;
  }

  private addFooter(data: InvoiceData) {
    // Add notes if present
    if (data.notes) {
      if (this.currentY > this.pageHeight - 40) {
        this.doc.addPage();
        this.currentY = this.margins.top;
      }
      
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text('Notes:', this.margins.left, this.currentY);
      
      this.currentY += 5;
      this.doc.setFont('helvetica', 'normal');
      const splitNotes = this.doc.splitTextToSize(
        data.notes,
        this.pageWidth - this.margins.left - this.margins.right
      );
      this.doc.text(splitNotes, this.margins.left, this.currentY);
    }
    
    // Footer on every page
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Page number
      this.doc.setFontSize(8);
      this.doc.setTextColor(128, 128, 128);
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
      
      // Footer text
      this.doc.text(
        'Thank you for your business!',
        this.margins.left,
        this.pageHeight - 10
      );
      
      this.doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        this.pageWidth - this.margins.right,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
    
    this.doc.setTextColor(0, 0, 0);
  }

  public async saveAsPDF(invoiceId: string, filename?: string): Promise<void> {
    const blob = await this.generateInvoicePDF(invoiceId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `invoice-${new Date().getTime()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public async getBase64(invoiceId: string): Promise<string> {
    await this.generateInvoicePDF(invoiceId);
    return this.doc.output('datauristring');
  }
}

// Export singleton instance
export const invoicePDFGenerator = new InvoicePDFGenerator();