import { getAllowedAdminEmails } from "./lib/config.js";
import { isRedisConfigured } from "./lib/redis.js";
import { parseJsonBody, setCors } from "./lib/request.js";
import {
  codesMatch,
  deleteOtp,
  getOtp,
} from "./lib/otp.js";

const ALLOWED_EMAILS = getAllowedAdminEmails();

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isRedisConfigured()) {
    return res.status(503).json({
      error: "OTP storage is not configured.",
      code: "REDIS_MISSING",
    });
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

    const stored = await getOtp(normalised);
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
    console.error("[verify-otp]", err?.message || err);
    return res.status(500).json({
      error: err?.message || "Server error",
      code: "VERIFY_OTP_FAILED",
    });
  }
}
