import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  canEditPhenomena,
  signSessionToken,
  verifySessionToken,
  type SessionUser,
} from "./session-token";

export {
  SESSION_COOKIE_NAME,
  canEditPhenomena,
  signSessionToken,
  verifySessionToken,
  type SessionUser,
};

export async function getCurrentSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}
