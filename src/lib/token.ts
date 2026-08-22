import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  LIMITS,
  MANAGE_COOKIE_MAX_AGE,
  MANAGE_COOKIE_PREFIX,
} from "./constants";

const SLUG_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomString(alphabet: string, length: number): string {
  let out = "";
  const max = 256 - (256 % alphabet.length);
  while (out.length < length) {
    const bytes = randomBytes(length);
    for (const b of bytes) {
      if (b >= max) continue;
      out += alphabet[b % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
}

export function generateSlug(): string {
  return randomString(SLUG_ALPHABET, LIMITS.slugLength);
}

export function generateManageCode(): string {
  return randomString(CODE_ALPHABET, LIMITS.manageCodeLength);
}

export function hashCode(code: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(code, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyCode(code: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(
      code,
      Buffer.from(saltHex, "hex"),
      expected.length,
    );
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

interface TokenPayload {
  s: string;
  e: number;
}

function getSecret(): string {
  const secret = process.env.SERVER_SECRET;
  if (!secret) {
    throw new Error("SERVER_SECRET is not configured.");
  }
  return secret;
}

export function signManageToken(slug: string): string {
  const payload: TokenPayload = {
    s: slug,
    e: Date.now() + MANAGE_COOKIE_MAX_AGE * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyManageToken(
  token: string | undefined,
  slug: string,
): boolean {
  if (!token) return false;
  const [body, sig] = token.split(".");
  if (!body || !sig) return false;
  const expected = createHmac("sha256", getSecret())
    .update(body)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as TokenPayload;
    return payload.s === slug && payload.e > Date.now();
  } catch {
    return false;
  }
}

export function manageCookieName(slug: string): string {
  return `${MANAGE_COOKIE_PREFIX}${slug}`;
}

export function slugFromPath(pathname: string): string | null {
  const match = /^\/(?:edit|manage|access)\/([A-Za-z0-9]{4,16})/.exec(pathname);
  return match ? match[1] : null;
}
