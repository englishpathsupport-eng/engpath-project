import { Resend } from "resend";
import { getAllowedAdminEmails } from "./lib/config.js";
import { isRedisConfigured } from "./lib/redis.js";
import { parseJsonBody, setCors } from "./lib/request.js";
import { saveOtp, secondsUntilResendAllowed } from "./lib/otp.js";

const ALLOWED_EMAILS = getAllowedAdminEmails();

function generate6Digit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({
      error: "Email service is not configured.",
      code: "RESEND_MISSING",
    });
  }

  try {
    const body = await parseJsonBody(req);
    const email = body?.email;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalised = email.toLowerCase().trim();
    if (!ALLOWED_EMAILS.includes(normalised)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const waitSeconds = await secondsUntilResendAllowed(normalised);
    if (waitSeconds > 0) {
      return res.status(429).json({
        error: `Please wait ${waitSeconds}s before requesting a new code.`,
      });
    }

    const code = generate6Digit();
    await saveOtp(normalised, code);

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from:
        process.env.FROM_EMAIL ||
        "EngPath Admin <onboarding@resend.dev>",
      to: [normalised],
      subject: "EngPath Admin — Your Login OTP",
      html: `
        <div style="font-family:sans-serif;padding:24px">
          <h2 style="color:#6c5ce7">EngPath Admin</h2>
          <p>Your login code:</p>
          <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#6c5ce7">${code}</p>
          <p style="color:#666;font-size:14px">Expires in 10 minutes.</p>
        </div>
      `,
    });

    if (sendError) {
      console.error("[send-otp] Resend:", sendError);
      return res.status(500).json({
        error: "Failed to send OTP email",
        code: "RESEND_FAILED",
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[send-otp]", err?.message || err);
    return res.status(500).json({
      error: err?.message || "Server error",
      code: "SEND_OTP_FAILED",
    });
  }
}
