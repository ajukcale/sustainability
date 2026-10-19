import { prisma, withTenantRls } from "@sustainability/db";
import {
  AuditActions,
  writeAudit,
  HttpError,
  type AppSession,
} from "@sustainability/auth";
import { hashPassword } from "better-auth/crypto";
import { newInviteToken } from "./tenants";

export async function createInvite(opts: {
  app: AppSession & { activeTenantId: string };
  email: string;
  roleId: string;
  orgUnitIds?: string[];
}) {
  const email = opts.email.trim().toLowerCase();
  if (!email.includes("@")) throw new HttpError(400, "Geçersiz e-posta");

  const role = await prisma.role.findFirst({
    where: { id: opts.roleId, tenantId: opts.app.activeTenantId },
  });
  if (!role) throw new HttpError(400, "Rol bulunamadı");

  const token = newInviteToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  const invite = await withTenantRls(prisma, opts.app.activeTenantId, async (tx) =>
    tx.invite.create({
      data: {
        tenantId: opts.app.activeTenantId,
        email,
        roleId: role.id,
        token,
        orgUnitIds: opts.orgUnitIds ?? [],
        invitedById: opts.app.user.id,
        expiresAt,
      },
    }),
  );

  await writeAudit({
    tenantId: opts.app.activeTenantId,
    actorId: opts.app.user.id,
    action: AuditActions.INVITE_CREATE,
    entityType: "invite",
    entityId: invite.id,
    metadata: { email, roleKey: role.key },
  });

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/davet/${token}`;

  if (!process.env.SMTP_HOST) {
    console.info("[dev-mail] Davet e-postası (SMTP yok):", {
      to: email,
      acceptUrl,
      expiresAt: expiresAt.toISOString(),
    });
  }

  return { invite, acceptUrl, emailLogged: !process.env.SMTP_HOST };
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { tenant: true, role: true },
  });
  if (!invite) throw new HttpError(404, "Davet bulunamadı");
  if (invite.acceptedAt) throw new HttpError(409, "Davet zaten kabul edilmiş");
  if (invite.expiresAt.getTime() < Date.now()) {
    throw new HttpError(410, "Davetin süresi dolmuş");
  }
  return invite;
}

export async function acceptInvite(opts: {
  token: string;
  name: string;
  password: string;
}) {
  const invite = await getInviteByToken(opts.token);
  if (opts.password.length < 8) {
    throw new HttpError(400, "Parola en az 8 karakter olmalı");
  }

  const existing = await prisma.user.findUnique({
    where: { email: invite.email },
  });

  let userId: string;
  if (existing) {
    userId = existing.id;
  } else {
    const hashed = await hashPassword(opts.password);
    const user = await prisma.user.create({
      data: {
        name: opts.name.trim(),
        email: invite.email,
        emailVerified: true,
        status: "active",
      },
    });
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashed,
      },
    });
    userId = user.id;

    await writeAudit({
      tenantId: invite.tenantId,
      actorId: userId,
      action: AuditActions.USER_CREATE,
      entityType: "user",
      entityId: userId,
      metadata: { via: "invite", email: invite.email },
    });
  }

  const membership = await prisma.userMembership.upsert({
    where: {
      tenantId_userId: { tenantId: invite.tenantId, userId },
    },
    create: {
      tenantId: invite.tenantId,
      userId,
      roleId: invite.roleId,
      status: "active",
    },
    update: {
      roleId: invite.roleId,
      status: "active",
    },
  });

  if (invite.orgUnitIds.length > 0) {
    await prisma.membershipOrgScope.deleteMany({
      where: { membershipId: membership.id },
    });
    await prisma.membershipOrgScope.createMany({
      data: invite.orgUnitIds.map((orgUnitId) => ({
        membershipId: membership.id,
        orgUnitId,
        tenantId: invite.tenantId,
      })),
    });
  }

  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await writeAudit({
    tenantId: invite.tenantId,
    actorId: userId,
    action: AuditActions.INVITE_ACCEPT,
    entityType: "invite",
    entityId: invite.id,
    metadata: { email: invite.email },
  });

  return { userId, tenantId: invite.tenantId, email: invite.email };
}
