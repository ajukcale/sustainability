import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./index";
import { withTenantRls } from "./rls";
import { ensureTenantRoles, seedSystemRoles } from "./seed";

describe("Phase 2 activity_data tenant isolation", () => {
  let tenantA: string;
  let tenantB: string;
  let orgA: string;
  let activityB: string;

  beforeAll(async () => {
    await seedSystemRoles();
    const a = await prisma.tenant.create({
      data: { name: "Data A", slug: `data-a-${Date.now()}`, status: "active" },
    });
    const b = await prisma.tenant.create({
      data: { name: "Data B", slug: `data-b-${Date.now()}`, status: "active" },
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

    const rowB = await prisma.activityData.create({
      data: {
        tenantId: tenantB,
        orgUnitId: unitB.id,
        category: "energy",
        periodKey: "2026-01",
        quantity: 500,
        unit: "kWh",
        contentHash: `b-${Date.now()}`,
        status: "draft",
        source: "manual",
      },
    });
    activityB = rowB.id;
  });

  afterAll(async () => {
    const ids = [tenantA, tenantB].filter(Boolean);
    if (ids.length) {
      await prisma.activityRevision.deleteMany({
        where: { tenantId: { in: ids } },
      });
      await prisma.evidenceFile.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.activityData.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.periodLock.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.importJob.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.orgUnit.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.role.deleteMany({ where: { tenantId: { in: ids } } });
      await prisma.tenant.deleteMany({ where: { id: { in: ids } } });
    }
    await prisma.$disconnect();
  });

  it("Tenant A cannot read Tenant B activity by ID under RLS", async () => {
    const leaked = await withTenantRls(prisma, tenantA, async (tx) =>
      tx.activityData.findFirst({ where: { id: activityB } }),
    );
    expect(leaked).toBeNull();
  });

  it("Tenant A can write own activity under RLS", async () => {
    const created = await withTenantRls(prisma, tenantA, async (tx) =>
      tx.activityData.create({
        data: {
          tenantId: tenantA,
          orgUnitId: orgA,
          category: "energy",
          periodKey: "2026-02",
          quantity: 100,
          unit: "kWh",
          contentHash: `a-${Date.now()}`,
          status: "draft",
          source: "manual",
        },
      }),
    );
    expect(created.tenantId).toBe(tenantA);
  });
});
