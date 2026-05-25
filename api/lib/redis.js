import { Redis } from "@upstash/redis";

let client = null;

export function getRedisConfig() {
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
  return { url, token };
}

export function isRedisConfigured() {
  const { url, token } = getRedisConfig();
  return Boolean(url && token);
}

export function getRedis() {
  if (!isRedisConfigured()) {
    throw new Error("REDIS_NOT_CONFIGURED");
  }
  if (!client) {
    const { url, token } = getRedisConfig();
    client = new Redis({ url, token });
  }
  return client;
}

export async function testRedisConnection() {
  const redis = getRedis();
  const probe = `health:${Date.now()}`;
  await redis.set(probe, "ok", { ex: 10 });
  const value = await redis.get(probe);
  await redis.del(probe);
  return value === "ok";
}
