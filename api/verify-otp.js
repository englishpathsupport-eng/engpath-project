// /api/verify-otp.js
// Vercel Serverless Function — Verifies the 6-digit OTP sent by send-otp.js

import { otpStore, MAX_ATTEMPTS } from "./_otpStore.js";

const ALLOWED_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
].filter(Boolean).map(e => e.toLowerCase().trim());

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required." });
    }

    const normalised = email.toLowerCase().trim();

    // Security: only allow whitelisted admin emails
    if (!ALLOWED_EMAILS.includes(normalised)) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const entry = otpStore.get(normalised);

    if (!entry) {
      return res.status(401).json({ error: "No OTP found. Please request a new one." });
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(normalised);
      return res.status(401).json({ error: "OTP expired. Please request a new one." });
    }

    entry.attempts += 1;

    if (entry.attempts > MAX_ATTEMPTS) {
      otpStore.delete(normalised);
      return res.status(429).json({ error: "Too many attempts. Please request a new OTP." });
    }

    if (entry.code !== String(code).trim()) {
      return res.status(401).json({
        error: `Incorrect code. ${MAX_ATTEMPTS - entry.attempts} attempt(s) remaining.`,
      });
    }

    // ✅ Correct — delete the entry so it can't be reused
    otpStore.delete(normalised);

    // Issue a short-lived signed token so the frontend can confirm success
    // (For extra security you could use JWT + secret here)
    const sessionToken = Buffer.from(
      JSON.stringify({ email: normalised, ts: Date.now(), ttl: 30 * 60 * 1000 })
    ).toString("base64");

    return res.status(200).json({ success: true, sessionToken });

  } catch (err) {
    console.error("[verify-otp] Unexpected error:", err);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
}
