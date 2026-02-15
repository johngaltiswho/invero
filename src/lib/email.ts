type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM || 'noreply@finverno.com';
const SENDGRID_REPLY_TO = process.env.SENDGRID_REPLY_TO || 'noreply@finverno.com';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Finverno';

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key missing. Skipping email send.');
    return;
  }

  const body = {
    personalizations: [
      {
        to: [{ email: payload.to }]
      }
    ],
    from: { email: SENDGRID_FROM, name: SENDGRID_FROM_NAME },
    reply_to: { email: SENDGRID_REPLY_TO },
    subject: payload.subject,
    content: [
      payload.html
        ? { type: 'text/html', value: payload.html }
        : { type: 'text/plain', value: payload.text || '' }
    ]
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('SendGrid email failed:', response.status, errorText);
  }
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
