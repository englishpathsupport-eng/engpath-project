import { getAllowedAdminEmails } from "./lib/config.js";
import { getRedis, isRedisConfigured } from "./lib/redis.js";
import { extractOtpCode, otpKey } from "./lib/otp.js";

const ALLOWED_EMAILS = getAllowedAdminEmails();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (process.env.OTP_DEBUG !== "true") {
    return res.status(404).json({ error: "Not found" });
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isRedisConfigured()) {
    return res.status(500).json({ error: "Redis not configured" });
  }

  const email = req.query?.email;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email query parameter is required." });
  }

  const normalised = email.toLowerCase().trim();
  if (!ALLOWED_EMAILS.includes(normalised)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const redis = getRedis();
  const key = otpKey(normalised);
  const stored = await redis.get(key);
  const otp = extractOtpCode(stored);
  if (!otp) {
    return res.status(404).json({ error: "No OTP found" });
  }

  const ttl = await redis.ttl(key);
  return res.status(200).json({ email: normalised, otp, ttl });
}
