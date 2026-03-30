import { jsPDF } from 'jspdf';

type ProspectusInput = {
  investorName: string;
  investorEmail: string;
  investorType: string;
  investorPhone?: string | null;
  proposedAmount?: number | null;
  preferredModel?: 'pool_participation' | 'fixed_debt' | 'open_to_both' | null;
  indicativePoolAmount?: number | null;
  indicativeFixedDebtAmount?: number | null;
  liquidityPreference?: string | null;
  notes?: string | null;
  generatedAtLabel: string;
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export function generateInvestorProspectusPDF(input: ProspectusInput): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;
  const palette = {
    ink: [24, 28, 38] as const,
    muted: [92, 98, 112] as const,
    border: [223, 227, 235] as const,
    headerFill: [242, 246, 250] as const,
  };

  const sanitize = (value: string) =>
    value
      .replace(/₹/g, 'INR ')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/•/g, '-')
      .replace(/\u00a0/g, ' ');

  const addText = (text: string, options?: { bold?: boolean; size?: number; spacing?: number; font?: 'helvetica'; color?: readonly [number, number, number] }) => {
    doc.setFont(options?.font || 'helvetica', options?.bold ? 'bold' : 'normal');
    doc.setFontSize(options?.size ?? 11);
    doc.setTextColor(...(options?.color || palette.ink));
    const lines = doc.splitTextToSize(sanitize(text), contentWidth) as string[];
    doc.text(lines, margin, y);
    y += lines.length * ((options?.size ?? 11) * 0.42) + (options?.spacing ?? 3);
  };

  const addSection = (title: string, body: string | string[]) => {
    if (y > 262) {
      doc.addPage();
      y = 18;
    }
    if (y > 24) y += 1;
    doc.setDrawColor(...palette.border);
    doc.line(margin, y - 1, pageWidth - margin, y - 1);
    y += 3;
    doc.setTextColor(...palette.ink);
    addText(title, { bold: true, size: 12, spacing: 1, font: 'helvetica' });
    (Array.isArray(body) ? body : [body]).forEach((block) => addText(block, { size: 10, spacing: 3 }));
    y += 0.5;
  };

  const ensureSpace = (minimumHeight: number) => {
    if (y + minimumHeight > 278) {
      doc.addPage();
      y = 18;
    }
  };

  const addSnapshotList = (lines: string[]) => {
    lines.forEach((line) => {
      addText(line, {
        size: 10,
        spacing: 1.6,
        font: 'helvetica',
        color: palette.muted,
      });
    });
  };

  const addCompactComparisonTable = () => {
    const rows = [
      [
        'Return',
        'Variable return linked to pool performance and realized profits.',
        'Fixed return basis at 14% per annum on deployed capital.',
      ],
      [
        'Economics',
        '12% hurdle, 2% management fee on deployed capital only, 20% carry above hurdle.',
        'Daily accrual on deployed capital. No pool fee waterfall.',
      ],
      [
        'Liquidity',
        'Depends on pool collections, realizations, and overall pool position.',
        'Depends on collections and liquidity from deployed transactions.',
      ],
      [
        'Best fit',
        'Investors comfortable with variable returns and higher upside potential.',
        'Investors who want clearer income visibility and simpler economics.',
      ],
    ] as const;

    const labelWidth = 26;
    const valueWidth = (contentWidth - labelWidth) / 2;
    const headerHeight = 8;
    const tableX = margin;
    const labelX = tableX;
    const poolX = tableX + labelWidth;
    const fixedX = poolX + valueWidth;

    ensureSpace(18 + rows.length * 16);
    doc.setFillColor(...palette.headerFill);
    doc.setDrawColor(...palette.border);
    doc.setLineWidth(0.25);
    doc.rect(poolX, y, valueWidth, headerHeight, 'FD');
    doc.rect(fixedX, y, valueWidth, headerHeight, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...palette.ink);
    doc.text('Pool Participation', poolX + valueWidth / 2, y + 5.3, { align: 'center' });
    doc.text('Fixed Income', fixedX + valueWidth / 2, y + 5.3, { align: 'center' });
    y += headerHeight;

    rows.forEach(([label, pool, fixed]) => {
      const poolLines = doc.splitTextToSize(sanitize(pool), valueWidth - 4) as string[];
      const fixedLines = doc.splitTextToSize(sanitize(fixed), valueWidth - 4) as string[];
      const lineCount = Math.max(poolLines.length, fixedLines.length);
      const rowHeight = Math.max(9, lineCount * 3.7 + 4);
      ensureSpace(rowHeight + 1);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...palette.ink);
      doc.rect(labelX, y, labelWidth, rowHeight);
      doc.text(label, labelX + 2, y + 4.6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setDrawColor(...palette.border);
      doc.rect(poolX, y, valueWidth, rowHeight);
      doc.rect(fixedX, y, valueWidth, rowHeight);
      doc.text(poolLines, poolX + 2, y + 4.2);
      doc.text(fixedLines, fixedX + 2, y + 4.2);
      y += rowHeight;
    });

    y += 2;
  };

  const preferredModelLabel =
    input.preferredModel === 'pool_participation'
      ? 'Pool Participation'
      : input.preferredModel === 'fixed_debt'
        ? 'Fixed Income'
        : input.preferredModel === 'open_to_both'
          ? 'Open To Both'
          : 'Not specified';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...palette.ink);
  doc.text('FINVERNO PRIVATE LIMITED', pageWidth / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(15);
  doc.text('INVESTOR PRODUCT PROSPECTUS', pageWidth / 2, y, { align: 'center' });
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...palette.muted);
  doc.text(`Generated on ${input.generatedAtLabel}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  addText('At a Glance', { bold: true, size: 12, spacing: 1, font: 'helvetica' });
  addText('This note is meant to help you understand Finverno\'s two investor options before any formal proposal or agreement is issued.', {
    size: 10,
    spacing: 2,
    color: palette.ink,
  });
  addText('It is a product explainer, not the final commercial allocation or legal agreement.', {
    size: 10,
    spacing: 3,
    color: palette.ink,
  });

  if (y > 262) {
    doc.addPage();
    y = 18;
  }
  if (y > 24) y += 2;
  doc.setDrawColor(...palette.border);
  doc.line(margin, y - 1, pageWidth - margin, y - 1);
  y += 4;
  addText('1. Investor Snapshot', { bold: true, size: 12, spacing: 2, font: 'helvetica' });
  addSnapshotList([
    `Investor: ${input.investorName}`,
    `Email: ${input.investorEmail}`,
    `Investor Type: ${input.investorType}`,
    ...(input.investorPhone ? [`Phone: ${input.investorPhone}`] : []),
    ...(input.proposedAmount ? [`Indicative Amount: ${formatCurrency(input.proposedAmount)}`] : []),
    `Current Preference: ${preferredModelLabel}`,
    ...(input.preferredModel === 'open_to_both' && (Number(input.indicativePoolAmount || 0) > 0 || Number(input.indicativeFixedDebtAmount || 0) > 0)
      ? [
          `Indicative Split: Pool ${formatCurrency(Number(input.indicativePoolAmount || 0))} / Fixed Income ${formatCurrency(Number(input.indicativeFixedDebtAmount || 0))}`,
        ]
      : []),
    ...(input.liquidityPreference ? [`Liquidity Preference: ${input.liquidityPreference.replace(/_/g, ' ')}`] : []),
  ]);
  y += 0.5;

  addSection('2. What Finverno Offers', [
    'Finverno currently offers two investor models: Pool Participation and Fixed Income.',
    'This prospectus is meant to help the investor understand both options before Finverno prepares the final allocation proposal and agreement set.',
  ]);

  addSection('3. Quick Comparison', [
    'The two options are designed for different investor preferences. The table below summarizes the main trade-offs.',
  ]);
  addCompactComparisonTable();

  addSection('4. Option One: Pool Participation', [
    'Pool Participation is designed for investors who want portfolio-style exposure rather than a fixed return structure.',
    'Returns are linked to the economics of the pooled strategy as a whole rather than one identified receivable or project.',
    'Participates in the pooled working-capital strategy rather than one specific receivable.',
    'Current structure includes a 12% hurdle, 2% management fee on deployed capital only, and 20% carry above hurdle.',
    'Best suited for investors comfortable with portfolio-style performance, variable timing, and higher upside potential.',
  ]);

  addSection('5. Option Two: Fixed Income', [
    'Fixed Income is designed for investors who want simpler and more predictable return mechanics.',
    'This is a private lending arrangement with Finverno, not a fund or NAV product.',
    'Current return basis is 14% per annum, accrued daily on capital that is actually deployed.',
    'Capital is deployed into short-duration receivable-backed transactions.',
    'Best suited for investors who want clearer income visibility and simpler fixed-return economics.',
  ]);

  addSection('6. Duration and Liquidity', [
    'For both models, liquidity depends on collections and transaction rotation rather than a guaranteed exit date.',
    'In the fixed income model, investors can typically expect to be in a position to request withdrawal within roughly 90 to 120 days, though some capital may remain deployed into another cycle depending on timing and collections.',
    'Because Finverno deploys capital across multiple transactions, cash can return at different times. This can allow staggered payouts rather than waiting for one single transaction to close.',
  ]);

  addSection('7. Potential Returns and Trade-offs', [
    'Pool Participation may offer higher upside, but returns are variable and follow pool economics.',
    'Fixed Income offers a clearer fixed-return structure, but repayment timing still depends on liquidity and collections.',
    'The choice is therefore usually between greater return variability and greater income visibility.',
  ]);

  addSection('8. Key Risks', [
    'Both models carry risk, including collection delays, timing mismatch, counterparty risk, operational risk, and longer-than-expected capital cycles.',
    'Neither option should be understood as an on-demand withdrawal product, guaranteed return instrument, or fixed-date repayment product.',
  ]);

  addSection('9. Reporting and Transparency', [
    'Finverno aims to provide clear periodic reporting so investors can understand committed capital, deployed capital, return position, payouts, and liquidity status.',
    'Detailed commercial allocation and legal terms are shared only at the proposal and agreement stage.',
  ]);

  addSection('10. Next Step', [
    'After reviewing this prospectus, the investor can confirm interest in one model or remain open to both.',
    'Finverno will then prepare the final proposed allocation, share the relevant agreement(s), and move to funding only after agreement execution.',
  ]);

  addSection('Questions or Discussion', [
    'If you would like to discuss allocation, liquidity expectations, or the right model for your needs, please speak with the Finverno team before proceeding.',
    'Contact: contact@finverno.com',
  ]);

  if (input.notes) {
    addSection('11. Investor Notes', input.notes);
  }

  y += 6;

  return Buffer.from(doc.output('arraybuffer'));
}
