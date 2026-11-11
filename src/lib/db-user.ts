import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Safely resolves an authenticated session user to an existing database UUID in `users`,
 * returning `null` if no backing row exists (preventing foreign-key failures on quick-login sessions
 * before database seeding).
 */
export async function resolveDbUserId(sessionUser: {
  id: string;
  email?: string | null;
}): Promise<string | null> {
  const [byId] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);

  if (byId) return byId.id;

  if (sessionUser.email) {
    const [byEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, sessionUser.email.toLowerCase()))
      .limit(1);

    if (byEmail) return byEmail.id;
  }

  return null;
}

