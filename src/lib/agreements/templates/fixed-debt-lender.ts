import type { AgreementTemplatePayload } from '@/lib/agreements/types';

export const FIXED_DEBT_LENDER_TEMPLATE_KEY = 'fixed-debt-lender-v1';
export const FIXED_DEBT_LENDER_TEMPLATE_VERSION = 'v4';

export function renderFixedDebtLenderHTML(payload: AgreementTemplatePayload): string {
  const annualRate = payload.fixedCouponRateAnnual ?? 0.14;
  const annualRateLabel = `${(annualRate * 100).toFixed(2)}% per annum`;

  return `
    <html>
      <head>
        <meta charSet="utf-8" />
        <title>Fixed Return Lender Agreement</title>
      </head>
      <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.55; padding: 32px; font-size: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 22px; font-weight: 700; margin-bottom: 10px;">FINVERNO PRIVATE LIMITED</div>
          <div style="font-size: 20px; font-weight: 700;">FIXED INCOME LENDING AGREEMENT</div>
          <div style="margin-top: 8px; color: #555;">Template version ${FIXED_DEBT_LENDER_TEMPLATE_VERSION}</div>
        </div>

        <p>
          This Fixed Income Lending Agreement is entered into on the date of electronic execution between:
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
          <strong>${payload.investorName}</strong>, whose details are recorded on the Finverno lending portal
          ${payload.investorAddress ? ` and whose address is ${payload.investorAddress}` : ''}<br />
          (Hereinafter referred to as the “Lender”)
        </p>
        <p>
          Finverno and the Lender are individually referred to as a “Party” and collectively as the “Parties.”
        </p>

        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #ddd;" />

        <h2 style="font-size: 16px;">1. Background and Purpose</h2>
        <p>
          Finverno offers a fixed income lending product for investors who want a fixed return structure with flexible
          timing rather than a pool or NAV-based participation model.
        </p>
        <p>
          Under this Agreement, the Lender makes capital available to Finverno for deployment into short-duration
          receivable-backed transactions. This document records the key commercial terms, expected liquidity pattern,
          reporting approach, and legal basis of that lending arrangement.
        </p>

        <h2 style="font-size: 16px;">2. Nature of Participation and Legal Character</h2>
        <p>
          The capital committed under this Agreement shall constitute a private contractual lending arrangement and
          shall be treated as a loan from the Lender to ${payload.companyName}.
        </p>
        <p>
          This is not a fund, NAV product, unitized vehicle, bank deposit, or on-demand withdrawal product.
        </p>
        <p>
          The Lender does not receive direct ownership rights in any specific invoice, contractor, supplier, or
          transaction unless separately documented in writing.
        </p>

        <h2 style="font-size: 16px;">3. Commitment and Funding</h2>
        <p>
          The Lender agrees to contribute the amount recorded during execution on the Finverno platform. For this
          Agreement, the committed amount is <strong>${payload.commitmentAmountLabel}</strong>.
        </p>
        <p>
          Funding shall be remitted by bank transfer to the designated Finverno account. Finverno may treat the
          commitment as available for deployment only upon actual receipt of cleared funds.
        </p>

        <h2 style="font-size: 16px;">4. Investment Snapshot</h2>
        <div style="padding: 14px 16px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
          <p style="margin: 0 0 8px;"><strong>Product:</strong> Fixed income lending arrangement with Finverno</p>
          <p style="margin: 0 0 8px;"><strong>Legal nature:</strong> Loan by the Lender to Finverno</p>
          <p style="margin: 0 0 8px;"><strong>Amount:</strong> ${payload.commitmentAmountLabel}</p>
          <p style="margin: 0 0 8px;"><strong>Return:</strong> ${annualRateLabel}</p>
          <p style="margin: 0 0 8px;"><strong>Accrual:</strong> Daily on deployed capital</p>
          <p style="margin: 0 0 8px;"><strong>Use of funds:</strong> Short-duration receivable-backed transactions</p>
          <p style="margin: 0 0 8px;"><strong>Expected capital cycle:</strong> Typically 90 to 120 days, based on experience</p>
          <p style="margin: 0 0 8px;"><strong>Liquidity:</strong> Withdrawal requests may be made at any time, subject to available liquidity and collections</p>
          <p style="margin: 0 0 8px;"><strong>Repayment style:</strong> Partial or full payouts may happen as liquidity becomes available</p>
          <p style="margin: 0 0 6px;"><strong>No fixed maturity date</strong></p>
          <p style="margin: 0 0 6px;"><strong>No guaranteed repayment timeline</strong></p>
          <p style="margin: 0;"><strong>No assured liquidity on demand</strong></p>
        </div>

        <h2 style="font-size: 16px;">5. How the Product Works</h2>
        <p>
          Once funds are received, Finverno deploys capital into short-duration receivable-backed transactions.
        </p>
        <p>
          Return accrues daily on capital that is actually deployed. As collections come in from those transactions,
          liquidity is created within the system and used to process repayments, payouts, and withdrawal requests as
          feasible.
        </p>

        <h2 style="font-size: 16px;">6. Investment Terms</h2>
        <p>
          The return under this arrangement is ${annualRateLabel}. This return accrues daily on capital that is
          deployed by Finverno.
        </p>
        <p>
          Capital that has not yet been deployed may not accrue the same return until deployment begins.
        </p>
        <p>
          This is a fixed income product, but it does not have a fixed maturity date. Timing of payout depends on how
          collections come in from the underlying deployed transactions.
        </p>

        <h2 style="font-size: 16px;">7. Duration and Liquidity</h2>
        <p>
          Based on practical experience, capital in this product typically rotates in about 90 to 120 days.
        </p>
        <p>
          In most cases, investors can expect to be in a position to request withdrawal within this period.
        </p>
        <p>
          However, this is an expected operating pattern, not a guaranteed timeline. Some capital may remain deployed
          into another cycle, which may extend for around an additional 90 days depending on collections, transaction
          timing, and operating conditions.
        </p>
        <p>
          Because capital is deployed across multiple transactions, cash can come back at different times from
          different deployments. This creates ongoing liquidity in the system and can allow staggered payouts instead
          of waiting for one single transaction to close.
        </p>

        <h2 style="font-size: 16px;">8. Repayment and Payouts</h2>
        <p>
          Repayments are made from ongoing collections and liquidity generated across deployed transactions.
        </p>
        <p>
          Payouts may therefore be partial, full, or staggered over time as liquidity becomes available.
        </p>
        <p>
          There is no fixed repayment date under this product.
        </p>

        <h2 style="font-size: 16px;">9. Early Withdrawal</h2>
        <p>
          The Lender may request withdrawal at any time.
        </p>
        <p>
          Finverno will review the request and try to process it based on available liquidity, current collections,
          ongoing deployment commitments, and overall operating position.
        </p>
        <p>
          Early withdrawal is therefore flexible, but not instant and not guaranteed on demand.
        </p>

        <h2 style="font-size: 16px;">10. Reporting and Transparency</h2>
        <p>
          Finverno will provide periodic reporting on the fixed income position.
        </p>
        <p>
          This may include committed amount, deployed amount, accrued return, payouts made, outstanding balance, and
          repayment or liquidity status.
        </p>

        <h2 style="font-size: 16px;">11. Lender Representations and Acknowledgements</h2>
        <ul style="margin-top: 0;">
          <li>the Lender is investing from lawful funds beneficially owned or controlled by the Lender</li>
          <li>the Lender understands this is a private fixed income lending arrangement</li>
          <li>the Lender understands repayment timing depends on collections and liquidity</li>
          <li>the Lender has read and understood the product terms in this Agreement</li>
        </ul>

        <h2 style="font-size: 16px;">12. Risk Factors</h2>
        <p>
          This is intended to be a transparent fixed income lending product, but it still carries risk.
        </p>
        <ul style="margin-top: 0;">
          <li>delays in collections from underlying transactions</li>
          <li>longer-than-expected capital cycles</li>
          <li>counterparty and execution risk</li>
          <li>timing mismatch between inflows and payout requests</li>
          <li>the possibility that withdrawals or repayments may take longer than expected</li>
        </ul>
        <p>
          Finverno aims to manage these risks prudently, but cannot promise immediate liquidity or a fixed payout date.
        </p>

        <h2 style="font-size: 16px;">13. Taxes, Transfer Restrictions, and Relationship of Parties</h2>
        <p>
          This Agreement is a private contractual lending arrangement between the Lender and Finverno.
        </p>
        <p>
          Returns may be treated as interest income or such other category as required under applicable law. Finverno
          may deduct tax at source where legally required. The Lender remains responsible for their own tax filings and
          disclosures.
        </p>
        <p>
          This participation is private and non-transferable without Finverno’s prior written consent. Nothing in this
          Agreement creates a partnership, agency, fiduciary relationship, or co-ownership in any underlying
          receivable-backed transaction.
        </p>

        <h2 style="font-size: 16px;">14. Governing Law and Electronic Execution</h2>
        <p>
          This Agreement is governed by Indian law and subject to the courts at ${payload.jurisdiction}.
        </p>
        <p>
          This Agreement may be signed electronically through the Finverno platform. Electronic records and signatures
          will have the same legal effect as physical execution, subject to applicable law.
        </p>

        <h2 style="font-size: 16px;">15. Acceptance</h2>
        <div style="padding: 14px; border: 1px solid #ddd; border-radius: 8px;">
          <div style="font-weight: 700; margin-bottom: 8px;">Pre-Signing Confirmations</div>
          <div>☐ I confirm I am lending from my own funds.</div>
          <div>☐ I understand this is a private fixed income lending arrangement.</div>
          <div>☐ I understand that repayment and withdrawals depend on liquidity and collections.</div>
        </div>

        ${payload.note ? `<h2 style="font-size: 16px;">Notes</h2><p>${payload.note}</p>` : ''}

        <div style="margin-top: 42px;">
          <p><strong>For Finverno Private Limited</strong></p>
          <p style="margin-top: 48px;">__________________________</p>
          <p>${payload.companySignatoryName}</p>
          <p>${payload.companySignatoryTitle}</p>
        </div>

        <div style="margin-top: 42px;">
          <p><strong>Lender</strong></p>
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
              : `<p style="margin-top: 28px;">Electronic Signature via Finverno Lending Portal</p>`
          }
        </div>
      </body>
    </html>
  `.trim();
}
