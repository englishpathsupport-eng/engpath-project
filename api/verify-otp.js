import { Redis } from "@upstash/redis";

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
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({
        error: "Email and code required",
      });
    }

    const normalised = email.toLowerCase().trim();

    if (!ALLOWED_EMAILS.includes(normalised)) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const key = `otp:${normalised}`;

    const stored = await redis.get(key);

    console.log("[verify-otp] Debug:", {
      key,
      stored,
      entered: code,
    });

    if (!stored) {
      return res.status(401).json({
        error: "No OTP found. Please request a new OTP.",
      });
    }

    if (
      String(stored).trim() !==
      String(code).trim()
    ) {
      return res.status(401).json({
        error: "Incorrect OTP",
      });
    }

    await redis.del(key);

    const sessionToken = Buffer.from(
      JSON.stringify({
        email: normalised,
        ts: Date.now(),
      })
    ).toString("base64");

    return res.status(200).json({
      success: true,
      sessionToken,
    });
  } catch (err) {
    console.error("[verify-otp] Error:", err);

    return res.status(500).json({
      error: "Server error",
    });
  }
}