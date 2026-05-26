import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ALLOWED_EMAILS = [
  process.env.ADMIN_EMAIL_1,
  process.env.ADMIN_EMAIL_2,
].filter(Boolean).map(e => e.toLowerCase().trim());

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (process.env.OTP_DEBUG !== "true") {
    return res.status(404).json({ error: "Not found" });
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const email = req.query?.email;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email query parameter is required." });
  }

  const normalised = email.toLowerCase().trim();
  if (!ALLOWED_EMAILS.includes(normalised)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const key = `otp:${normalised}`;
  const stored = await redis.get(key);
  if (!stored) {
    return res.status(404).json({ error: "No OTP found" });
  }

  const ttl = await redis.ttl(key);
  return res.status(200).json({ email: normalised, otp: stored, ttl });
}
