import type { AgreementTemplatePayload } from '@/lib/agreements/types';

export const INVESTOR_PARTICIPATION_TEMPLATE_KEY = 'investor-participation-poc';
export const INVESTOR_PARTICIPATION_TEMPLATE_VERSION = 'v4';

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
          <strong>${payload.investorName}</strong>, whose details are recorded on the Finverno investor portal
          ${payload.investorAddress ? ` and whose address is ${payload.investorAddress}` : ''}<br />
          (Hereinafter referred to as the “Investor”)
        </p>

        <p>
          Finverno and the Investor are individually referred to as a “Party” and collectively as the “Parties.”
        </p>

        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;" />

        <h2 style="font-size: 16px;">1. Background and Purpose</h2>
        <p>
          Finverno is conducting a limited proof-of-concept pooled capital program for short-duration working capital
          finance provided to SME contractors and related supplier payment cycles.
        </p>
        <p>
          This Agreement records the terms on which the Investor makes capital available to Finverno for deployment
          within such pooled capital strategy and the basis on which distributions, fees, reporting, and execution are
          to be handled between the Parties.
        </p>

        <h2 style="font-size: 16px;">2. Nature of Participation and Legal Character</h2>
        <p>
          The capital committed under this Agreement shall constitute a private contractual funding arrangement and
          shall be treated as a loan from the Investor to ${payload.companyName}, subject to the commercial allocation
          mechanics set out herein.
        </p>
        <p>
          The Investor acknowledges that their economic participation is in the Finverno pooled capital strategy as a
          whole and not in any identified purchase request, contractor, supplier, invoice, or project.
        </p>
        <p>
          Finverno shall have sole discretion, acting in good faith and in accordance with its internal underwriting
          and deployment processes, to allocate pool capital across eligible transactions. This Agreement is not an
          issuance of units of a SEBI-registered Alternative Investment Fund unless expressly stated otherwise in a
          separate regulated offering document.
        </p>

        <h2 style="font-size: 16px;">3. Commitment and Funding</h2>
        <p>
          The Investor agrees to contribute the amount specified during execution on the investor portal. For the
          current agreement, the committed amount is <strong>${payload.commitmentAmountLabel}</strong>.
        </p>
        <p>
          Funding shall be remitted by bank transfer to the designated Finverno account. Finverno may treat the
          commitment as available for deployment only upon actual receipt of cleared funds.
        </p>

        <h2 style="font-size: 16px;">4. Pool Strategy, Deployment Basis, and Duration</h2>
        <p>
          Finverno intends to deploy capital towards short-duration financing of materials and related working capital
          obligations linked to approved contractor BOQs, supplier invoices, and associated commercial cycles.
        </p>
        <p>
          Deployments are expected to run in cycles of approximately 30 to 90 days, but actual deployment periods may
          be shorter or longer depending on project execution, invoice acceptance, collection timelines, and other
          operational factors.
        </p>

        <h2 style="font-size: 16px;">5. Key Commercial Terms</h2>
        <div style="padding: 14px 16px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
          <p style="margin: 0 0 8px;"><strong>Structure:</strong> pooled working-capital participation administered by Finverno</p>
          <p style="margin: 0 0 8px;"><strong>Preferred return / hurdle:</strong> 12% per annum, accrued on a daily pro-rated basis</p>
          <p style="margin: 0 0 8px;"><strong>Management fee:</strong> 2% per annum, accrued only on capital actually deployed in active transactions</p>
          <p style="margin: 0 0 8px;"><strong>Carry / performance fee:</strong> 20% of realized profits above the preferred return hurdle</p>
          <p style="margin: 0 0 8px;"><strong>NAV treatment:</strong> accrued management fee reduces net NAV as it accrues; carry is recognized only upon realization</p>
          <p style="margin: 0;"><strong>Investor exposure:</strong> economic exposure is to the pool as a whole, with look-through exposure reporting provided for transparency only</p>
        </div>

        <h2 style="font-size: 16px;">6. NAV, Unitization, and Valuation Transparency</h2>
        <p>
          Finverno may maintain internal notional pool units and Net Asset Value (“NAV”) calculations for purposes of
          investor transparency, fair entry pricing, and internal accounting consistency.
        </p>
        <p>
          Pool NAV may reflect, among other things, pool cash, outstanding deployed principal, accrued income,
          realized collections, accrued management fee, and realized carry. Look-through exposure reports may be shown
          to the Investor for informational purposes only and shall not be construed as conferring direct legal
          ownership in any underlying transaction.
        </p>

        <h2 style="font-size: 16px;">7. Fee Waterfall and Distribution Mechanics</h2>
        <p><strong>7.1 Preferred Return / Hurdle</strong></p>
        <p>
          The Investor shall be entitled to a preferred return at the rate of 12% per annum, calculated on a daily
          pro-rated basis for the period that relevant pool capital remains deployed.
        </p>
        <p><strong>7.2 Management Fee</strong></p>
        <p>
          Finverno shall accrue a management fee at the rate of 2% per annum on deployed capital only. For avoidance
          of doubt, no such management fee shall be charged on idle, uncalled, or undeployed pool cash.
        </p>
        <p>
          Such management fee may be reflected as an accrued deduction in net NAV reporting even if not immediately
          distributed in cash to Finverno.
        </p>
        <p><strong>7.3 Carry / Performance Fee</strong></p>
        <p>
          Once the preferred return hurdle has been satisfied, realized profits of the pool in excess of such hurdle
          may be allocated 80% to Investors and 20% to Finverno as carry or performance compensation.
        </p>
        <p>
          For clarity, unrealized gains, accrued but uncollected income, or projected returns may be disclosed in pool
          reporting; however, carry shall be charged only upon realization in cash.
        </p>
        <p><strong>7.4 Indicative Return Range</strong></p>
        <p>
          Based on current assumptions, Finverno expects an indicative net annualized investor return range of
          approximately 14% to 18%. Such figures are illustrative only and do not constitute a guarantee.
        </p>

        <h2 style="font-size: 16px;">8. Illustrative Examples for Transparency</h2>
        <p><strong>8.1 Later entry at higher NAV</strong></p>
        <p>
          If an Investor joins the pool after value has already accrued, that Investor may be admitted at a higher NAV
          and may therefore receive fewer notional pool units than an earlier Investor who entered at a lower NAV. This
          is intended to ensure equitable treatment between earlier and later participants.
        </p>
        <p><strong>8.2 Preferred return and carry</strong></p>
        <p>
          If realized pool profit is equal to the 12% annualized preferred return, such realized profit is first
          allocated to Investors. Only profit realized above that hurdle becomes eligible for the 80/20 split described
          in Section 7.3.
        </p>
        <p><strong>8.3 2% management fee on deployed capital only</strong></p>
        <p>
          If a portion of pool cash remains temporarily undeployed, that amount does not attract the 2% annual
          management fee. The fee accrues solely on capital actively deployed in live financing transactions.
        </p>

        <h2 style="font-size: 16px;">9. Repayment, Withdrawal, and Re-Deployment</h2>
        <p>
          Finverno shall, subject to pool liquidity, realization of underlying collections, and the waterfall set out
          in Section 7, return principal and applicable distributions to the Investor in accordance with the pool
          economics described herein.
        </p>
        <p>
          Any request for withdrawal, redemption, rollover, or re-deployment shall be processed in accordance with the
          operational position and liquidity of the pool at the relevant time. Finverno does not guarantee immediate
          liquidity on demand.
        </p>

        <h2 style="font-size: 16px;">10. Reporting and Disclosure</h2>
        <p>
          Finverno will provide periodic investor reporting, which may include NAV, notional unit allocation, deployed
          capital, pool cash, realized collections, fee accruals, and return calculations.
        </p>
        <p>
          Operational details regarding counterparties, contractors, suppliers, and projects may be aggregated,
          summarized, anonymized, or partially withheld where reasonably required for confidentiality, commercial
          sensitivity, or data minimization purposes.
        </p>

        <h2 style="font-size: 16px;">11. Platform Revenues and Separate Finverno Economics</h2>
        <p>
          Finverno may earn management compensation, carry, and contractor-side platform, enablement, or service fees.
          Except where expressly included in the investor waterfall, such contractor-side revenues belong solely to
          Finverno and are separate from the Investor’s distribution rights under this Agreement.
        </p>

        <h2 style="font-size: 16px;">12. Investor Representations and Acknowledgements</h2>
        <p>The Investor represents and acknowledges that:</p>
        <ul style="margin-top: 0;">
          <li>the Investor is investing from lawful funds beneficially owned or controlled by the Investor</li>
          <li>the Investor understands that this is a private, illiquid, pooled capital participation arrangement</li>
          <li>the Investor has reviewed the commercial terms, including the 2% management fee, 12% preferred return, and 20% carry framework</li>
          <li>the Investor understands that look-through exposure reporting is informational only and does not create direct rights against any contractor, supplier, or project counterparty</li>
        </ul>

        <h2 style="font-size: 16px;">13. Risk Factors</h2>
        <p>The Investor acknowledges that the pool is subject to, among other things:</p>
        <ul style="margin-top: 0;">
          <li>contractor, project, execution, and collection risk</li>
          <li>timing mismatch between deployment and repayment</li>
          <li>concentration risk notwithstanding pool diversification</li>
          <li>operational, legal, documentation, and counterparty risk</li>
          <li>the possibility of delayed, reduced, or nil returns in stressed scenarios</li>
        </ul>
        <p>
          Finverno shall exercise reasonable diligence in deployment and monitoring; however, no assured, fixed, or
          guaranteed return is being promised under this Agreement.
        </p>

        <h2 style="font-size: 16px;">14. Taxes, Transfer Restrictions, and Relationship of Parties</h2>
        <p>
          Returns distributed to Investors may be treated as interest income or such other category as may be required
          under applicable law. Finverno may deduct tax at source where legally required. The Investor remains
          responsible for their own tax filings and disclosures.
        </p>
        <p>
          This participation is private and non-transferable without Finverno’s prior written consent. Nothing in this
          Agreement shall be deemed to create a partnership, fiduciary partnership, agency, or co-ownership relation
          between the Parties in respect of any underlying financed asset.
        </p>

        <h2 style="font-size: 16px;">15. Governing Law and Dispute Resolution</h2>
        <p>This Agreement shall be governed by the laws of India.</p>
        <p>Any disputes shall fall under the jurisdiction of courts located in ${payload.jurisdiction}.</p>

        <h2 style="font-size: 16px;">16. Electronic Execution and Acceptance</h2>
        <p>
          This Agreement is executed electronically through the Finverno investor portal. Electronic signatures shall
          have the same legal validity as physical signatures under the Information Technology Act, 2000.
        </p>
        <p>By electronically signing this Agreement, the Investor confirms that they:</p>
        <ul style="margin-top: 0;">
          <li>have read and understood the terms of this Agreement in full</li>
          <li>accept the pooled capital model and fee mechanics described herein</li>
          <li>consent to electronic records, communications, and execution</li>
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
