import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

const SES_REGION = process.env.AWS_SES_REGION || process.env.AWS_REGION;
const SES_FROM_EMAIL = process.env.EMAIL_FROM || process.env.SES_FROM_EMAIL || 'noreply@finverno.com';
const SES_REPLY_TO = process.env.EMAIL_REPLY_TO || process.env.SES_REPLY_TO || SES_FROM_EMAIL;
const SES_FROM_NAME = process.env.EMAIL_FROM_NAME || process.env.SES_FROM_NAME || 'Finverno';

let sesClient: SESv2Client | null = null;

function getSesClient() {
  if (!SES_REGION) {
    throw new Error('Missing AWS_SES_REGION or AWS_REGION');
  }

  if (!sesClient) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = process.env.AWS_SESSION_TOKEN;

    sesClient = new SESv2Client({
      region: SES_REGION,
      credentials:
        accessKeyId && secretAccessKey
          ? {
              accessKeyId,
              secretAccessKey,
              sessionToken,
            }
          : undefined,
    });
  }

  return sesClient;
}

function buildFromAddress() {
  return SES_FROM_NAME ? `${SES_FROM_NAME} <${SES_FROM_EMAIL}>` : SES_FROM_EMAIL;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!payload.to) {
    throw new Error('Missing email recipient');
  }

  if (!payload.text && !payload.html) {
    throw new Error('Email payload must include text or html content');
  }

  try {
    const client = getSesClient();
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: buildFromAddress(),
        Destination: {
          ToAddresses: [payload.to],
        },
        ReplyToAddresses: SES_REPLY_TO ? [SES_REPLY_TO] : undefined,
        Content: {
          Simple: {
            Subject: {
              Data: payload.subject,
              Charset: 'UTF-8',
            },
            Body: {
              Text: payload.text
                ? {
                    Data: payload.text,
                    Charset: 'UTF-8',
                  }
                : undefined,
              Html: payload.html
                ? {
                    Data: payload.html,
                    Charset: 'UTF-8',
                  }
                : undefined,
            },
          },
        },
      })
    );
  } catch (error) {
    console.error('SES email failed:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to send email with SES');
  }
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
