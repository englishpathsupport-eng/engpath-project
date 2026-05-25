import { Resend } from "resend";
import { getAllowedAdminEmails } from "./_config.js";
import { isRedisConfigured } from "./_redis.js";
import { parseJsonBody, setCors } from "./_request.js";
import {
  OTP_TTL_SECONDS,
  getOtp,
  saveOtp,
  secondsUntilResendAllowed,
} from "./_otp.js";

const ALLOWED_EMAILS = getAllowedAdminEmails();

function generate6Digit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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
    console.error("[send-otp] Missing UPSTASH_REDIS_* or KV_REST_* env vars");
    return serviceError(
      res,
      "REDIS_MISSING",
      "OTP storage is not configured on the server."
    );
  }

  if (!process.env.RESEND_API_KEY) {
    console.error("[send-otp] Missing RESEND_API_KEY");
    return serviceError(
      res,
      "RESEND_MISSING",
      "Email service is not configured on the server."
    );
  }

  try {
    const body = await parseJsonBody(req);
    const { email } = body || {};

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
    const key = await saveOtp(normalised, code);

    const check = await getOtp(normalised);
    console.log("[send-otp] saved", {
      key,
      ttlSeconds: OTP_TTL_SECONDS,
      ok: Boolean(check),
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from:
        process.env.FROM_EMAIL ||
        "EngPath Admin <onboarding@resend.dev>",
      to: [normalised],
      subject: "EngPath Admin — Your Login OTP",
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;
             background:#f9f9f9;border-radius:16px;border:1px solid #eee">
          <h2 style="color:#6c5ce7">EngPath Admin</h2>
          <p>Your one-time login code:</p>
          <div style="font-size:42px;font-weight:900;letter-spacing:0.3em;text-align:center;
               background:#6c5ce7;color:#fff;border-radius:12px;padding:18px 0">
            ${code}
          </div>
          <p style="color:#888;font-size:13px;margin:20px 0 0">
            Expires in <strong>10 minutes</strong>. Do not share this code.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[send-otp] Resend error:", error);
      return res.status(500).json({
        error: "Failed to send OTP email",
        code: "RESEND_FAILED",
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[send-otp] Error:", err);

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
