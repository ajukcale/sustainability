import { prisma } from "@sustainability/db";
import { jsonError, jsonOk } from "@/server/http";
import { requireAppUser } from "@/server/auth";

export async function GET() {
  try {
    const app = await requireAppUser();
    const memberships = await prisma.userMembership.findMany({
      where: { userId: app.user.id, status: "active" },
      include: { tenant: true, role: true },
    });
    return jsonOk({
      user: app.user,
      activeTenantId: app.activeTenantId,
      membership: app.membership,
      isPlatformAdmin: app.isPlatformAdmin,
      mfaRequired: process.env.AUTH_MFA_REQUIRED === "true",
      memberships: memberships.map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        roleKey: m.role.key,
        roleName: m.role.name,
      })),
    });
  } catch (e) {
    return jsonError(e);
  }
}
