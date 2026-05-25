import { getAllowedAdminEmails } from "./_config.js";
import { isRedisConfigured } from "./_redis.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  return res.status(200).json({
    ok: isRedisConfigured() && Boolean(process.env.RESEND_API_KEY),
    redis: isRedisConfigured(),
    resend: Boolean(process.env.RESEND_API_KEY),
    adminEmails: getAllowedAdminEmails().length,
  });
}
