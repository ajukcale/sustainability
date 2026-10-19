import {
  prisma,
  withTenantRls,
  type Permission,
  PERMISSIONS,
  ROLE_KEYS,
} from "@sustainability/db";
import { auth } from "./auth";

export type AppMembership = {
  id: string;
  tenantId: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
  orgUnitIds: string[];
  status: string;
};

export type AppSession = {
  user: { id: string; email: string; name: string; status: string };
  sessionId: string;
  sessionToken: string;
  activeTenantId: string | null;
  membership: AppMembership | null;
  isPlatformAdmin: boolean;
};

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getAuthSession(requestHeaders: Headers) {
  return auth.api.getSession({ headers: requestHeaders });
}

export async function requireUser(requestHeaders: Headers): Promise<AppSession> {
  const session = await getAuthSession(requestHeaders);
  if (!session?.user) {
    throw new HttpError(401, "Oturum gerekli");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user || user.status !== "active") {
    throw new HttpError(403, "Hesap aktif değil");
  }

  const activeTenantId =
    (session.session as { activeTenantId?: string | null }).activeTenantId ??
    null;

  let membership: AppMembership | null = null;
  if (activeTenantId) {
    const m = await prisma.userMembership.findUnique({
      where: {
        tenantId_userId: { tenantId: activeTenantId, userId: user.id },
      },
      include: {
        role: true,
        orgScopes: true,
      },
    });
    if (m && m.status === "active") {
      membership = {
        id: m.id,
        tenantId: m.tenantId,
        roleId: m.roleId,
        roleKey: m.role.key,
        roleName: m.role.name,
        permissions: m.role.permissions,
        orgUnitIds: m.orgScopes.map((s) => s.orgUnitId),
        status: m.status,
      };
    }
  }

  const platformMembership = await prisma.userMembership.findFirst({
    where: {
      userId: user.id,
      status: "active",
      role: { key: ROLE_KEYS.PLATFORM_SUPER_ADMIN },
    },
  });

  const isPlatformAdmin =
    !!platformMembership ||
    membership?.roleKey === ROLE_KEYS.PLATFORM_SUPER_ADMIN;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
    },
    sessionId: session.session.id,
    sessionToken: session.session.token,
    activeTenantId,
    membership,
    isPlatformAdmin,
  };
}

export function hasPermission(
  app: AppSession,
  permission: Permission,
): boolean {
  if (app.isPlatformAdmin && permission === PERMISSIONS.TENANT_CREATE) {
    return true;
  }
  return !!app.membership?.permissions.includes(permission);
}

export async function requirePermission(
  requestHeaders: Headers,
  permission: Permission,
): Promise<AppSession> {
  const app = await requireUser(requestHeaders);
  if (!hasPermission(app, permission)) {
    throw new HttpError(403, "Yetkisiz");
  }
  return app;
}

export async function requireTenantContext(
  requestHeaders: Headers,
): Promise<AppSession & { activeTenantId: string; membership: AppMembership }> {
  const app = await requireUser(requestHeaders);
  if (!app.activeTenantId || !app.membership) {
    throw new HttpError(403, "Aktif firma (tenant) seçilmedi");
  }
  return app as AppSession & {
    activeTenantId: string;
    membership: AppMembership;
  };
}

/** Org data-level check: empty scope = whole tenant; else unit or ancestor must match. */
export async function assertOrgAccess(
  app: AppSession & { activeTenantId: string; membership: AppMembership },
  orgUnitId: string,
): Promise<void> {
  if (app.membership.orgUnitIds.length === 0) return;

  const allowed = new Set(app.membership.orgUnitIds);
  if (allowed.has(orgUnitId)) return;

  const unit = await withTenantRls(prisma, app.activeTenantId, async (tx) =>
    tx.orgUnit.findFirst({
      where: { id: orgUnitId, tenantId: app.activeTenantId },
    }),
  );
  if (!unit) {
    throw new HttpError(404, "Organizasyon birimi bulunamadı");
  }

  let current: typeof unit | null = unit;
  while (current?.parentId) {
    if (allowed.has(current.parentId)) return;
    current = await withTenantRls(prisma, app.activeTenantId, async (tx) =>
      tx.orgUnit.findFirst({
        where: { id: current!.parentId!, tenantId: app.activeTenantId },
      }),
    );
  }

  throw new HttpError(403, "Organizasyon kapsamı dışında");
}

export async function setActiveTenant(
  sessionToken: string,
  tenantId: string | null,
) {
  await prisma.session.update({
    where: { token: sessionToken },
    data: { activeTenantId: tenantId },
  });
}
