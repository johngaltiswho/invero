import type { ContractorAgreementTemplatePayload } from '@/lib/contractor-agreements/types';

export const CONTRACTOR_MASTER_TEMPLATE_KEY = 'contractor-master-platform';
export const CONTRACTOR_MASTER_TEMPLATE_VERSION = 'v3';

export function renderContractorMasterHTML(payload: ContractorAgreementTemplatePayload): string {
  return `
    <html>
      <head><meta charSet="utf-8" /><title>Master SME Platform Agreement</title></head>
      <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.55; padding: 32px; font-size: 12px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="font-size: 22px; font-weight: 700;">FINVERNO PRIVATE LIMITED</div>
          <div style="font-size: 20px; font-weight: 700; margin-top: 8px;">MASTER SME PLATFORM AGREEMENT</div>
          <div style="margin-top: 8px; color: #555;">Template version ${CONTRACTOR_MASTER_TEMPLATE_VERSION}</div>
        </div>

        <p>This Master SME Platform Agreement (“Agreement”) is entered into on ${payload.agreementDateLabel} between <strong>${payload.companyName}</strong> and <strong>${payload.contractorName}</strong>.</p>
        <p><strong>Finverno</strong><br />${payload.companyAddress}</p>
        <p><strong>SME</strong><br />${payload.contractorName}<br />${payload.contractorAddress || 'Address as recorded on the Finverno platform'}<br />Email: ${payload.contractorEmail}</p>

        <h2 style="font-size: 16px;">1. Purpose and Scope</h2>
        <p>This Agreement governs the SME’s use of the Finverno platform for project administration, procurement coordination, document exchange, operational workflow management, and related support services made available by Finverno.</p>

        <h2 style="font-size: 16px;">2. Platform Services</h2>
        <p>Finverno may provide digital workflows for project onboarding, BOQ and document handling, procurement requests, vendor coordination, purchase order processing, delivery tracking, audit support, collections support, financing review support, and related administrative services.</p>

        <h2 style="font-size: 16px;">3. SME Representations and Warranties</h2>
        <p>The SME represents and warrants on a continuing basis that it is duly organized and validly existing under applicable law; the person executing this Agreement and using the platform on its behalf is duly authorized; all KYC, banking, tax, project, invoice, purchase, BOQ, delivery, and commercial information submitted to Finverno is true, complete, current, and not misleading; and the SME has the lawful right to share all records, documents, and data made available through the platform.</p>

        <h2 style="font-size: 16px;">4. Platform Use, Accounts, and Cooperation</h2>
        <p>The SME shall maintain the confidentiality of user credentials, ensure that only authorized personnel use the platform, and remain responsible for all activity carried out through its accounts. The SME shall not misuse the platform, submit fraudulent or manipulated records, reverse engineer platform functionality, scrape data, impersonate any person, or interfere with platform security, workflows, or counterparties. The SME shall promptly cooperate with all operational, compliance, audit, and fraud-prevention inquiries raised by Finverno.</p>

        <h2 style="font-size: 16px;">5. Documents, Data Usage, and Privacy Notice</h2>
        <p>The SME authorizes Finverno to receive, access, store, organize, review, reproduce, transmit, and otherwise process documents, project files, purchase records, invoices, bank and payment records, business correspondence, and related business information for onboarding, KYC, compliance review, procurement execution, financing evaluation, collections support, fraud prevention, audit, dispute handling, support, and lawful recordkeeping. To the extent the SME shares personal or contact data of its employees, signatories, representatives, vendors, or counterparties, the SME confirms that it has provided any required notices and obtained any required authorizations under applicable law. Finverno may engage cloud, storage, communications, workflow, verification, analytics, and professional service providers on a need-to-know basis subject to confidentiality and security controls. Finverno’s Privacy Policy / Data Notice, as updated from time to time and made available on the platform or website, forms an important part of the SME’s understanding of how such data is processed and retained.</p>

        <h2 style="font-size: 16px;">6. Audit, Verification, and Information Rights</h2>
        <p>Finverno may request clarifications, updated KYC, supporting records, project documents, invoices, delivery confirmations, payment details, and other information reasonably required for platform operations, financing review, audit, dispute handling, fraud prevention, or legal compliance. The SME shall provide such records and assistance within a reasonable time. Finverno may retain copies and audit trails of documents, approvals, and workflow actions for operational, legal, regulatory, and dispute-resolution purposes.</p>

        <h2 style="font-size: 16px;">7. Access, Suspension, and Termination</h2>
        <p>Finverno may grant, restrict, suspend, or revoke platform access where KYC is incomplete or stale, legal documentation is deficient, misuse or fraud is suspected, commercial or compliance concerns arise, non-cooperation occurs, policy breaches are identified, or such action is otherwise reasonably necessary to protect Finverno, its users, vendors, investors, or counterparties. This Agreement shall continue until terminated by either Party or suspended/terminated by Finverno for cause. Termination shall not affect accrued payment, confidentiality, indemnity, data retention, audit, evidentiary, or dispute provisions.</p>

        <h2 style="font-size: 16px;">8. Indemnity</h2>
        <p>The SME shall indemnify, defend, and hold harmless Finverno, its affiliates, and their respective directors, officers, employees, and agents from and against any losses, liabilities, claims, penalties, damages, costs, and expenses (including reasonable legal fees) arising out of or relating to: (a) any false, incomplete, or misleading information submitted by or on behalf of the SME; (b) breach of this Agreement or applicable law; (c) unlawful, unauthorized, or infringing documents, content, or data shared through the platform; (d) fraud, willful misconduct, negligence, or misuse of the platform; or (e) third-party claims resulting from the SME’s acts, omissions, or instructions.</p>

        <h2 style="font-size: 16px;">9. Disclaimers and Limitation of Liability</h2>
        <p>Finverno provides the platform and related services on an “as available” and best-efforts basis. Except as expressly agreed in writing, Finverno does not warrant uninterrupted operation, project success, vendor performance, financing availability, client payment, or outcome certainty. To the maximum extent permitted by law, Finverno shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, revenue, business, opportunity, goodwill, or data. Finverno’s aggregate liability arising out of or in connection with this Agreement shall, to the extent permitted by law, be limited to direct losses proven to have been caused by Finverno and shall exclude liabilities arising from factors outside its reasonable control.</p>

        <h2 style="font-size: 16px;">10. No Automatic Financing Commitment</h2>
        <p>This Agreement does not by itself obligate Finverno to extend financing, credit support, escrow support, or capital deployment. Any financing support remains subject to separate approval, limit setting, and execution of the applicable financing / working capital addendum and related recovery, escrow, or collection documents, if any.</p>

        <h2 style="font-size: 16px;">11. Electronic Records, Notices, and Evidence</h2>
        <p>The Parties agree that portal records, emails, workflow logs, timestamps, uploads, OTP or click-through approvals, digital acknowledgements, and electronic execution records may be relied on as valid business records and evidence of activity on the platform. Notices sent by email or through the platform to the addresses or accounts maintained by the SME shall be treated as valid notices, subject to applicable law.</p>

        <h2 style="font-size: 16px;">12. Confidentiality, Survival, and General Provisions</h2>
        <p>Each Party shall keep non-public commercial and operational information confidential, except where disclosure is required by law, to professional advisers, or to service providers on a confidential basis. The SME shall not assign this Agreement without Finverno’s prior written consent. If any provision is held unenforceable, the remaining provisions shall remain in full force. Any waiver must be express and in writing. This Agreement, together with any incorporated policies and separately executed addenda, constitutes the entire understanding between the Parties with respect to the subject matter hereof.</p>

        <h2 style="font-size: 16px;">13. Governing Law and Jurisdiction</h2>
        <p>This Agreement shall be governed by the laws of India, and disputes shall be subject to the courts at ${payload.jurisdiction}.</p>

        ${payload.note ? `<h2 style="font-size: 16px;">Schedule / Notes</h2><p>${payload.note}</p>` : ''}

        <div style="margin-top: 42px;">
          <p><strong>For Finverno Private Limited</strong></p>
          <p style="margin-top: 48px;">__________________________</p>
          <p>${payload.companySignatoryName}</p>
          <p>${payload.companySignatoryTitle}</p>
        </div>

        <div style="margin-top: 42px;">
          <p><strong>For the SME</strong></p>
          <p style="margin-top: 48px;">__________________________</p>
          <p>${payload.contactPerson || payload.contractorName}</p>
          <p>${payload.contractorName}</p>
        </div>
      </body>
    </html>
  `.trim();
}
