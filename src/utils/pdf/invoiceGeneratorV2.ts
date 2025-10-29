import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { apiClient } from '../../api/client';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface InvoiceData {
  id: string;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string;
  due_date: string;

  // Lab information
  laboratory: {
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip: string;
    email: string;
    phone: string;
    logo_url?: string;
  };

  // Client/Clinic information
  clinic: {
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip: string;
  };

  // Custom invoice information box text
  invoice_instructions?: string;

  // Payment information box text
  payment_instructions?: string;

  // Contact information
  contact_phone?: string;
  contact_email?: string;
  business_hours?: string;

  // Line items grouped by patient
  patients: PatientGroup[];

  // Totals
  subtotal: number;
  other_payments: number;
  total_due: number;
}

interface PatientGroup {
  patient_first_name: string;
  patient_last_name: string;
  patient_dob: string;
  line_items: LineItem[];
}

interface LineItem {
  date_of_service: string;
  claim_number: string;
  cpt_codes: CPTItem[];
  note?: string;
}

interface CPTItem {
  cpt_code: string;
  description: string;
  charges: number;
  payments: number;
  balance: number;
}

export class InvoicePDFGeneratorV2 {
  private doc: jsPDF;
  private pageHeight: number;
  private pageWidth: number;
  private margins = {
    top: 15,
    bottom: 15,
    left: 15,
    right: 15
  };
  private currentY: number;
  private pageNumber: number = 1;
  private lightBlue = [173, 216, 230]; // Light blue for info boxes and patient headers
  private darkGray = [64, 64, 64]; // Dark gray for text

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
      // Fetch invoice data from API
      const data = await this.fetchInvoiceData(invoiceId);

      if (!data) {
        throw new Error('Invoice not found');
      }

      // Build PDF
      this.addHeader(data);
      this.addInvoiceInfo(data);
      this.addBilledTo(data);
      this.addInvoiceInstructions(data);
      this.addPatientSections(data);
      this.addContactAndTotal(data);
      this.addPaymentInstructions(data);
      this.addPageNumbers();

