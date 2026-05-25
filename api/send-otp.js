import { Redis } from "@upstash/redis";
import { Resend } from "resend";

const ALLOWED = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  "englishpathsupport@gmail.com",
  "arshadmuhammedvm66@gmail.com",
]
  .filter(Boolean)
  .map((e) => e.toLowerCase().trim());

const TTL = 600;

function redisClient() {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    ""
  ).trim();
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    ""
  ).trim();
  if (!url || !token) throw new Error("REDIS_NOT_CONFIGURED");
  return new Redis({ url, token });
}

function parseBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: "Email not configured", code: "RESEND_MISSING" });
  }

  try {
    const { email } = parseBody(req);
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalised = email.toLowerCase().trim();
    if (!ALLOWED.includes(normalised)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const redis = redisClient();
    const key = `otp:${normalised}`;
    const code = String(Math.floor(100000 + Math.random() * 900000));

    await redis.set(key, code, { ex: TTL });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from: process.env.FROM_EMAIL || "EngPath Admin <onboarding@resend.dev>",
      to: [normalised],
      subject: "EngPath Admin — Your Login OTP",
      html: `<div style="font-family:sans-serif;padding:24px">
        <h2 style="color:#6c5ce7">EngPath Admin</h2>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px">${code}</p>
        <p>Expires in 10 minutes.</p>
      </div>`,
    });

    if (sendError) {
      console.error("[send-otp] resend", sendError);
      return res.status(500).json({ error: "Failed to send email", code: "RESEND_FAILED" });
    }

    return res.status(200).json({ success: true, v: 4 });
  } catch (err) {
    console.error("[send-otp]", err?.message || err);
    const msg = err?.message === "REDIS_NOT_CONFIGURED"
      ? "Redis not configured on Vercel"
      : (err?.message || "Server error");
    return res.status(500).json({ error: msg, code: "SEND_OTP_FAILED" });
  }
}
