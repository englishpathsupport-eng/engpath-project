import { Redis } from "@upstash/redis";

let client = null;

export function getRedisConfig() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
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

// Lazy proxy so imports do not instantiate before env is ready.
export const redis = new Proxy(
  {},
  {
    get(_target, prop) {
      const instance = getRedis();
      const value = instance[prop];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  }
);
