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

const OTP_TTL_SECONDS = 600;

function generate6Digit() {
  return String(
    Math.floor(100000 + Math.random() * 900000)
  );
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

    if (!email) {
      return res.status(400).json({
        error: "Email required",
      });
    }

    const normalised = email.toLowerCase().trim();

    if (!ALLOWED_EMAILS.includes(normalised)) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const code = generate6Digit();

    const key = `otp:${normalised}`;

    // SAVE OTP
    await redis.set(key, code);

    // SET EXPIRY
    await redis.expire(key, OTP_TTL_SECONDS);

    // VERIFY SAVE
    const check = await redis.get(key);

    console.log("===== OTP SAVE DEBUG =====");
    console.log("KEY:", key);
    console.log("OTP:", code);
    console.log("REDIS CHECK:", check);
    console.log("==========================");

    const resend = new Resend(
      process.env.RESEND_API_KEY
    );

    const { error } = await resend.emails.send({
      from: "onboarding@resend.dev",

      to: [normalised],

      subject: "EngPath Admin OTP",

      html: `
        <div style="font-family:sans-serif">
          <h2>Your OTP Code</h2>

          <div style="
            font-size:42px;
            font-weight:bold;
            letter-spacing:8px;
            color:#6c5ce7;
          ">
            ${code}
          </div>

          <p>
            Expires in 10 minutes.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("RESEND ERROR:", error);

      return res.status(500).json({
        error: "Failed to send OTP",
      });
    }

    return res.status(200).json({
      success: true,
    });

  } catch (err) {

    console.error("[send-otp] ERROR:", err);

    return res.status(500).json({
      error: "Server error",
    });
  }
}