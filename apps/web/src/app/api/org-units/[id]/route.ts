import { HttpError, PERMISSIONS, assertOrgAccess } from "@sustainability/auth";
import { jsonError, jsonOk } from "@/server/http";
import { getOrgUnitUnderTenant, updateOrgUnit } from "@/server/tenants";
import { requireAppPermission, requireAppTenant } from "@/server/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requireAppPermission(PERMISSIONS.ORG_READ);
    const ctx = await requireAppTenant();
    const { id } = await params;

    const unit = await getOrgUnitUnderTenant(ctx.activeTenantId, id);
    if (!unit) throw new HttpError(404, "Organizasyon birimi bulunamadı");
    await assertOrgAccess(ctx, id);
    return jsonOk({ orgUnit: unit });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const app = await requireAppPermission(PERMISSIONS.ORG_MANAGE);
    const ctx = await requireAppTenant();
    const { id } = await params;
    await assertOrgAccess(ctx, id);

    const body = (await req.json()) as { name?: string; isActive?: boolean };
    const unit = await updateOrgUnit({
      tenantId: ctx.activeTenantId,
      actorId: app.user.id,
      id,
      name: body.name,
      isActive: body.isActive,
    });
    return jsonOk({ orgUnit: unit });
  } catch (e) {
    return jsonError(e);
  }
}
