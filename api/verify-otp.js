import { isRedisConfigured } from "./_redis.js";
import {
  codesMatch,
  deleteOtp,
  extractOtpCode,
  getOtp,
  otpKey,
} from "./_otp.js";

const ALLOWED_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
]
  .filter(Boolean)
  .map((e) => e.toLowerCase().trim());

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isRedisConfigured()) {
    console.error("[verify-otp] Redis env vars missing");
    return res.status(500).json({ error: "Server error" });
  }

  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code required" });
    }

    const normalised = email.toLowerCase().trim();

    if (!ALLOWED_EMAILS.includes(normalised)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const key = otpKey(normalised);
    const stored = await getOtp(normalised);

    if (process.env.OTP_DEBUG === "true") {
      console.log("[verify-otp]", {
        key,
        stored: extractOtpCode(stored),
        entered: String(code).trim(),
      });
    }

    if (!stored) {
      return res.status(401).json({
        error: "No OTP found. Please request a new OTP.",
      });
    }

    if (!codesMatch(stored, code)) {
      return res.status(401).json({ error: "Incorrect OTP" });
    }

    await deleteOtp(normalised);

    const sessionToken = Buffer.from(
      JSON.stringify({ email: normalised, ts: Date.now() })
    ).toString("base64");

    return res.status(200).json({ success: true, sessionToken });
  } catch (err) {
    console.error("[verify-otp] Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
