import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendReviewRequestSMS(opts: {
  to: string;
  customerName: string;
  businessName: string;
  reviewLink: string;
}): Promise<string> {
  const body = `Hi ${opts.customerName}! Thanks for choosing ${opts.businessName}. We'd love your feedback — it takes 30 seconds and helps us a lot. Leave a quick review here: ${opts.reviewLink}`;

  const message = await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: opts.to,
  });

  return message.sid;
}
