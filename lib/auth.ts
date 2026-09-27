import { env } from "@/lib/env";

export const SESSION_COOKIE_NAME = "stravalyzer_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

const SESSION_PAYLOAD = "authenticated";

// Uses Web Crypto (crypto.subtle) instead of Node's `crypto` module so this
// file works unchanged in both the Edge middleware runtime and Node route
// handlers, without pinning `export const runtime = "nodejs"`.

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionCookieValue(): Promise<string> {
  const signature = await hmacHex(env.SESSION_SECRET, SESSION_PAYLOAD);
  return `${SESSION_PAYLOAD}.${signature}`;
}

export async function isValidSessionCookie(value: string | undefined): Promise<boolean> {
  if (!value) return false;

  const [payload, signature] = value.split(".");
  if (payload !== SESSION_PAYLOAD || !signature) return false;

  const expected = await hmacHex(env.SESSION_SECRET, payload);

  // Signatures are fixed-length hex from the same HMAC, so a plain
  // constant-time-ish comparison via matching length + full scan is fine;
  // Web Crypto has no built-in timingSafeEqual.
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}
