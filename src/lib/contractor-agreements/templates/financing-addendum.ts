import type { ContractorAgreementTemplatePayload } from '@/lib/contractor-agreements/types';

export const CONTRACTOR_FINANCING_TEMPLATE_KEY = 'contractor-financing-addendum';
export const CONTRACTOR_FINANCING_TEMPLATE_VERSION = 'v3';

export function renderContractorFinancingHTML(payload: ContractorAgreementTemplatePayload): string {
  return `
    <html>
      <head><meta charSet="utf-8" /><title>Financing Addendum</title></head>
      <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.55; padding: 32px; font-size: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 22px; font-weight: 700;">FINVERNO PRIVATE LIMITED</div>
          <div style="font-size: 20px; font-weight: 700; margin-top: 8px;">FINANCING / WORKING CAPITAL ADDENDUM</div>
          <div style="margin-top: 8px; color: #555;">Template version ${CONTRACTOR_FINANCING_TEMPLATE_VERSION}</div>
        </div>

        <p>This Financing / Working Capital Addendum (“Addendum”) is entered into on ${payload.agreementDateLabel} between <strong>${payload.companyName}</strong> and <strong>${payload.contractorName}</strong> and supplements the Master SME Platform Agreement.</p>

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

        <h2 style="font-size: 16px;">1. Financing Assistance Structure</h2>
        <p>Finverno may, at its discretion and subject to approved limits, facilitate short-duration working capital support for procurement and related project-linked obligations raised through the Finverno platform.</p>

        <h2 style="font-size: 16px;">2. Approved Commercial Terms</h2>
        <ul style="margin-top: 0;">
          <li>Approved financing limit: ${payload.financingLimitLabel || 'As approved by Finverno from time to time'}</li>
          <li>Platform fee rate: ${payload.platformFeeRateLabel || 'As communicated by Finverno'}</li>
          <li>Platform fee cap: ${payload.platformFeeCapLabel || 'As approved by Finverno'}</li>
          <li>Participation / financing fee (daily): ${payload.participationFeeRateDailyLabel || 'As approved by Finverno'}</li>
          <li>Repayment basis: ${payload.repaymentBasisLabel || 'As approved by Finverno'}</li>
          <li>Payment window (days): ${payload.paymentWindowDays ?? 'As approved by Finverno'}</li>
        </ul>

        <h2 style="font-size: 16px;">3. Repayment and Collections</h2>
        <p>The SME shall ensure that underlying client collections relating to financed transactions are routed through the designated escrow or controlled collection account. Repayment of funded amounts, together with applicable charges, fees, and other dues, shall become due immediately upon receipt of such client payment into the escrow or controlled collection mechanism approved by Finverno.</p>

        <h2 style="font-size: 16px;">4. Fees, Charges, and Set-Off</h2>
        <p>The SME acknowledges that financed transactions may attract platform fees, daily participation or financing charges, and other approved commercial charges. Finverno may apply set-off, withholding, or adjustment against sums otherwise payable or recoverable through the platform to the extent permitted by law and contract.</p>

        <h2 style="font-size: 16px;">5. Reporting, Cooperation, and Information Rights</h2>
        <p>The SME shall provide true and timely information relating to purchase requests, invoices, collections, client certification, dispatch, delivery, disputes, and any event that may affect repayment or risk assessment.</p>

        <h2 style="font-size: 16px;">6. Events of Default</h2>
        <p>Events of default may include non-payment, delayed remittance after receipt of client payment into escrow, diversion of collections, material misstatement, diversion of funded proceeds, non-cooperation, insolvency indicators, or other conduct reasonably prejudicial to recovery or platform integrity.</p>

        <h2 style="font-size: 16px;">7. Suspension of Financing</h2>
        <p>Finverno may suspend or revoke financing access without terminating the broader platform relationship if underwriting risk changes, repayment performance deteriorates, documents become stale, or events of default occur.</p>

        <h2 style="font-size: 16px;">8. Late Payment / Default Terms</h2>
        <p>${payload.lateDefaultTerms || 'Late payment, default, recovery, and escalation mechanics shall apply in accordance with Finverno’s approved commercial terms and any case-specific communications.'}</p>

        <h2 style="font-size: 16px;">9. Governing Law and Electronic Records</h2>
        <p>This Addendum shall be governed by the laws of India and subject to the courts at ${payload.jurisdiction}. The Parties agree that portal records, transaction logs, approvals, and digitally stored documents may be relied on as evidence of transactions and obligations.</p>
        <p>This Addendum may be signed electronically through the Finverno contractor portal. Electronic signatures and execution records shall have the same legal validity and enforceability as physical signatures, to the extent permitted under applicable law, including the Information Technology Act, 2000.</p>

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
