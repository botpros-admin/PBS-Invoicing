import React from 'react';
import { InvoiceParameters } from '../../types';

interface TwoPageInvoicePreviewProps {
  invoiceParameters?: InvoiceParameters;
}

export const TwoPageInvoicePreview: React.FC<TwoPageInvoicePreviewProps> = ({
  invoiceParameters = {
    showLogo: true,
    logoPosition: 'top-left',
    headerStyle: 'modern',
    footerStyle: 'simple',
    companyName: 'Laboratory Name',
    companyAddress: 'Address Line 1\nAddress Line 2\nCity, State Zip',
    companyEmail: 'email@example.com',
    companyPhone: '(555) 555-5555',
    customMessage: 'Thank you for your business',
    primaryColor: '#0078D7',
    highlightColor: 'rgb(207, 240, 253)',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: '14px'
  }
}) => {
  const HIGHLIGHT_COLOR = invoiceParameters.highlightColor;

  return (
    <div style={{ background: '#f0f0f0', padding: '20px' }}>
      {/* PAGE 1 */}
      <div
        style={{
          width: '816px',
          height: '1056px',
          margin: '0 auto',
          backgroundColor: '#fff',
          position: 'relative',
          fontFamily: invoiceParameters.fontFamily,
          fontSize: invoiceParameters.fontSize,
          color: '#000',
          marginBottom: '40px',
        }}
      >
        {/* Logo */}
        <div style={{ position: 'absolute', transform: 'translate(81.6px, 60.9716px)', width: '103.93px', height: '112.662px' }}>
          <img src="https://media-public.canva.com/oTxJE/MAEoEUoTxJE/1/t.png" alt="B Letter Logo Business" style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Invoice Title */}
        <div style={{ position: 'absolute', transform: 'translate(493.791px, 60.9716px)', width: '240.609px', height: '63.3333px' }}>
          <h1 style={{ fontSize: '53.3333px', lineHeight: '74px', color: 'rgb(0, 0, 0)', textTransform: 'uppercase', margin: 0 }}>Invoice</h1>
        </div>

        {/* Laboratory Info */}
        <div style={{ position: 'absolute', transform: 'translate(202.995px, 64.6359px)', width: '273.331px', height: '105.333px' }}>
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: 0 }}>{invoiceParameters.companyName}</p>
          {invoiceParameters.companyAddress.split('\n').map((line, index) => (
            <p key={index} style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: 0 }}>{line}</p>
          ))}
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: 0 }}>{invoiceParameters.companyEmail}</p>
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: 0 }}>{invoiceParameters.companyPhone}</p>
        </div>

        {/* Invoice Details */}
        <div style={{ position: 'absolute', transform: 'translate(521.509px, 205.217px)', width: '212.891px', height: '84.7999px' }}>
          <p style={{ fontSize: '16.0004px', lineHeight: '22px', color: 'rgb(0, 0, 0)', margin: 0 }}>Invoice # 000000</p>
          <p style={{ fontSize: '16.0004px', lineHeight: '22px', color: 'rgb(0, 0, 0)', margin: 0 }}>Invoice Date 00/00/0000</p>
          <p style={{ fontSize: '16.0004px', lineHeight: '22px', color: 'rgb(0, 0, 0)', margin: 0 }}>Due Date 00/00/0000</p>
          <p style={{ fontSize: '16.0004px', lineHeight: '22px', color: 'rgb(0, 0, 0)', margin: 0 }}>Invoice Type: Example Field</p>
        </div>

        {/* Horizontal Line */}
        <div style={{ position: 'absolute', transform: 'translate(81.6px, 297.017px)', width: '652.8px', height: '4px', background: 'rgb(84, 84, 84)' }}></div>

        {/* Billing Info */}
        <div style={{ position: 'absolute', transform: 'translate(81.6px, 198.667px)', width: '273.331px', height: '87.3332px' }}>
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: 0, fontWeight: 700 }}>Billed To:</p>
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: 0 }}>Clinic Name</p> {/* Renamed */}
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: 0 }}>Address Line 1</p>
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: 0 }}>Address Line 2</p>
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: 0 }}>City, State Zip</p>
        </div>

        {/* Invoice Information Section */}
        <div style={{ position: 'absolute', transform: 'translate(81.6px, 318.017px)', width: '652.8px', height: '139.004px', backgroundColor: HIGHLIGHT_COLOR }}>
          <p style={{ fontSize: '21.3336px', lineHeight: '29px', color: 'rgb(0, 0, 0)', fontWeight: 700, margin: '7.169px 0 0 12.5639px' }}>Invoice Information</p>
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: '0 0 0 12.5639px' }}>
            A custom box allowing for instructions or descriptions that can be set per Client, Clinic,<br />or Invoice type. {/* Renamed */}
          </p>
        </div>

        {/* Patient Section: Doe, John */}
        <div style={{ position: 'absolute', transform: 'translate(83.7236px, 468.021px)', width: '650.676px', height: '31.5166px', backgroundColor: HIGHLIGHT_COLOR }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: '8px 0 0 6.3573px', display: 'inline' }}>Patient: </p>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: '8px 0 0 60.8262px', display: 'inline' }}>Doe, John</p>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: '8px 0 0 255.9374px', display: 'inline' }}>Date of Birth: 01/01/1950</p>
        </div>

        {/* Table Headers */}
        <div style={{ position: 'absolute', transform: 'translate(83.7236px, 506.155px)', width: '31.7519px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Date</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(184.151px, 505.538px)', width: '58.8973px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Claim #</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(303.387px, 506.155px)', width: '73.3949px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>CPT/Test</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(482.326px, 505.538px)', width: '55.1453px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Charges</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(574.928px, 506.155px)', width: '71.0267px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Payments</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(676.73px, 506.155px)', width: '57.6705px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Balance</p>
        </div>

        {/* Line Items */}
        <div style={{ position: 'absolute', transform: 'translate(83.7236px, 541px)', width: '102.551px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>01/25/2025</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(184.151px, 541px)', width: '114.803px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>123456BA456</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(303.387px, 542.021px)', width: '198.118px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>80061 - Lipid Panel</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(482.326px, 541px)', width: '59.4055px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>$6.31</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(574.928px, 542.021px)', width: '59.4055px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>$0.00</p>
        </div>
        <div style={{ position: 'absolute', transform: 'translate(676.73px, 541px)', width: '59.4055px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>$6.31</p>
        </div>

        {/* Horizontal Line */}
        <div style={{ position: 'absolute', transform: 'translate(81.6px, 525.255px)', width: '652.8px', height: '1px', background: 'rgb(84, 84, 84)' }}></div>

        {/* Footer */}
        <div style={{ position: 'absolute', transform: 'translate(662.682px, 1013.58px)', width: '114.803px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Page 1 of 2</p>
        </div>
      </div>

      {/* PAGE 2 */}
      <div
        style={{
          width: '816px',
          height: '1056px',
          margin: '0 auto',
          backgroundColor: '#fff',
          position: 'relative',
          fontFamily: invoiceParameters.fontFamily,
          fontSize: invoiceParameters.fontSize,
          color: '#000',
        }}
      >
        {/* Payment summary box */}
        <div style={{ position: 'absolute', transform: 'translate(453.366px, 228.89px)', width: '278.476px', height: '64.979px', backgroundColor: HIGHLIGHT_COLOR }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: '10.996px 0 0 9.131px' }}>Other Payments/Adjustments:</p>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: '0 0 0 209.185px', position: 'absolute', top: '10.996px' }}>$0.00</p>
          <p style={{ fontSize: '16.0004px', color: 'rgb(0, 0, 0)', fontWeight: 700, margin: '34.329px 0 0 9.131px' }}>Total Due:</p>
          <p style={{ fontSize: '16.0004px', color: 'rgb(0, 0, 0)', fontWeight: 700, margin: '34.329px 0 0 209.185px', position: 'absolute', top: '34.329px' }}>$53.71</p>
        </div>

        {/* Contact Info */}
        <div style={{ position: 'absolute', transform: 'translate(89.6471px, 230.686px)', width: '273.331px', height: '69.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>If you have questions, please contact us:</p>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Phone: {invoiceParameters.companyPhone}</p>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Email: {invoiceParameters.companyEmail}</p>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Business Hours:</p>
        </div>

        {/* Payment Information Section */}
        <div style={{ position: 'absolute', transform: 'translate(81.6px, 332.019px)', width: '652.8px', height: '195.981px', backgroundColor: HIGHLIGHT_COLOR }}>
          <p style={{ fontSize: '21.3336px', lineHeight: '29px', color: 'rgb(0, 0, 0)', fontWeight: 700, margin: '7.169px 0 0 12.5639px' }}>Payment Information</p>
          <p style={{ fontSize: '13.3338px', lineHeight: '18px', color: 'rgb(0, 0, 0)', margin: '0 0 0 12.5639px' }}>
            A custom box allowing for instructions or descriptions that can be set per Client. Should include<br />
            information on the client portal, where to remit paper checks, and how to pay by card.
          </p>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', transform: 'translate(662.682px, 1013.58px)', width: '114.803px', height: '15.3332px' }}>
          <p style={{ fontSize: '13.3338px', color: 'rgb(0, 0, 0)', margin: 0 }}>Page 2 of 2</p>
        </div>
      </div>
    </div>
  );
};
