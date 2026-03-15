import type { AgreementTemplatePayload } from '@/lib/agreements/types';

export const INVESTOR_PARTICIPATION_TEMPLATE_KEY = 'investor-participation-poc';
export const INVESTOR_PARTICIPATION_TEMPLATE_VERSION = 'v2';

export function renderInvestorParticipationHTML(payload: AgreementTemplatePayload): string {
  return `
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Investor Participation Agreement</title>
      </head>
      <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.55; padding: 32px; font-size: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 22px; font-weight: 700; margin-bottom: 10px;">FINVERNO PRIVATE LIMITED</div>
          <div style="font-size: 20px; font-weight: 700;">INVESTOR PARTICIPATION AGREEMENT</div>
          <div style="margin-top: 6px;">(Proof of Concept Capital Pool)</div>
          <div style="margin-top: 8px; color: #555;">Template version ${INVESTOR_PARTICIPATION_TEMPLATE_VERSION}</div>
        </div>

        <p>
          This Investor Participation Agreement (“Agreement”) is entered into on the date of electronic execution
          between:
        </p>

        <p>
          <strong>${payload.companyName}</strong><br />
          a company incorporated under the Companies Act, 2013
          ${payload.companyCIN ? ` having CIN ${payload.companyCIN}` : ''}, with its registered office at:<br /><br />
          ${payload.companyAddress}<br />
          (Hereinafter referred to as “Finverno” or “the Company”)
        </p>

        <p>
          <strong>AND</strong><br /><br />
          The Investor, whose details are provided at the time of execution on the Finverno investor portal
          (Hereinafter referred to as “Investor”)
        </p>

        <p>
          Finverno and the Investor are individually referred to as a “Party” and collectively as the “Parties.”
        </p>

        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;" />

        <h2 style="font-size: 16px;">1. Purpose</h2>
        <p>
          Finverno is conducting a limited Proof of Concept (POC) capital pool to validate a working capital financing
          model for SME contractors.
        </p>
        <p>
          The purpose of this Agreement is to document the terms under which the Investor provides capital to Finverno
          for deployment within this POC structure.
        </p>

        <h2 style="font-size: 16px;">2. Nature of Investment</h2>
        <p>
          The capital provided under this Agreement shall be treated as a loan from the Investor to
          ${payload.companyName}.
        </p>
        <p>
          Finverno shall deploy the capital towards short-duration financing of material purchases linked to approved
          contractor BOQs and supplier invoices.
        </p>
        <p>The Investor acknowledges that Finverno retains full discretion regarding deployment decisions.</p>

        <h2 style="font-size: 16px;">3. Investment Amount</h2>
        <p>
          The Investor agrees to contribute the amount specified during execution on the investor portal.
        </p>
        <p>
          For the current POC, the commitment for this agreement is <strong>${payload.commitmentAmountLabel}</strong>.
        </p>
        <p>The capital shall be transferred via bank transfer to the designated Finverno account.</p>

        <h2 style="font-size: 16px;">4. Deployment Duration</h2>
        <p>
          Capital deployments typically occur in cycles of approximately 30 to 90 days. However, the exact duration
          may vary depending on the underlying project cycle.
        </p>

        <h2 style="font-size: 16px;">5. Return Framework</h2>
        <p><strong>Hurdle Return</strong></p>
        <p>
          The Investor shall be entitled to a 12% annualised return, calculated on a pro-rated basis for the duration
          capital remains deployed.
        </p>
        <p><strong>Profit Sharing</strong></p>
        <p>After the hurdle return has been satisfied, additional profits generated from deployment may be distributed as follows:</p>
        <ul style="margin-top: 0;">
          <li>80% to the Investor</li>
          <li>20% retained by Finverno as performance compensation</li>
        </ul>
        <p><strong>Expected Returns</strong></p>
        <p>
          Based on the current deployment model, the expected net annualised return (XIRR) to investors is
          approximately 14% to 18%. These returns are indicative and not guaranteed.
        </p>

        <h2 style="font-size: 16px;">6. Management and Platform Fees</h2>
        <p>Finverno may earn revenue through management compensation and platform or enablement fees charged to contractors.</p>
        <p>Such revenues belong to Finverno and are separate from investor capital returns.</p>

        <h2 style="font-size: 16px;">7. Repayment</h2>
        <p>
          Upon completion of a deployment cycle, Finverno shall return the Investor’s principal capital and applicable
          returns calculated in accordance with Section 5.
        </p>
        <p>Investors may elect to withdraw capital or redeploy into subsequent cycles.</p>

        <h2 style="font-size: 16px;">8. Transparency and Reporting</h2>
        <p>Finverno will provide periodic updates to investors including deployment summaries, repayment confirmations, and return calculations.</p>
        <p>Operational details regarding contractors or suppliers may be summarised for confidentiality purposes.</p>

        <h2 style="font-size: 16px;">9. Risk Disclosure</h2>
        <p>The Investor acknowledges that:</p>
        <ul style="margin-top: 0;">
          <li>this POC involves financing operational business activities</li>
          <li>contractor payment timelines may vary</li>
          <li>returns are dependent on successful collection from financed transactions</li>
        </ul>
        <p>Finverno shall exercise reasonable diligence in deployment but does not guarantee investment returns.</p>

        <h2 style="font-size: 16px;">10. Taxation</h2>
        <p>
          All returns distributed to investors may be treated as interest income under applicable tax laws. Finverno may
          deduct Tax Deducted at Source (TDS) where required under Indian law.
        </p>
        <p>Investors are responsible for their own tax reporting obligations.</p>

        <h2 style="font-size: 16px;">11. Transfer Restrictions</h2>
        <p>This participation is private and non-transferable without written consent from Finverno.</p>

        <h2 style="font-size: 16px;">12. Governing Law</h2>
        <p>This Agreement shall be governed by the laws of India.</p>
        <p>Any disputes shall fall under the jurisdiction of courts located in ${payload.jurisdiction}.</p>

        <h2 style="font-size: 16px;">13. Electronic Execution</h2>
        <p>
          This Agreement is executed electronically through the Finverno investor portal. Electronic signatures shall
          have the same legal validity as physical signatures under the Information Technology Act, 2000.
        </p>

        <h2 style="font-size: 16px;">14. Acceptance</h2>
        <p>By electronically signing this Agreement, the Investor confirms that they:</p>
        <ul style="margin-top: 0;">
          <li>have read and understood the terms</li>
          <li>agree to participate under the stated structure</li>
          <li>acknowledge the associated risks</li>
        </ul>

        <div style="margin-top: 18px; padding: 14px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="font-weight: 700; margin-bottom: 8px;">Pre-Signing Confirmations</div>
          <div>☐ I confirm I am investing from my own funds.</div>
          <div>☐ I understand this is a private investment opportunity.</div>
          <div>☐ I have read the risk disclosure.</div>
        </div>

        ${payload.note ? `<h2 style="font-size: 16px;">Schedule / Notes</h2><p>${payload.note}</p>` : ''}

        <div style="margin-top: 42px;">
          <p><strong>For Finverno Private Limited</strong></p>
          <p style="margin-top: 48px;">__________________________</p>
          <p>${payload.companySignatoryName}</p>
          <p>${payload.companySignatoryTitle}</p>
        </div>

        <div style="margin-top: 42px;">
          <p><strong>Investor</strong></p>
          <p>Name: ${payload.investorName}</p>
          <p>Email: ${payload.investorEmail}</p>
          <p>Type: ${payload.investorType}</p>
          ${payload.investorPhone ? `<p>Phone: ${payload.investorPhone}</p>` : ''}
          <p>PAN: ${payload.investorPan || '__________________________'}</p>
          <p>Address: ${payload.investorAddress || '__________________________'}</p>
          ${
            payload.investorSignedName
              ? `<p style="margin-top: 18px;"><strong>Electronically signed by:</strong> ${payload.investorSignedName}</p>
                 <p><strong>Signed on:</strong> ${payload.investorSignedAtLabel || 'Recorded on platform'}</p>`
              : `<p style="margin-top: 28px;">Electronic Signature via Finverno Investor Portal</p>`
          }
        </div>
      </body>
    </html>
  `.trim();
}
