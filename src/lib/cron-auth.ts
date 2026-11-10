import crypto from "node:crypto";
import { canEditPhenomena, getCurrentSessionUser } from "./auth";

export async function authorizeCronOrOperator(request: Request): Promise<{
  authorized: boolean;
  reason?: string;
}> {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET?.trim();

  if (authHeader) {
    if (!expectedSecret || expectedSecret.length < 16) {
      return {
        authorized: false,
        reason: "CRON_SECRET belum dikonfigurasi pada server.",
      };
    }
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const suppliedToken = match?.[1]?.trim();
    if (suppliedToken) {
      const expectedBuf = Buffer.from(expectedSecret);
      const suppliedBuf = Buffer.from(suppliedToken);
      if (
        expectedBuf.length === suppliedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, suppliedBuf)
      ) {
        return { authorized: true };
      }
    }
    return { authorized: false, reason: "Token Cron tidak valid." };
  }

  const user = await getCurrentSessionUser();
  if (!user) {
    return {
      authorized: false,
      reason: "Unauthorized: Membutuhkan CRON_SECRET atau sesi analis aktif.",
    };
  }
  if (!canEditPhenomena(user)) {
    return {
      authorized: false,
      reason: "Forbidden: Akun Viewer tidak dapat menjalankan pipeline scraper/AI.",
    };
  }

  return { authorized: true };
}

