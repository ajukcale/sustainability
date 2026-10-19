import { HttpError, PERMISSIONS, assertOrgAccess } from "@sustainability/auth";
import { jsonError, jsonOk } from "@/server/http";
import { createOrgUnit, listOrgTree } from "@/server/tenants";
import { requireAppPermission, requireAppTenant } from "@/server/auth";

export async function GET() {
  try {
    const app = await requireAppPermission(PERMISSIONS.ORG_READ);
    const ctx = await requireAppTenant();
    const units = await listOrgTree(ctx.activeTenantId);

    if (ctx.membership.orgUnitIds.length > 0) {
      const allowed = new Set(ctx.membership.orgUnitIds);
      const filtered = units.filter(
        (u) =>
          allowed.has(u.id) ||
          (u.parentId ? allowed.has(u.parentId) : false) ||
          units.some(
            (a) =>
              allowed.has(a.id) &&
              (u.id === a.id ||
                u.parentId === a.id ||
                isDescendant(units, a.id, u.id)),
          ),
      );
      return jsonOk({ orgUnits: filtered });
    }

    return jsonOk({ orgUnits: units, actor: app.user.email });
  } catch (e) {
    return jsonError(e);
  }
}

function isDescendant(
  units: { id: string; parentId: string | null }[],
  ancestorId: string,
  nodeId: string,
): boolean {
  let current = units.find((u) => u.id === nodeId);
  while (current?.parentId) {
    if (current.parentId === ancestorId) return true;
    current = units.find((u) => u.id === current!.parentId);
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const app = await requireAppPermission(PERMISSIONS.ORG_MANAGE);
    const ctx = await requireAppTenant();
    const body = (await req.json()) as {
      name?: string;
      type?: "company" | "facility" | "line" | "unit";
      parentId?: string | null;
    };

    if (!body.name?.trim()) throw new HttpError(400, "Ad gerekli");
    const type = body.type ?? "unit";
    if (!["company", "facility", "line", "unit"].includes(type)) {
      throw new HttpError(400, "Geçersiz tip");
    }
    if (body.parentId) {
      await assertOrgAccess(ctx, body.parentId);
    }

    const unit = await createOrgUnit({
      tenantId: ctx.activeTenantId,
      actorId: app.user.id,
      name: body.name,
      type,
      parentId: body.parentId,
    });
    return jsonOk({ orgUnit: unit }, 201);
  } catch (e) {
    return jsonError(e);
  }
}
