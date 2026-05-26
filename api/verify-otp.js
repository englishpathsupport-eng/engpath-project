import { Redis } from "@upstash/redis";
import { otpStore, OTP_TTL_MS } from "./_otpStore.js";

const useRedisV = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
let redis = null;
if (useRedisV) {
  try {
    redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
  } catch (e) {
    console.error("[verify-otp] Failed to init Redis, falling back to in-memory store:", e);
    redis = null;
  }
}

const ALLOWED_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
].filter(Boolean).map(e => e.toLowerCase().trim());

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, code } = req.body || {};
    if (!email || !code) return res.status(400).json({ error: "Email and code required" });

    const normalised = email.toLowerCase().trim();
    if (!ALLOWED_EMAILS.includes(normalised)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Try Redis first, otherwise fall back to in-memory store
    const key = `otp:${normalised}`;
    let stored = null;
    if (redis) {
      try {
        stored = await redis.get(key);
      } catch (e) {
        console.error('[verify-otp] Redis read failed, falling back to in-memory', e);
        stored = null;
      }
    }

    if (!stored) {
      const entry = otpStore.get(normalised);
      if (entry && entry.code) stored = entry.code;
    }

    if (!stored) {
      return res.status(401).json({ error: "No OTP found. Please request a new one." });
    }

    if (String(stored).trim() !== String(code).trim()) {
      return res.status(401).json({ error: "Incorrect code. Try again." });
    }

    // OTP delete — remove from both stores
    try { if (redis) await redis.del(key); } catch (e) { console.error('[verify-otp] Redis del failed', e); }
    try { otpStore.delete(normalised); } catch (_) {}

    const sessionToken = Buffer.from(
      JSON.stringify({ email: normalised, ts: Date.now() })
    ).toString("base64");

    return res.status(200).json({ success: true, sessionToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
