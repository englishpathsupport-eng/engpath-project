import { getRedis } from "./redis.js";

export const OTP_TTL_SECONDS = 600;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export function otpKey(email) {
  return `otp:${email.toLowerCase().trim()}`;
}

export function extractOtpCode(stored) {
  if (stored == null) return null;

  if (typeof stored === "object") {
    if (stored.code != null) return String(stored.code).trim();
    return null;
  }

  const str = String(stored).trim();
  if (str.startsWith("{")) {
    try {
      const parsed = JSON.parse(str);
      if (parsed?.code != null) return String(parsed.code).trim();
    } catch {
      // plain code string
    }
  }

  return str;
}

export function codesMatch(stored, entered) {
  const expected = extractOtpCode(stored);
  const actual = String(entered ?? "").trim();
  return Boolean(expected && actual && expected === actual);
}

export async function saveOtp(email, code) {
  const redis = getRedis();
  const key = otpKey(email);
  await redis.set(key, { code: String(code) }, { ex: OTP_TTL_SECONDS });
  return key;
}

export async function getOtp(email) {
  return getRedis().get(otpKey(email));
}

export async function deleteOtp(email) {
  return getRedis().del(otpKey(email));
}

export async function getOtpTtl(email) {
  return getRedis().ttl(otpKey(email));
}

export async function secondsUntilResendAllowed(email) {
  const ttl = await getOtpTtl(email);
  if (ttl <= 0) return 0;
  const elapsed = OTP_TTL_SECONDS - ttl;
  if (elapsed >= OTP_RESEND_COOLDOWN_SECONDS) return 0;
  return OTP_RESEND_COOLDOWN_SECONDS - elapsed;
}
