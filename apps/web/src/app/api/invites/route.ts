import { HttpError, PERMISSIONS } from "@sustainability/auth";
import { prisma, withTenantRls } from "@sustainability/db";
import { jsonError, jsonOk } from "@/server/http";
import { createInvite } from "@/server/invites";
import { requireAppPermission, requireAppTenant } from "@/server/auth";

export async function GET() {
  try {
    await requireAppPermission(PERMISSIONS.USER_READ);
    const ctx = await requireAppTenant();
    const invites = await withTenantRls(prisma, ctx.activeTenantId, async (tx) =>
      tx.invite.findMany({
        where: { tenantId: ctx.activeTenantId, acceptedAt: null },
        include: { role: true },
        orderBy: { createdAt: "desc" },
      }),
    );
    return jsonOk({ invites });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAppPermission(PERMISSIONS.USER_INVITE);
    const ctx = await requireAppTenant();
    const body = (await req.json()) as {
      email?: string;
      roleId?: string;
      orgUnitIds?: string[];
    };
    if (!body.email || !body.roleId) {
      throw new HttpError(400, "email ve roleId gerekli");
    }
    const result = await createInvite({
      app: ctx,
      email: body.email,
      roleId: body.roleId,
      orgUnitIds: body.orgUnitIds,
    });
    return jsonOk(result, 201);
  } catch (e) {
    return jsonError(e);
  }
}
