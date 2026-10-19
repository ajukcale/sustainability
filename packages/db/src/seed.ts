import { hashPassword } from "better-auth/crypto";
import { prisma } from "./index";
import { ROLE_KEYS, SYSTEM_ROLES } from "./roles";

export const DEMO_ADMIN_EMAIL = "admin@demo.local";
export const DEMO_ADMIN_PASSWORD = "DemoAdmin2026!Secure";
export const DEMO_TENANT_NAME = "Demo Firma AŞ";
export const DEMO_TENANT_SLUG = "demo-firma";

/** Seed platform/system role catalog (tenantId = null). Idempotent. */
export async function seedSystemRoles() {
  for (const role of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({
      where: { tenantId: null, key: role.key },
    });
    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: true,
        },
      });
    } else {
      await prisma.role.create({
        data: {
          tenantId: null,
          key: role.key,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: true,
        },
      });
    }
  }
}

/** Copy non-platform system roles into a tenant (for assignment). */
export async function ensureTenantRoles(tenantId: string) {
  for (const role of SYSTEM_ROLES.filter((r) => !r.platformOnly)) {
    const existing = await prisma.role.findFirst({
      where: { tenantId, key: role.key },
    });
    if (!existing) {
      await prisma.role.create({
        data: {
          tenantId,
          key: role.key,
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: true,
        },
      });
    } else {
      await prisma.role.update({
        where: { id: existing.id },
        data: {
          name: role.name,
          description: role.description,
          permissions: role.permissions,
          isSystem: true,
        },
      });
    }
  }
}

/**
 * Demo tenant + company_super_admin for local / Try Live access.
 * Idempotent on email + tenant slug.
 */
export async function seedDemoAdmin() {
  await seedSystemRoles();

  let tenant = await prisma.tenant.findUnique({
    where: { slug: DEMO_TENANT_SLUG },
  });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: DEMO_TENANT_NAME,
        slug: DEMO_TENANT_SLUG,
        status: "active",
      },
    });
  }

  await ensureTenantRoles(tenant.id);

  let company = await prisma.orgUnit.findFirst({
    where: { tenantId: tenant.id, type: "company" },
  });
  if (!company) {
    company = await prisma.orgUnit.create({
      data: {
        tenantId: tenant.id,
        name: DEMO_TENANT_NAME,
        type: "company",
        isActive: true,
      },
    });
  }

  let facility = await prisma.orgUnit.findFirst({
    where: { tenantId: tenant.id, type: "facility", name: "Demo Tesis" },
  });
  if (!facility) {
    facility = await prisma.orgUnit.create({
      data: {
        tenantId: tenant.id,
        parentId: company.id,
        name: "Demo Tesis",
        type: "facility",
        isActive: true,
      },
    });
  }

  const role = await prisma.role.findFirst({
    where: { tenantId: tenant.id, key: ROLE_KEYS.COMPANY_SUPER_ADMIN },
  });
  if (!role) {
    throw new Error("company_super_admin role missing after ensureTenantRoles");
  }

  let user = await prisma.user.findUnique({
    where: { email: DEMO_ADMIN_EMAIL },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Demo Admin",
        email: DEMO_ADMIN_EMAIL,
        emailVerified: true,
        status: "active",
      },
    });
  }

  const hashed = await hashPassword(DEMO_ADMIN_PASSWORD);
  const existingAccount = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: hashed, accountId: user.id },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashed,
      },
    });
  }

  await prisma.userMembership.upsert({
    where: {
      tenantId_userId: { tenantId: tenant.id, userId: user.id },
    },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      roleId: role.id,
      status: "active",
    },
    update: {
      roleId: role.id,
      status: "active",
    },
  });

  return {
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_ADMIN_PASSWORD,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    tenantId: tenant.id,
    userId: user.id,
    facilityName: facility.name,
  };
}
