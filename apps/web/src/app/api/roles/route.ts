import { PERMISSIONS } from "@sustainability/auth";
import { prisma } from "@sustainability/db";
import { jsonError, jsonOk } from "@/server/http";
import { requireAppPermission, requireAppTenant } from "@/server/auth";

export async function GET() {
  try {
    await requireAppPermission(PERMISSIONS.USER_READ);
    const ctx = await requireAppTenant();
    const roles = await prisma.role.findMany({
      where: { tenantId: ctx.activeTenantId },
      orderBy: { name: "asc" },
    });
    return jsonOk({ roles });
  } catch (e) {
    return jsonError(e);
  }
}
