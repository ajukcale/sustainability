import {
  prisma,
  ensureTenantRoles,
  ROLE_KEYS,
  withTenantRls,
} from "@sustainability/db";
import {
  AuditActions,
  writeAudit,
  type AppSession,
  HttpError,
} from "@sustainability/auth";
import { randomBytes } from "node:crypto";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function createTenantWithAdmin(opts: {
  app: AppSession;
  name: string;
  slug?: string;
  /** If true, current user becomes company_super_admin */
  assignCreatorAsAdmin?: boolean;
}) {
  const slugBase = opts.slug?.trim() || slugify(opts.name);
  if (!slugBase) throw new HttpError(400, "Geçersiz firma kodu");

  const existing = await prisma.tenant.findUnique({ where: { slug: slugBase } });
  if (existing) throw new HttpError(409, "Bu firma kodu zaten kullanılıyor");

  const tenant = await prisma.tenant.create({
    data: { name: opts.name.trim(), slug: slugBase, status: "active" },
  });

  await ensureTenantRoles(tenant.id);

  const companyRoot = await prisma.orgUnit.create({
    data: {
      tenantId: tenant.id,
      name: opts.name.trim(),
      type: "company",
      isActive: true,
    },
  });

  if (opts.assignCreatorAsAdmin !== false) {
    const role = await prisma.role.findFirst({
      where: { tenantId: tenant.id, key: ROLE_KEYS.COMPANY_SUPER_ADMIN },
    });
    if (!role) throw new HttpError(500, "Firma rolü bulunamadı");

    await prisma.userMembership.create({
      data: {
        tenantId: tenant.id,
        userId: opts.app.user.id,
        roleId: role.id,
        status: "active",
      },
    });

    const token = (
      await prisma.session.findFirst({
        where: { userId: opts.app.user.id },
        orderBy: { createdAt: "desc" },
      })
    )?.token;

    if (token) {
      await prisma.session.update({
        where: { token },
        data: { activeTenantId: tenant.id },
      });
    }
  }

  await writeAudit({
    tenantId: tenant.id,
    actorId: opts.app.user.id,
    action: AuditActions.TENANT_CREATE,
    entityType: "tenant",
    entityId: tenant.id,
    metadata: { name: tenant.name, slug: tenant.slug, rootOrgUnitId: companyRoot.id },
  });

  return { tenant, companyRoot };
}

export async function listOrgTree(tenantId: string) {
  return withTenantRls(prisma, tenantId, async (tx) =>
    tx.orgUnit.findMany({
      where: { tenantId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
  );
}

export async function createOrgUnit(opts: {
  tenantId: string;
  actorId: string;
  name: string;
  type: "company" | "facility" | "line" | "unit";
  parentId?: string | null;
}) {
  return withTenantRls(prisma, opts.tenantId, async (tx) => {
    if (opts.parentId) {
      const parent = await tx.orgUnit.findFirst({
        where: { id: opts.parentId, tenantId: opts.tenantId },
      });
      if (!parent) throw new HttpError(404, "Üst birim bulunamadı");
    }

    const unit = await tx.orgUnit.create({
      data: {
        tenantId: opts.tenantId,
        parentId: opts.parentId ?? null,
        name: opts.name.trim(),
        type: opts.type,
        isActive: true,
      },
    });

    await tx.auditEvent.create({
      data: {
        tenantId: opts.tenantId,
        actorId: opts.actorId,
        action: AuditActions.ORG_CREATE,
        entityType: "org_unit",
        entityId: unit.id,
        metadata: { name: unit.name, type: unit.type, parentId: unit.parentId },
      },
    });

    return unit;
  });
}

export async function updateOrgUnit(opts: {
  tenantId: string;
  actorId: string;
  id: string;
  name?: string;
  isActive?: boolean;
}) {
  return withTenantRls(prisma, opts.tenantId, async (tx) => {
    const existing = await tx.orgUnit.findFirst({
      where: { id: opts.id, tenantId: opts.tenantId },
    });
    if (!existing) throw new HttpError(404, "Organizasyon birimi bulunamadı");

    const data: {
      name?: string;
      previousName?: string;
      isActive?: boolean;
      deactivatedAt?: Date | null;
    } = {};

    if (opts.name && opts.name.trim() !== existing.name) {
      data.previousName = existing.name;
      data.name = opts.name.trim();
    }
    if (typeof opts.isActive === "boolean") {
      data.isActive = opts.isActive;
      data.deactivatedAt = opts.isActive ? null : new Date();
    }

    const updated = await tx.orgUnit.update({
      where: { id: existing.id },
      data,
    });

    await tx.auditEvent.create({
      data: {
        tenantId: opts.tenantId,
        actorId: opts.actorId,
        action:
          typeof opts.isActive === "boolean"
            ? opts.isActive
              ? AuditActions.ORG_ACTIVATE
              : AuditActions.ORG_DEACTIVATE
            : AuditActions.ORG_UPDATE,
        entityType: "org_unit",
        entityId: updated.id,
        metadata: { ...data },
      },
    });

    return updated;
  });
}

/** Negative isolation helper used by tests — fetch org by id under RLS tenant. */
export async function getOrgUnitUnderTenant(tenantId: string, orgUnitId: string) {
  return withTenantRls(prisma, tenantId, async (tx) =>
    tx.orgUnit.findFirst({ where: { id: orgUnitId } }),
  );
}

export function newInviteToken() {
  return randomBytes(24).toString("hex");
}
