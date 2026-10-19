import { prisma, type Prisma } from "@sustainability/db";

export type AuditInput = {
  tenantId?: string | null;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function writeAudit(input: AuditInput) {
  return prisma.auditEvent.create({
    data: {
      tenantId: input.tenantId ?? null,
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export const AuditActions = {
  LOGIN: "user.login",
  USER_CREATE: "user.create",
  USER_ROLE_CHANGE: "user.role_change",
  USER_STATUS_CHANGE: "user.status_change",
  INVITE_CREATE: "invite.create",
  INVITE_ACCEPT: "invite.accept",
  TENANT_CREATE: "tenant.create",
  ORG_CREATE: "org.create",
  ORG_UPDATE: "org.update",
  ORG_DEACTIVATE: "org.deactivate",
  ORG_ACTIVATE: "org.activate",
} as const;
