/**
 * Clerk JWT Authentication for CF Workers
 *
 * Verifies Bearer tokens using Clerk's JWKS endpoint.
 * Extracts clerk_id (sub claim) from verified JWT.
 */

import type { Env } from "./index";

interface JwtHeader {
  alg: string;
  kid: string;
  typ: string;
}

interface JwtPayload {
  sub: string; // Clerk user ID (e.g., user_xxx)
  iss: string;
  exp: number;
  iat: number;
  nbf?: number;
  azp?: string;
}

interface JwksKey {
  kty: string;
  kid: string;
  n: string;
  e: string;
  alg: string;
  use: string;
}

// Cache JWKS keys in memory (survives within a single Worker instance)
const cachedKeys: Map<string, CryptoKey> = new Map();
let cachedJwksUrl: string | null = null;

function getJwksUrl(publishableKey: string): string {
  // Clerk publishable key format: pk_test_xxx or pk_live_xxx
  // Extract the frontend API domain from the publishable key
  const encoded = publishableKey.replace(/^pk_(test|live)_/, "");
  const decoded = atob(encoded).replace(/\$$/, "");
  return `https://${decoded}/.well-known/jwks.json`;
}

async function getPublicKey(
  kid: string,
  env: Env
): Promise<CryptoKey | null> {
  if (cachedKeys.has(kid)) {
    return cachedKeys.get(kid)!;
  }

  const jwksUrl = cachedJwksUrl ?? getJwksUrl(env.CLERK_PUBLISHABLE_KEY);
  cachedJwksUrl = jwksUrl;

  const res = await fetch(jwksUrl);
  if (!res.ok) return null;

  const jwks: { keys: JwksKey[] } = await res.json();

  for (const key of jwks.keys) {
    if (key.kty !== "RSA" || key.use !== "sig") continue;

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      { kty: key.kty, n: key.n, e: key.e, alg: key.alg },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    cachedKeys.set(key.kid, cryptoKey);
  }

  return cachedKeys.get(kid) ?? null;
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Verify a Clerk JWT and return the payload.
 * Returns null if verification fails.
 */
export async function verifyClerkJwt(
  token: string,
  env: Env
): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const headerJson = new TextDecoder().decode(base64UrlDecode(parts[0]));
  const payloadJson = new TextDecoder().decode(base64UrlDecode(parts[1]));

  let header: JwtHeader;
  let payload: JwtPayload;
  try {
    header = JSON.parse(headerJson);
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null;
  if (payload.nbf && payload.nbf > now + 60) return null;

  // Verify signature
  const publicKey = await getPublicKey(header.kid, env);
  if (!publicKey) return null;

  const signatureBytes = base64UrlDecode(parts[2]);
  const dataBytes = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signatureBytes,
    dataBytes
  );

  return valid ? payload : null;
}

/**
 * Extract and verify Bearer token from request.
 * Returns clerk_id on success, null on failure.
 */
export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = await verifyClerkJwt(token, env);
  return payload?.sub ?? null;
}
