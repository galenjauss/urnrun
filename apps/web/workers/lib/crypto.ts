/** WebCrypto helpers: HMAC signing, constant-time compare, random ids. */

const encoder = new TextEncoder();

export function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function hmacKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    keyCache.set(secret, key);
  }
  return key;
}

export async function hmac(secret: string, message: string): Promise<string> {
  if (!secret) throw new Error("HMAC secret is not configured");
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(message));
  return base64url(sig);
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyHmac(
  secret: string,
  message: string,
  signature: string,
): Promise<boolean> {
  return safeEqual(await hmac(secret, message), signature);
}

/** URL-safe random id with `bytes` of entropy (default 16 = 128 bits). */
export function randomId(bytes = 16): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}
