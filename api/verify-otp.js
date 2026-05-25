import { Redis } from "@upstash/redis";

const ALLOWED = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
  "englishpathsupport@gmail.com",
  "arshadmuhammedvm66@gmail.com",
]
  .filter(Boolean)
  .map((e) => e.toLowerCase().trim());

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

  try {
    const { email, code } = parseBody(req);
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code required" });
    }

    const normalised = email.toLowerCase().trim();
    if (!ALLOWED.includes(normalised)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const redis = redisClient();
    const key = `otp:${normalised}`;
    const stored = await redis.get(key);

    if (!stored) {
      return res.status(401).json({ error: "No OTP found. Request a new code." });
    }

    if (String(stored).trim() !== String(code).trim()) {
      return res.status(401).json({ error: "Incorrect OTP" });
    }

    await redis.del(key);

    const sessionToken = Buffer.from(
      JSON.stringify({ email: normalised, ts: Date.now() })
    ).toString("base64");

    return res.status(200).json({ success: true, sessionToken, v: 4 });
  } catch (err) {
    console.error("[verify-otp]", err?.message || err);
    const msg = err?.message === "REDIS_NOT_CONFIGURED"
      ? "Redis not configured on Vercel"
      : (err?.message || "Server error");
    return res.status(500).json({ error: msg, code: "VERIFY_OTP_FAILED" });
  }
}
