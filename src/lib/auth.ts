import "server-only";
import { cookies } from "next/headers";
import { manageCookieName, verifyManageToken } from "./token";

export {
  generateManageCode,
  generateSlug,
  hashCode,
  manageCookieName,
  signManageToken,
  verifyCode,
} from "./token";

export async function hasManageSession(slug: string): Promise<boolean> {
  const store = await cookies();
  return verifyManageToken(store.get(manageCookieName(slug))?.value, slug);
}
