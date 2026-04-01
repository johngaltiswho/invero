import type { ContractorAgreementTemplatePayload } from '@/lib/contractor-agreements/types';

export const CONTRACTOR_FUEL_PROCUREMENT_DECLARATION_TEMPLATE_KEY = 'contractor-fuel-procurement-declaration';
export const CONTRACTOR_FUEL_PROCUREMENT_DECLARATION_TEMPLATE_VERSION = 'v1';

export function renderContractorFuelProcurementDeclarationHTML(payload: ContractorAgreementTemplatePayload): string {
  return `
    <html>
      <head><meta charSet="utf-8" /><title>Fuel Procurement & Settlement Declaration</title></head>
      <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.55; padding: 32px; font-size: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 22px; font-weight: 700;">FINVERNO PRIVATE LIMITED</div>
          <div style="font-size: 20px; font-weight: 700; margin-top: 8px;">FUEL PROCUREMENT & SETTLEMENT DECLARATION</div>
          <div style="margin-top: 8px; color: #555;">Template version ${CONTRACTOR_FUEL_PROCUREMENT_DECLARATION_TEMPLATE_VERSION}</div>
        </div>

        <p>This Fuel Procurement & Settlement Declaration (“Declaration”) is made on ${payload.agreementDateLabel} by <strong>${payload.contractorName}</strong> in favour of <strong>${payload.companyName}</strong> in connection with Finverno-facilitated fuel approvals, pump routing, working capital support, and related settlement workflows.</p>

        <p><strong>SME</strong><br />
          ${payload.contractorName}<br />
          ${payload.contractorAddress || 'Address as recorded on the Finverno platform'}<br />
          ${payload.companyTypeLabel ? `${payload.companyTypeLabel}<br />` : ''}
          ${payload.registrationNumber ? `${payload.registrationLabel || 'Registration Number'}: ${payload.registrationNumber}<br />` : ''}
          ${payload.panNumber ? `PAN: ${payload.panNumber}<br />` : ''}
          ${payload.gstin ? `GSTIN: ${payload.gstin}<br />` : ''}
          ${payload.incorporationDateLabel ? `Incorporated on: ${payload.incorporationDateLabel}<br />` : ''}
          ${payload.contactPerson ? `Authorized signatory: ${payload.contactPerson}${payload.contactDesignation ? `, ${payload.contactDesignation}` : ''}<br />` : ''}
          Email: ${payload.contractorEmail}${payload.phone ? `<br />Phone: ${payload.phone}` : ''}
        </p>

        <h2 style="font-size: 16px;">1. Scope of Fuel Procurement Workflow</h2>
        <p>The SME agrees that fuel disbursement, routing to approved pump partners, approval generation, platform logging, and settlement tracking may be facilitated through the Finverno platform and associated operational controls.</p>

        <h2 style="font-size: 16px;">2. Approved Use and Vehicle Validity</h2>
        <p>The SME undertakes that only duly registered vehicles and authorized project-related operational usage will be routed through this workflow. The SME shall ensure that vehicle details, operator details, and usage intent provided on the platform are accurate and current.</p>

        <h2 style="font-size: 16px;">3. Amount, Quantity, and Actual Fill</h2>
        <p>The SME acknowledges that fuel approvals are indicative operational ceilings only. The financially operative amount shall be the actual dispensed litres and value recorded by the approved fuel provider through the Finverno workflow, subject to Finverno review, correction rights, and audit logs.</p>

        <h2 style="font-size: 16px;">4. Platform Fee and Charges</h2>
        <p>The SME agrees that Finverno may levy platform charges, service fees, and other approved charges on actual filled fuel transactions. Where the SME is using approved credit or deferred settlement, daily charges or similar financing-linked charges may also accrue in accordance with the applicable commercial terms approved for the SME.</p>

        <h2 style="font-size: 16px;">5. Cash & Carry or Credit Mode</h2>
        <p>The SME agrees that fuel access may operate in cash-and-carry mode, prepaid balance mode, or approved credit mode, as determined by Finverno. Finverno may suspend, restrict, or reset the available balance, account limit, or mode of operation at its discretion based on risk, repayment behaviour, or operational concerns.</p>

        <h2 style="font-size: 16px;">6. Settlement, Repayment, and Recovery</h2>
        <p>The SME undertakes to settle all fuel dues, charges, and related fees payable to Finverno within the applicable agreed timeline. Finverno may recover outstanding dues through direct payment request, set-off, suspension of future approvals, or any other available contractual or lawful means.</p>

        <h2 style="font-size: 16px;">7. Pump Validation and Records</h2>
        <p>The SME accepts that pump-side validation, approval codes, fill logs, quantity records, amount records, timestamps, and related system entries will be treated as business records and may be relied upon by Finverno for reconciliation, settlement, and dispute handling.</p>

        <h2 style="font-size: 16px;">8. Misuse, Fraud, and Suspension</h2>
        <p>The SME shall not create duplicate requests, misstate vehicle usage, collude with fuel providers, inflate quantities, or misuse the workflow for non-project or unauthorized use. Finverno may immediately suspend access and pursue recovery or other action where misuse, fraud, or discrepancy is detected.</p>

        <h2 style="font-size: 16px;">9. General</h2>
        <p>This Declaration shall be read together with the SME’s platform terms, financing arrangements (if any), and fuel account terms configured by Finverno. Portal records, approval records, emails, fill confirmations, and digital copies may be relied upon as evidence. This Declaration shall be governed by the laws of India and subject to the courts at ${payload.jurisdiction}.</p>
        <p>This Declaration may be signed electronically through the Finverno contractor portal. Electronic signatures and execution records shall have the same legal validity and enforceability as physical signatures, to the extent permitted under applicable law, including the Information Technology Act, 2000.</p>

        ${payload.note ? `<h2 style="font-size: 16px;">Schedule / Notes</h2><p>${payload.note}</p>` : ''}

        <div style="margin-top: 42px;">
          <p><strong>For Finverno Private Limited</strong></p>
          <p style="margin-top: 48px;">__________________________</p>
          <p>${payload.companySignatoryName}</p>
          <p>${payload.companySignatoryTitle}</p>
          ${payload.companyCountersignedAtLabel ? `<p><strong>Countersigned on:</strong> ${payload.companyCountersignedAtLabel}</p>` : ''}
        </div>

        <div style="margin-top: 42px;">
          <p><strong>For the SME</strong></p>
          <p style="margin-top: 48px;">__________________________</p>
          ${
            payload.contractorSignedName
              ? `<p><strong>Electronically signed by:</strong> ${payload.contractorSignedName}</p>
                 <p><strong>Signed on:</strong> ${payload.contractorSignedAtLabel || 'Recorded on platform'}</p>`
              : ''
          }
          <p>${payload.contractorSignedName || payload.contactPerson || payload.contractorName}</p>
          <p>${payload.contractorName}</p>
        </div>
      </body>
    </html>
  `.trim();
}
