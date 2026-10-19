import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@sustainability/db";
import { writeAudit, AuditActions } from "./audit";

const baseURL =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-change-me-phase1-secret",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      status: {
        type: "string",
        required: false,
        defaultValue: "active",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    additionalFields: {
      activeTenantId: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          await writeAudit({
            actorId: session.userId,
            tenantId:
              (session as { activeTenantId?: string | null }).activeTenantId ??
              null,
            action: AuditActions.LOGIN,
            entityType: "session",
            entityId: session.id,
          });
        },
      },
    },
  },
});

export type Auth = typeof auth;
