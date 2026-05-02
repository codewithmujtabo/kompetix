import twilio from "twilio";
import { env } from "../config/env";

const DEV_BYPASS = !env.TWILIO_VERIFY_SID;
const DEV_OTP = "000000";

/**
 * Normalise an Indonesian phone number to E.164 format (+62...).
 * Accepts: 08xxx, 8xxx, +628xxx
 */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return `+62${digits}`;
}

function getClient() {
  return twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  if (DEV_BYPASS) {
    console.log(`[DEV] Phone OTP for ${toE164(phone)}: ${DEV_OTP} (Twilio not configured)`);
    return;
  }
  await getClient()
    .verify.v2.services(env.TWILIO_VERIFY_SID)
    .verifications.create({ to: toE164(phone), channel: "sms" });
}

/**
 * Returns true if the code is valid, false otherwise.
 */
export async function verifyPhoneOtp(phone: string, code: string): Promise<boolean> {
  if (DEV_BYPASS) {
    return code === DEV_OTP;
  }
  const check = await getClient()
    .verify.v2.services(env.TWILIO_VERIFY_SID)
    .verificationChecks.create({ to: toE164(phone), code });
  return check.status === "approved";
}
