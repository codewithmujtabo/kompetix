import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  INVITATION_DEBUG_MODE:
    process.env.INVITATION_DEBUG_MODE === "true" ||
    process.env.NODE_ENV !== "production",
  PORT: parseInt(process.env.PORT || "3000", 10),
  DATABASE_URL: required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  SMTP_HOST: process.env.SMTP_HOST || "smtp.gmail.com",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587", 10),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  SMTP_FROM: process.env.SMTP_FROM || "Kompetix <noreply@kompetix.id>",
  OTP_EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES || "10", 10),
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  TWILIO_VERIFY_SID: process.env.TWILIO_VERIFY_SID || "",
  MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY || "",
  MIDTRANS_CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY || "",
  MIDTRANS_IS_PRODUCTION: process.env.MIDTRANS_IS_PRODUCTION === "true",
  API_CO_ID_KEY: process.env.API_CO_ID_KEY || "",
};
