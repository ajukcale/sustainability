import { PERMISSIONS } from "@sustainability/auth";
import { prisma, withTenantRls } from "@sustainability/db";
import { jsonError, jsonOk } from "@/server/http";
import { requireAppPermission, requireAppTenant } from "@/server/auth";

export async function GET() {
  try {
    await requireAppPermission(PERMISSIONS.USER_READ);
    const ctx = await requireAppTenant();
    const memberships = await withTenantRls(prisma, ctx.activeTenantId, async (tx) =>
      tx.userMembership.findMany({
        where: { tenantId: ctx.activeTenantId },
        include: {
          user: true,
          role: true,
          orgScopes: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    );

    return jsonOk({
      users: memberships.map((m) => ({
        membershipId: m.id,
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        status: m.status,
        roleId: m.roleId,
        roleKey: m.role.key,
        roleName: m.role.name,
        orgUnitIds: m.orgScopes.map((s) => s.orgUnitId),
      })),
    });
  } catch (e) {
    return jsonError(e);
  }
}
