import {
  FUEL_PROVIDER_TEMPLATE_KEY,
  FUEL_PROVIDER_TEMPLATE_VERSION,
  type FuelProviderAgreementTemplatePayload,
} from '@/lib/fuel-provider-agreements/types';

const FINVERNO_COMPANY_NAME = 'Finverno Private Limited';
const FINVERNO_COMPANY_ADDRESS = '403, 3rd Floor, 22nd Cross Road, 2nd Sector, HSR Layout, Bengaluru - 560102, Karnataka';
const FINVERNO_JURISDICTION = 'Bengaluru, Karnataka';

export function buildFuelProviderAgreementPayload(input: {
  pump: {
    pump_name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    contact_person?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    oem_name?: string | null;
  };
  agreementDate: string;
  companySignatoryName: string;
  companySignatoryTitle: string;
  notes?: string | null;
  providerSignedName?: string | null;
  providerSignedAt?: string | null;
  companyCountersignedAt?: string | null;
}): FuelProviderAgreementTemplatePayload {
  const agreementDate = new Date(input.agreementDate);
  const agreementDateLabel = Number.isNaN(agreementDate.getTime())
    ? input.agreementDate
    : agreementDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
  const providerSignedAt = input.providerSignedAt ? new Date(input.providerSignedAt) : null;
  const companyCountersignedAt = input.companyCountersignedAt ? new Date(input.companyCountersignedAt) : null;

  return {
    agreementDateLabel,
    providerName: input.pump.pump_name,
    providerAddress: input.pump.address || null,
    providerCityState: [input.pump.city, input.pump.state].filter(Boolean).join(', ') || null,
    providerContactPerson: input.pump.contact_person || null,
    providerContactPhone: input.pump.contact_phone || null,
    providerContactEmail: input.pump.contact_email || null,
    oemName: input.pump.oem_name || null,
    companyName: FINVERNO_COMPANY_NAME,
    companyAddress: FINVERNO_COMPANY_ADDRESS,
    companySignatoryName: input.companySignatoryName,
    companySignatoryTitle: input.companySignatoryTitle,
    providerSignedName: input.providerSignedName || null,
    providerSignedAtLabel:
      providerSignedAt && !Number.isNaN(providerSignedAt.getTime())
        ? providerSignedAt.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : input.providerSignedAt || null,
    companyCountersignedAtLabel:
      companyCountersignedAt && !Number.isNaN(companyCountersignedAt.getTime())
        ? companyCountersignedAt.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : input.companyCountersignedAt || null,
    note: input.notes || null,
    jurisdiction: FINVERNO_JURISDICTION,
  };
}

function esc(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderFuelProviderAgreementHTML(payload: FuelProviderAgreementTemplatePayload) {
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5; padding: 32px;">
        <h1 style="text-align:center; margin-bottom: 4px;">FINVERNO PRIVATE LIMITED</h1>
        <h2 style="text-align:center; margin-top: 0;">FUEL PROVIDER SERVICE AGREEMENT</h2>
        <p style="text-align:center; color:#555;">Template Version: ${FUEL_PROVIDER_TEMPLATE_VERSION}</p>

        <p>This Fuel Provider Service Agreement is entered into on <strong>${esc(payload.agreementDateLabel)}</strong> between <strong>${esc(payload.companyName)}</strong> and <strong>${esc(payload.providerName)}</strong>.</p>

        <p><strong>Fuel Provider</strong><br/>
        ${esc(payload.providerName)}<br/>
        ${payload.oemName ? `${esc(payload.oemName)}<br/>` : ''}
        ${payload.providerAddress ? `${esc(payload.providerAddress)}<br/>` : ''}
        ${payload.providerCityState ? `${esc(payload.providerCityState)}<br/>` : ''}
        ${payload.providerContactPerson ? `Contact: ${esc(payload.providerContactPerson)}<br/>` : ''}
        ${payload.providerContactPhone ? `Phone: ${esc(payload.providerContactPhone)}<br/>` : ''}
        ${payload.providerContactEmail ? `Email: ${esc(payload.providerContactEmail)}<br/>` : ''}
        </p>

        <h3>1. Scope</h3>
        <p>The Fuel Provider will honour Finverno-issued fuel approvals for approved SME vehicles and record actual dispensed quantity and value through the Finverno workflow.</p>

        <h3>2. Fulfilment and Validation</h3>
        <p>The Fuel Provider shall only fulfil requests routed to its approved pump location, verify the vehicle and approval reference, and record actual litres and amount dispensed accurately.</p>

        <h3>3. Settlement</h3>
        <p>Finverno will track provider-side payables based on fulfilled transactions recorded in the platform. Settlement timing, batch reconciliation, and exceptions will be handled as per Finverno's operational process and any written commercial understanding between the parties.</p>

        <h3>4. Compliance and Conduct</h3>
        <p>The Fuel Provider shall not misuse approvals, duplicate fills, inflate quantities, or process non-approved transactions through the Finverno channel. Finverno may suspend the provider from the network if misuse, fraud, or disputes arise.</p>

        <h3>5. Records and Audit</h3>
        <p>Platform logs, approval records, fill confirmations, and settlement records will be treated as operative business records for reconciliation and audit.</p>

        <h3>6. General Terms</h3>
        <p>This agreement is governed by Indian law and subject to the courts at ${esc(payload.jurisdiction)}.</p>

        ${payload.note ? `<h3>Schedule / Notes</h3><p>${esc(payload.note)}</p>` : ''}

        <div style="margin-top: 40px;">
          <p><strong>For ${esc(payload.companyName)}</strong><br/>
          ${esc(payload.companySignatoryName)}<br/>
          ${esc(payload.companySignatoryTitle)}<br/>
          ${payload.companyCountersignedAtLabel ? `Countersigned on ${esc(payload.companyCountersignedAtLabel)}` : ''}</p>

          <p style="margin-top: 28px;"><strong>For ${esc(payload.providerName)}</strong><br/>
          ${esc(payload.providerSignedName || payload.providerContactPerson || payload.providerName)}<br/>
          ${payload.providerContactEmail ? `Email: ${esc(payload.providerContactEmail)}<br/>` : ''}
          ${payload.providerSignedAtLabel ? `Signed on ${esc(payload.providerSignedAtLabel)}` : ''}</p>
        </div>
      </body>
    </html>
  `.trim();

  return {
    templateKey: FUEL_PROVIDER_TEMPLATE_KEY,
    templateVersion: FUEL_PROVIDER_TEMPLATE_VERSION,
    html,
  };
}
