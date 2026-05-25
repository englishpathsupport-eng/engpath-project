import { getAllowedAdminEmails } from "./_config.js";
import { isRedisConfigured } from "./_redis.js";
import { parseJsonBody, setCors } from "./_request.js";
import {
  codesMatch,
  deleteOtp,
  extractOtpCode,
  getOtp,
  otpKey,
} from "./_otp.js";

const ALLOWED_EMAILS = getAllowedAdminEmails();

function serviceError(res, code, message, status = 503) {
  return res.status(status).json({ error: message, code });
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isRedisConfigured()) {
    console.error("[verify-otp] Missing UPSTASH_REDIS_* or KV_REST_* env vars");
    return serviceError(
      res,
      "REDIS_MISSING",
      "OTP storage is not configured on the server."
    );
  }

  try {
    const body = await parseJsonBody(req);
    const { email, code } = body || {};

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

    if (err?.message === "REDIS_NOT_CONFIGURED") {
      return serviceError(
        res,
        "REDIS_MISSING",
        "OTP storage is not configured on the server."
      );
    }

    return res.status(500).json({
      error: "Server error",
      code: "INTERNAL",
    });
  }
}
