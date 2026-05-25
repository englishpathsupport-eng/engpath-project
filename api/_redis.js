import { Redis } from "@upstash/redis";

// Supports UPSTASH_* and Vercel KV integration (KV_REST_API_*).
export const redis = Redis.fromEnv();

export function isRedisConfigured() {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)
  );
}
