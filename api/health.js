import { Redis } from "@upstash/redis";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
  const resendOk = Boolean(process.env.RESEND_API_KEY);

  let redisOk = false;
  if (url && token) {
    try {
      const redis = new Redis({ url, token });
      const probe = `ping:${Date.now()}`;
      await redis.set(probe, "ok", { ex: 5 });
      redisOk = (await redis.get(probe)) === "ok";
      await redis.del(probe);
    } catch (err) {
      console.error("[health]", err?.message || err);
    }
  }

  return res.status(200).json({
    ok: redisOk && resendOk,
    redis: redisOk,
    resend: resendOk,
    version: 4,
  });
}
