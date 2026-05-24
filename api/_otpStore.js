// /api/_otpStore.js
// Shared in-process OTP store imported by send-otp.js AND verify-otp.js.
// Works perfectly for a single Vercel serverless region / single instance.
// For multi-region production → replace with Upstash Redis.

export const otpStore = new Map();
// { email: { code: string, expiresAt: number, attempts: number } }

export const OTP_TTL_MS   = 10 * 60 * 1000; // 10 minutes
export const MAX_ATTEMPTS = 5;
