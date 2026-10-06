import {
  createHmac,
  randomBytes,
  scrypt,
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
      out += alphabet.charAt(b % alphabet.length);
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

/**
 * scrypt 走线程池的异步版本：同步版（scryptSync）会独占事件循环，
 * 在单实例 serverless 上等于把整个实例的 CPU 卡住 ~100ms，
 * 并发验证管理码时会拖垮同实例的其他请求。
 *
 * 参数刻意保持 node:crypto 默认值不变：存量请柬的 manage_code 是用默认参数
 * 算出来的，改参数会导致所有已发出的请柬管理码永久失效。
 */
function scryptKey(
  code: string,
  salt: Buffer,
  keylen: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(code, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

export async function hashCode(code: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptKey(code, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyCode(
  code: string,
  stored: string,
): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  try {
    const expected = Buffer.from(hashHex, "hex");
    if (expected.length === 0) return false;
    const actual = await scryptKey(
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
  const match = /^\/(?:edit|manage|access)\/([A-Za-z0-9]+)/.exec(pathname);
  const slug = match?.[1];
  return slug && slug.length === LIMITS.slugLength ? slug : null;
}
