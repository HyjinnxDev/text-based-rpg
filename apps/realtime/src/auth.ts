import { prisma } from "@tbrpg/db";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
}

/** Verify Better Auth session token against the database */
export async function verifySessionToken(
  token: string | undefined,
): Promise<AuthenticatedUser | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;

  return {
    userId: session.userId,
    email: session.user.email,
    name: session.user.name,
  };
}
