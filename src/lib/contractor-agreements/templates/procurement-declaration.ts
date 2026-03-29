import type { ContractorAgreementTemplatePayload } from '@/lib/contractor-agreements/types';

export const CONTRACTOR_PROCUREMENT_DECLARATION_TEMPLATE_KEY = 'contractor-procurement-declaration';
export const CONTRACTOR_PROCUREMENT_DECLARATION_TEMPLATE_VERSION = 'v2';

export function renderContractorProcurementDeclarationHTML(payload: ContractorAgreementTemplatePayload): string {
  return `
    <html>
      <head><meta charSet="utf-8" /><title>Procurement / Booking Declaration</title></head>
      <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.55; padding: 32px; font-size: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 22px; font-weight: 700;">FINVERNO PRIVATE LIMITED</div>
          <div style="font-size: 20px; font-weight: 700; margin-top: 8px;">PROCUREMENT / BOOKING DECLARATION</div>
          <div style="margin-top: 8px; color: #555;">Template version ${CONTRACTOR_PROCUREMENT_DECLARATION_TEMPLATE_VERSION}</div>
        </div>

        <p>This Procurement / Booking Declaration (“Declaration”) is given on ${payload.agreementDateLabel} by <strong>${payload.contractorName}</strong> in favour of <strong>${payload.companyName}</strong> in connection with bookings, procurement assistance, and related supply arrangements facilitated through or alongside the Finverno platform.</p>

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

        <h2 style="font-size: 16px;">1. Rate, Freight, and Statutory Charges</h2>
        <p>The SME confirms that the booking rate includes the basic rate, GST, railway freight, and applicable statutory charges, to the extent communicated at the time of booking. The SME further agrees to bear and pay any increase, revision, adjustment, or additional levy arising thereafter, including changes communicated by the intermediary, producer, manufacturer, supplier, or applicable authority.</p>

        <h2 style="font-size: 16px;">2. Interchangeability and Dispatch Availability</h2>
        <p>The SME accepts interchangeability of sizes, grades, and related specifications to the extent reasonably aligned with the booked material(s) and subject to actual availability and dispatch by the producer, manufacturer, supplier, stockyard, or intermediary.</p>

        <h2 style="font-size: 16px;">3. Non-Lifting, Forfeiture, and Adjustment</h2>
        <p>If the SME fails to lift, collect, or otherwise take delivery of the booked material(s) within the applicable timeline, the SME acknowledges that any advance deposited may be liable to forfeiture and any credits or balances standing to the SME’s account may be adjusted towards penalties, damages, or charges imposed on a back-to-back basis.</p>

        <h2 style="font-size: 16px;">4. Credit / Debit Notes</h2>
        <p>The SME agrees to accept all credit notes and debit notes passed on by the relevant intermediary, including NSIC where applicable, strictly on a back-to-back basis and subject to the intermediary first receiving the same from the producer, manufacturer, or supplier. The SME shall not claim any such amount unless and until it is actually received upstream on the same basis.</p>

        <h2 style="font-size: 16px;">5. Dispatch Delay, Shortage, and Transit Risk</h2>
        <p>The SME undertakes that shortage in dispatch, delay in dispatch, delay in delivery, transit loss, and related transit risk shall be borne by the SME to the extent such matters arise after dispatch or are attributable to transport, logistics, or third-party handling. The SME shall procure appropriate transit insurance at its own cost and acknowledges that Finverno and the relevant intermediary shall not be responsible for transit loss or delay beyond their reasonable control.</p>

        <h2 style="font-size: 16px;">6. Quantity, Quality, Pricing, and Supplier Terms</h2>
        <p>The SME undertakes that the quantity and quality supplied by the producer, manufacturer, or supplier, and the prices prevailing at the time of dispatch, including applicable taxes and any subsequent debit or credit note, shall be acceptable to it on the same back-to-back basis on which they are made available through the applicable supply channel.</p>

        <h2 style="font-size: 16px;">7. Payment Before Delivery</h2>
        <p>The SME undertakes that payment in full shall be made in advance, against available credit, and/or within any approved RMA or financing limit, as applicable, before lifting or taking delivery of the material(s), unless otherwise expressly approved in writing.</p>

        <h2 style="font-size: 16px;">8. Movement, Freight, Insurance, and Incidentals</h2>
        <p>The SME shall arrange, at its own risk and cost, for movement of the material(s) from the relevant head office, stockyard, supplier, manufacturer, or dispatch point, including loading, unloading, freight, local transport, insurance, and all incidental charges, levies, or governmental dues.</p>

        <h2 style="font-size: 16px;">9. Intended Use of Materials</h2>
        <p>The SME certifies that material(s) procured through this declaration shall be utilized for its declared works and/or manufacturing purposes. If such material(s) are diverted for trading or used contrary to the declared purpose, the SME acknowledges that Finverno and/or the relevant intermediary may take such action as may be available under law, contract, or policy.</p>

        <h2 style="font-size: 16px;">10. General</h2>
        <p>This Declaration shall be read together with the SME’s platform terms, financing documents (if any), procurement records, and booking communications. Portal records, emails, booking confirmations, and digital copies may be relied upon as evidence. This Declaration shall be governed by the laws of India and subject to the courts at ${payload.jurisdiction}.</p>
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
