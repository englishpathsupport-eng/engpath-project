/** Admin emails allowed to request/verify OTP (env overrides defaults). */
const DEFAULT_ADMIN_EMAILS = [
  "englishpathsupport@gmail.com",
  "arshadmuhammedvm66@gmail.com",
];

export function getAllowedAdminEmails() {
  const fromEnv = [process.env.ADMIN_EMAIL_1, process.env.ADMIN_EMAIL_2]
    .filter(Boolean)
    .map((e) => e.toLowerCase().trim());

  return fromEnv.length > 0 ? fromEnv : DEFAULT_ADMIN_EMAILS;
}
