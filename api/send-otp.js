import { Redis } from "@upstash/redis";
import { Resend } from "resend";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ALLOWED_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
]
  .filter(Boolean)
  .map((e) => e.toLowerCase().trim());

const OTP_TTL_SECONDS = 10 * 60;

function generate6Digit() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { email } = req.body || {};

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const normalised = email.toLowerCase().trim();

    if (!ALLOWED_EMAILS.includes(normalised)) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const key = `otp:${normalised}`;

    const existing = await redis.get(key);

    if (existing) {
      return res.status(429).json({
        error: "OTP already sent. Please wait.",
      });
    }

    const code = generate6Digit();

    await redis.set(key, code, {
      ex: OTP_TTL_SECONDS,
    });

    console.log("[send-otp] OTP Saved:", {
      key,
      code,
    });

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from:
        process.env.FROM_EMAIL ||
        "EngPath Admin <onboarding@resend.dev>",

      to: [normalised],

      subject: "EngPath Admin — Your Login OTP",

      html: `
        <div style="font-family:sans-serif;padding:20px">
          <h2>EngPath Admin Login</h2>

          <p>Your OTP code:</p>

          <div style="
            font-size:40px;
            font-weight:bold;
            letter-spacing:10px;
            color:#6c5ce7;
          ">
            ${code}
          </div>

          <p>
            This code expires in 10 minutes.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[send-otp] Email Error:", error);

      return res.status(500).json({
        error: "Failed to send OTP email",
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.error("[send-otp] Error:", err);

    return res.status(500).json({
      error: "Server error",
    });
  }
}