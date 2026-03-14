import type { AgreementTemplatePayload } from '@/lib/agreements/types';

export const INVESTOR_PARTICIPATION_TEMPLATE_KEY = 'investor-participation-poc';
export const INVESTOR_PARTICIPATION_TEMPLATE_VERSION = 'v1';

export function renderInvestorParticipationHTML(payload: AgreementTemplatePayload): string {
  return `
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Investor Participation Agreement</title>
      </head>
      <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5; padding: 32px;">
        <h1 style="font-size: 24px; margin-bottom: 4px;">Investor Participation Agreement</h1>
        <p style="margin-top: 0;">Version ${INVESTOR_PARTICIPATION_TEMPLATE_VERSION}</p>
        <p>This Agreement is made on <strong>${payload.agreementDateLabel}</strong>.</p>

        <p><strong>Between</strong></p>
        <p>
          <strong>${payload.companyName}</strong><br />
          ${payload.companyAddress}<br />
          ${payload.companyCIN ? `CIN: ${payload.companyCIN}<br />` : ''}
          ${payload.companyPAN ? `PAN: ${payload.companyPAN}<br />` : ''}
        </p>

        <p><strong>And</strong></p>
        <p>
          <strong>${payload.investorName}</strong><br />
          Email: ${payload.investorEmail}<br />
          Type: ${payload.investorType}<br />
          ${payload.investorPhone ? `Phone: ${payload.investorPhone}<br />` : ''}
        </p>

        <h2 style="font-size: 18px;">1. Contribution</h2>
        <p>
          The Investor agrees to contribute <strong>${payload.commitmentAmountLabel}</strong> to
          ${payload.companyName} as part of its private proof-of-concept capital pool.
        </p>

        <h2 style="font-size: 18px;">2. Use of Funds</h2>
        <p>
          Finverno will deploy the contributed capital into short-duration working capital and
          material financing cycles for SME contractors in accordance with internal underwriting
          and deployment policies.
        </p>

        <h2 style="font-size: 18px;">3. Nature of Participation</h2>
        <p>
          This is a private participation arrangement and does not constitute a public offering,
          solicitation, or invitation to the public. The Investor acknowledges participation in
          Finverno's private pool on a confidential basis.
        </p>

        <h2 style="font-size: 18px;">4. Returns and Risk</h2>
        <p>
          Returns, if any, will depend on realized collections and deployment performance.
          Capital deployment involves risk, including delays, counterparty default, and partial or
          total loss of expected returns.
        </p>

        <h2 style="font-size: 18px;">5. Governance</h2>
        <p>
          The Investor acknowledges that investment selection, deployment, monitoring, and recovery
          decisions remain with ${payload.companyName}.
        </p>

        <h2 style="font-size: 18px;">6. Governing Law</h2>
        <p>This Agreement shall be governed by the laws of India and subject to the jurisdiction of ${payload.jurisdiction}.</p>

        ${payload.note ? `<h2 style="font-size: 18px;">7. Notes</h2><p>${payload.note}</p>` : ''}

        <div style="margin-top: 48px; display: flex; justify-content: space-between; gap: 24px;">
          <div style="width: 48%;">
            <p><strong>For ${payload.companyName}</strong></p>
            <p style="margin-top: 48px;">__________________________</p>
            <p>${payload.companySignatoryName}</p>
            <p>${payload.companySignatoryTitle}</p>
          </div>
          <div style="width: 48%;">
            <p><strong>Investor</strong></p>
            <p style="margin-top: 48px;">__________________________</p>
            <p>${payload.investorName}</p>
            <p>${payload.investorEmail}</p>
          </div>
        </div>
      </body>
    </html>
  `.trim();
}
