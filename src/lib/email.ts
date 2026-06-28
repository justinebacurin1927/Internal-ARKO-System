import nodemailer from "nodemailer";

// SMTP transport. Local dev points at MailHog (inspect at http://localhost:8025).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

const from = process.env.SMTP_FROM ?? "ARKO <no-reply@arko.local>";

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    await transporter.sendMail({ from, ...opts });
  } catch (err) {
    // Never let a mail failure break the request that triggered it.
    console.error("sendMail failed:", err);
  }
}

/** Email body for an @mention notification. */
export function mentionEmail(opts: {
  mentionedBy: string;
  context: string;
  url: string;
}) {
  return `
    <p><strong>${opts.mentionedBy}</strong> mentioned you in ${opts.context}.</p>
    <p><a href="${opts.url}">View it in ARKO →</a></p>
  `;
}
