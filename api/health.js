import { getAllowedAdminEmails } from "./lib/config.js";
import { isRedisConfigured, testRedisConnection } from "./lib/redis.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let redisOk = false;
  if (isRedisConfigured()) {
    try {
      redisOk = await testRedisConnection();
    } catch (err) {
      console.error("[health] Redis ping failed:", err?.message || err);
    }
  }

  const resendOk = Boolean(process.env.RESEND_API_KEY);

  return res.status(200).json({
    ok: redisOk && resendOk,
    redis: redisOk,
    redisConfigured: isRedisConfigured(),
    resend: resendOk,
    adminEmails: getAllowedAdminEmails().length,
    version: 3,
  });
}
