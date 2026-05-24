// /api/send-otp.js  —  Vercel Serverless Function
// Generates a 6-digit OTP and emails it via Resend API.

import { Resend } from "resend";
import { otpStore, OTP_TTL_MS } from "./_otpStore.js";

const ALLOWED_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
].filter(Boolean).map(e => e.toLowerCase().trim());

function generate6Digit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required." });
    }

    const normalised = email.toLowerCase().trim();

    // Security: silently succeed for non-whitelisted emails (don't leak valid addresses)
    if (!ALLOWED_EMAILS.includes(normalised)) {
      return res.status(200).json({ success: true });
    }

    // Rate-limit: block resend within first 60 s of an existing valid OTP
    const existing = otpStore.get(normalised);
    if (existing && existing.expiresAt > Date.now()) {
      const age = OTP_TTL_MS - (existing.expiresAt - Date.now());
      if (age < 60_000) {
        return res.status(429).json({ error: `Please wait ${60 - Math.floor(age/1000)}s before requesting a new code.` });
      }
    }

    const code = generate6Digit();
    otpStore.set(normalised, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from:    process.env.FROM_EMAIL || "EngPath Admin <onboarding@resend.dev>",
      to:      [normalised],
      subject: "EngPath Admin — Your Login OTP",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;
             background:#f9f9f9;border-radius:16px;border:1px solid #e5e5e5">
          <h2 style="margin:0 0 8px;color:#6c5ce7">EngPath Admin</h2>
          <p style="color:#444;margin:0 0 24px">Your one-time login code:</p>
          <div style="background:#6c5ce7;color:#fff;font-size:42px;font-weight:900;
               letter-spacing:0.3em;text-align:center;border-radius:12px;padding:18px 0">
            ${code}
          </div>
          <p style="color:#888;font-size:13px;margin:20px 0 0">
            Expires in <strong>10 minutes</strong>. Do not share this code.
          </p>
        </div>
      `,
    });

    if (sendError) {
      console.error("[send-otp] Resend error:", sendError);
      return res.status(500).json({ error: "Failed to send email. Try again." });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[send-otp] Error:", err);
    return res.status(500).json({ error: "Server error." });
  }
}
