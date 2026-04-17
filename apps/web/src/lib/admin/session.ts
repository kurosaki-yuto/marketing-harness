export const COOKIE_NAME = "mh_admin_session";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSession(secret: string): Promise<string> {
  const payload = String(Date.now());
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return `${payload}.${sigB64}`;
}

export async function verifySession(token: string, secret: string): Promise<boolean> {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  try {
    const key = await importKey(secret);
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    return crypto.subtle.verify("HMAC", key, sigBytes, new TextEncoder().encode(payload));
  } catch {
    return false;
  }
}
