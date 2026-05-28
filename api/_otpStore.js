// In-memory OTP store (fallback when Redis is not configured)
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const otpStore = new Map();

// Auto-cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of otpStore.entries()) {
    if (val.expiresAt < now) otpStore.delete(key);
  }
}, 5 * 60 * 1000);