      return this.doc.output('blob');
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  private async fetchInvoiceData(invoiceId: string): Promise<InvoiceData | null> {
    try {
      const response = await apiClient.get(`/invoices/${invoiceId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch invoice data:', error);
      return null;
    }
  }

  private checkPageBreak(neededSpace: number) {
    if (this.currentY + neededSpace > this.pageHeight - this.margins.bottom) {
      this.doc.addPage();
      this.pageNumber++;
      this.currentY = this.margins.top;
    }
  }

  private addHeader(data: InvoiceData) {
    // Lab logo (if available) on the left
    if (data.laboratory.logo_url) {
      // TODO: Load and add logo
      // For now, just leave space
      this.currentY += 10;
    }

    // Lab information on the left
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(data.laboratory.name, this.margins.left, this.currentY);

    this.currentY += 5;
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.laboratory.address_line1, this.margins.left, this.currentY);

    if (data.laboratory.address_line2) {
      this.currentY += 4;
      this.doc.text(data.laboratory.address_line2, this.margins.left, this.currentY);
    }

    this.currentY += 4;
    this.doc.text(
      `${data.laboratory.city}, ${data.laboratory.state} ${data.laboratory.zip}`,
      this.margins.left,
      this.currentY
    );

    this.currentY += 4;
    this.doc.text(data.laboratory.email, this.margins.left, this.currentY);

    this.currentY += 4;
    this.doc.text(data.laboratory.phone, this.margins.left, this.currentY);

    // INVOICE title on the right
    const titleY = this.margins.top;
    this.doc.setFontSize(32);
    this.doc.setFont('helvetica', 'bold');
    const titleWidth = this.doc.getTextWidth('INVOICE');
    this.doc.text('INVOICE', this.pageWidth - this.margins.right - titleWidth, titleY);

    this.currentY += 8;
  }

  private addInvoiceInfo(data: InvoiceData) {
    // Invoice details on the right side
    const rightX = this.pageWidth - this.margins.right - 60;
    const startY = this.margins.top + 20;

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');

    this.doc.text(`Invoice # ${data.invoice_number}`, rightX, startY);
    this.doc.text(`Invoice Date ${new Date(data.invoice_date).toLocaleDateString('en-US')}`, rightX, startY + 4);
    this.doc.text(`Due Date ${new Date(data.due_date).toLocaleDateString('en-US')}`, rightX, startY + 8);
    this.doc.text(`Invoice Type: ${data.invoice_type}`, rightX, startY + 12);

    this.currentY = Math.max(this.currentY, startY + 16);
  }

  private addBilledTo(data: InvoiceData) {
    this.currentY += 5;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Billed To:', this.margins.left, this.currentY);

    this.currentY += 5;
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(data.clinic.name, this.margins.left, this.currentY);

    this.currentY += 4;
    this.doc.text(data.clinic.address_line1, this.margins.left, this.currentY);

    if (data.clinic.address_line2) {
      this.currentY += 4;
      this.doc.text(data.clinic.address_line2, this.margins.left, this.currentY);
    }

    this.currentY += 4;
    this.doc.text(
      `${data.clinic.city}, ${data.clinic.state} ${data.clinic.zip}`,
      this.margins.left,
      this.currentY
    );

    // Draw horizontal line
    this.currentY += 5;
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margins.left, this.currentY, this.pageWidth - this.margins.right, this.currentY);

    this.currentY += 5;
  }

  private addInvoiceInstructions(data: InvoiceData) {
    if (!data.invoice_instructions) return;

    this.checkPageBreak(25);

    // Light blue box
    this.doc.setFillColor(...this.lightBlue);
    const boxHeight = 20;
    this.doc.rect(
      this.margins.left,
      this.currentY,
      this.pageWidth - this.margins.left - this.margins.right,
      boxHeight,
      'F'
    );

    // Title
    this.currentY += 5;
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Invoice Information', this.margins.left + 2, this.currentY);

    // Instructions text
    this.currentY += 5;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    const splitText = this.doc.splitTextToSize(
      data.invoice_instructions,
      this.pageWidth - this.margins.left - this.margins.right - 4
    );
    this.doc.text(splitText, this.margins.left + 2, this.currentY);

    this.currentY += boxHeight - 5;
  }

  private addPatientSections(data: InvoiceData) {
    data.patients.forEach((patient, index) => {
      this.checkPageBreak(40);

      // Patient header (light blue)
      this.doc.setFillColor(...this.lightBlue);
      this.doc.rect(
        this.margins.left,
        this.currentY,
        this.pageWidth - this.margins.left - this.margins.right,
        6,
        'F'
      );

      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(0, 0, 0);

      const patientName = `Patient: ${patient.patient_last_name}, ${patient.patient_first_name}`;
      const dobText = `Date of Birth: ${new Date(patient.patient_dob).toLocaleDateString('en-US')}`;

      this.doc.text(patientName, this.margins.left + 2, this.currentY + 4);

      // DOB on the right side of the header
      const dobWidth = this.doc.getTextWidth(dobText);
      this.doc.text(dobText, this.pageWidth - this.margins.right - dobWidth - 2, this.currentY + 4);

      this.currentY += 6;

      // Patient line items table
      this.addPatientLineItems(patient.line_items);

      this.currentY += 3;
    });
  }

  private addPatientLineItems(lineItems: LineItem[]) {
    lineItems.forEach(item => {
      this.checkPageBreak(30);

      const tableData: any[] = [];

      // Add each CPT code as a row
      item.cpt_codes.forEach((cpt, index) => {
        tableData.push([
          index === 0 ? new Date(item.date_of_service).toLocaleDateString('en-US') : '',
          index === 0 ? item.claim_number : '',
          `${cpt.cpt_code} - ${cpt.description}`,
          `$${cpt.charges.toFixed(2)}`,
          `$${cpt.payments.toFixed(2)}`,
          `$${cpt.balance.toFixed(2)}`
        ]);
      });

      // Add note row if present
      if (item.note) {
        tableData.push([
          '',
          'Note:',
          item.note,
          '',
          '',
          ''
        ]);
      }

      this.doc.autoTable({
        startY: this.currentY,
        head: [['Date', 'Claim #', 'CPT/Test', 'Charges', 'Payments', 'Balance']],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 8,
          fontStyle: 'bold',
          lineWidth: 0.1,
          lineColor: [0, 0, 0]
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 25 },
          2: { cellWidth: 70 },
          3: { cellWidth: 20, halign: 'right' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 20, halign: 'right' }
        },
        margin: { left: this.margins.left, right: this.margins.right },
        didDrawPage: () => {
          // Update currentY after table is drawn
        }
      });

      this.currentY = this.doc.lastAutoTable.finalY + 2;
    });
  }

  private addContactAndTotal(data: InvoiceData) {
    this.checkPageBreak(40);

    const leftX = this.margins.left;
    const rightX = this.pageWidth - this.margins.right - 50;

    // Contact information on the left
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');

    if (data.contact_phone || data.contact_email || data.business_hours) {
      this.doc.text('If you have questions, please contact us:', leftX, this.currentY);
      this.currentY += 4;

      if (data.contact_phone) {
        this.doc.text(`Phone: ${data.contact_phone}`, leftX, this.currentY);
        this.currentY += 4;
      }

      if (data.contact_email) {
        this.doc.text(`Email: ${data.contact_email}`, leftX, this.currentY);
        this.currentY += 4;
      }

      if (data.business_hours) {
        this.doc.text(`Business Hours: ${data.business_hours}`, leftX, this.currentY);
      }
    }

    // Total box on the right (light blue)
    const boxY = this.currentY - 4;
    const boxWidth = 50;
    const boxHeight = 15;

    this.doc.setFillColor(...this.lightBlue);
    this.doc.setDrawColor(0, 0, 0);
    this.doc.setLineWidth(0.3);
    this.doc.rect(rightX, boxY, boxWidth, boxHeight, 'FD');

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Other Payments/Adjustments:', rightX + 2, boxY + 4);
    this.doc.text(`$${data.other_payments.toFixed(2)}`, rightX + boxWidth - 2, boxY + 4, { align: 'right' });

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('Total Due:', rightX + 2, boxY + 10);
    this.doc.text(`$${data.total_due.toFixed(2)}`, rightX + boxWidth - 2, boxY + 10, { align: 'right' });

    this.currentY = boxY + boxHeight + 5;
  }

  private addPaymentInstructions(data: InvoiceData) {
    if (!data.payment_instructions) return;

    this.checkPageBreak(30);

    // Light blue box
    this.doc.setFillColor(...this.lightBlue);
    const boxHeight = 25;
    this.doc.rect(
      this.margins.left,
      this.currentY,
      this.pageWidth - this.margins.left - this.margins.right,
      boxHeight,
      'F'
    );

    // Title
    this.currentY += 5;
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text('Payment Information', this.margins.left + 2, this.currentY);

    // Instructions text
    this.currentY += 5;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    const splitText = this.doc.splitTextToSize(
      data.payment_instructions,
      this.pageWidth - this.margins.left - this.margins.right - 4
    );
    this.doc.text(splitText, this.margins.left + 2, this.currentY);
  }

  private addPageNumbers() {
    const totalPages = this.doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(100, 100, 100);

      const pageText = `Page ${i} of ${totalPages}`;
      const textWidth = this.doc.getTextWidth(pageText);

      this.doc.text(
        pageText,
        this.pageWidth - this.margins.right - textWidth,
        this.pageHeight - this.margins.bottom + 5
      );
    }
  }

  public async saveAsPDF(invoiceId: string, filename?: string): Promise<void> {
    const blob = await this.generateInvoicePDF(invoiceId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `invoice-${invoiceId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public async getBase64(invoiceId: string): Promise<string> {
    await this.generateInvoicePDF(invoiceId);
    return this.doc.output('datauristring');
  }
}

// Export singleton instance
export const invoicePDFGeneratorV2 = new InvoicePDFGeneratorV2();
