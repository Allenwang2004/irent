import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Shared-password login: one password for all operations staff, and a signed
// cookie that proves the browser entered it. No user accounts.

export const SESSION_COOKIE = "irent_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function requireEnv(name: "ADMIN_PASSWORD" | "SESSION_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} (see web/.env.example)`);
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(payload).digest("hex");
}

// Hash both sides first so the comparison takes the same time whatever the lengths.
function safeEqual(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function checkPassword(input: string) {
  return safeEqual(input, requireEnv("ADMIN_PASSWORD"));
}

export function createSessionToken() {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  return `${expiresAt}.${sign(`admin.${expiresAt}`)}`;
}

export function isValidSessionToken(token: string | undefined) {
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;
  return safeEqual(signature, sign(`admin.${expiresAt}`));
}
