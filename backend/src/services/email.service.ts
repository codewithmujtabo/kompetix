import nodemailer from "nodemailer";
import { env } from "../config/env";

const smtpConfigured = !!env.SMTP_USER && !!env.SMTP_PASS;

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export function isSmtpConfigured(): boolean {
  return smtpConfigured;
}

export async function sendMailOrThrow(options: nodemailer.SendMailOptions): Promise<void> {
  if (!transporter) {
    throw new Error("SMTP is not configured");
  }

  await transporter.sendMail(options);
}

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  await sendMailOrThrow({
    from: env.SMTP_FROM,
    to: email,
    subject: "Your Kompetix OTP Code",
    text: `Your verification code is: ${code}\n\nThis code is valid for ${env.OTP_EXPIRY_MINUTES} minutes.\n\nIf you didn't request this code, please ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">Kompetix</h2>
        <p>Your verification code is:</p>
        <div style="background: #F0F0FF; padding: 16px; border-radius: 8px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #4F46E5;">${code}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This code is valid for ${env.OTP_EXPIRY_MINUTES} minutes.</p>
        <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  });
}

export async function sendParentInvitationEmail(email: string, pin: string, studentName: string): Promise<void> {
  await sendMailOrThrow({
    from: env.SMTP_FROM,
    to: email,
    subject: "Parent Account Invitation - Kompetix",
    text: `${studentName} has invited you to link your parent account.\n\nYour verification PIN is: ${pin}\n\nThis PIN is valid for 24 hours.\n\nTo complete the linking process, open the Kompetix app and enter this PIN when prompted.`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4F46E5;">Kompetix</h2>
        <p><strong>${studentName}</strong> has invited you to link your parent account.</p>
        <p>Your verification PIN is:</p>
        <div style="background: #F0F0FF; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #4F46E5;">${pin}</span>
        </div>
        <p style="color: #666; font-size: 14px;">This PIN is valid for 24 hours.</p>
        <p style="color: #666; font-size: 14px;">To complete the linking process:</p>
        <ol style="color: #666; font-size: 14px;">
          <li>Open the Kompetix app</li>
          <li>Go to your profile or children section</li>
          <li>Enter this PIN when prompted</li>
        </ol>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">If you didn't expect this invitation, please ignore this email.</p>
      </div>
    `,
  });
}
