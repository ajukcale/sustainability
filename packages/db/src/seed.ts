import { prisma } from "./index";
import { SYSTEM_ROLES } from "./roles";

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
    }
  }
}
