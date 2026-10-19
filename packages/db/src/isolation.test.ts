import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./index";
import { withTenantRls } from "./rls";
import { ensureTenantRoles, seedSystemRoles } from "./seed";
import { ROLE_KEYS } from "./roles";

describe("negative tenant isolation", () => {
  let tenantA: string;
  let tenantB: string;
  let orgA: string;
  let orgB: string;

  beforeAll(async () => {
    await seedSystemRoles();

    const a = await prisma.tenant.create({
      data: { name: "Firma A", slug: `firma-a-${Date.now()}`, status: "active" },
    });
    const b = await prisma.tenant.create({
      data: { name: "Firma B", slug: `firma-b-${Date.now()}`, status: "active" },
    });
    tenantA = a.id;
    tenantB = b.id;

    await ensureTenantRoles(tenantA);
    await ensureTenantRoles(tenantB);

    const unitA = await prisma.orgUnit.create({
      data: {
        tenantId: tenantA,
        name: "A Tesis",
        type: "facility",
        isActive: true,
      },
    });
    const unitB = await prisma.orgUnit.create({
      data: {
        tenantId: tenantB,
        name: "B Tesis",
        type: "facility",
        isActive: true,
      },
    });
    orgA = unitA.id;
    orgB = unitB.id;
  });

  afterAll(async () => {
    const ids = [tenantA, tenantB].filter(Boolean);
    if (ids.length > 0) {
      await prisma.userMembership.deleteMany({
        where: { tenantId: { in: ids } },
      });
      await prisma.membershipOrgScope.deleteMany({
        where: { tenantId: { in: ids } },
      });
      await prisma.invite.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.auditEvent.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.orgUnit.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.role.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it("Tenant A RLS context cannot read Tenant B org unit by ID", async () => {
    const leaked = await withTenantRls(prisma, tenantA, async (tx) =>
      tx.orgUnit.findFirst({ where: { id: orgB } }),
    );
    expect(leaked).toBeNull();

    const own = await withTenantRls(prisma, tenantA, async (tx) =>
      tx.orgUnit.findFirst({ where: { id: orgA } }),
    );
    expect(own?.id).toBe(orgA);
  });

  it("Tenant A RLS context cannot update Tenant B org unit", async () => {
    await expect(
      withTenantRls(prisma, tenantA, async (tx) =>
        tx.orgUnit.update({
          where: { id: orgB },
          data: { name: "Hacked" },
        }),
      ),
    ).rejects.toThrow();

    const stillB = await prisma.orgUnit.findUnique({ where: { id: orgB } });
    expect(stillB?.name).toBe("B Tesis");
  });

  it("Tenant A RLS context cannot delete Tenant B org unit", async () => {
    await expect(
      withTenantRls(prisma, tenantA, async (tx) =>
        tx.orgUnit.delete({ where: { id: orgB } }),
      ),
    ).rejects.toThrow();

    const stillB = await prisma.orgUnit.findUnique({ where: { id: orgB } });
    expect(stillB).not.toBeNull();
  });

  it("membership lookup under Tenant A does not return Tenant B rows", async () => {
    const roleA = await prisma.role.findFirst({
      where: { tenantId: tenantA, key: ROLE_KEYS.VIEWER },
    });
    const roleB = await prisma.role.findFirst({
      where: { tenantId: tenantB, key: ROLE_KEYS.VIEWER },
    });
    expect(roleA && roleB).toBeTruthy();

    const user = await prisma.user.create({
      data: {
        name: "Isolation User",
        email: `iso-${Date.now()}@example.com`,
        emailVerified: true,
      },
    });

    await prisma.userMembership.create({
      data: {
        tenantId: tenantB,
        userId: user.id,
        roleId: roleB!.id,
        status: "active",
      },
    });

    const underA = await withTenantRls(prisma, tenantA, async (tx) =>
      tx.userMembership.findMany({ where: { userId: user.id } }),
    );
    expect(underA).toHaveLength(0);

    await prisma.userMembership.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
