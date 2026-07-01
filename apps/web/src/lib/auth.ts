import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@tbrpg/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "PLAYER",
        input: false,
      },
    },
  },
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "dev-only-auth-secret-not-for-production"),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session;
