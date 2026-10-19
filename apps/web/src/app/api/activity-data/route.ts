import { HttpError, PERMISSIONS, assertOrgAccess } from "@sustainability/auth";
import { jsonError, jsonOk } from "@/server/http";
import {
  requireAppPermission,
  requireAppTenant,
} from "@/server/auth";
import { createActivityManual, listActivityData } from "@/server/activity";

export async function GET(req: Request) {
  try {
    await requireAppPermission(PERMISSIONS.DATA_READ);
    const ctx = await requireAppTenant();
    const url = new URL(req.url);
    const rows = await listActivityData(ctx.activeTenantId, {
      category: url.searchParams.get("category") ?? undefined,
      periodKey: url.searchParams.get("periodKey") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return jsonOk({ activityData: rows });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAppPermission(PERMISSIONS.DATA_WRITE);
    const ctx = await requireAppTenant();
    const body = (await req.json()) as {
      orgUnitId?: string;
      category?: string;
      periodKey?: string;
      quantity?: number;
      unit?: string;
      recordType?: string;
      notes?: string;
      attributes?: Record<string, unknown>;
    };

    if (!body.orgUnitId || !body.category || !body.periodKey || !body.unit) {
      throw new HttpError(400, "orgUnitId, category, periodKey, unit gerekli");
    }
    await assertOrgAccess(ctx, body.orgUnitId);

    const row = await createActivityManual({
      app: ctx,
      orgUnitId: body.orgUnitId,
      category: body.category,
      periodKey: body.periodKey,
      quantity: Number(body.quantity),
      unit: body.unit,
      recordType: body.recordType,
      notes: body.notes,
      attributes: body.attributes,
    });
    return jsonOk({ activityData: row }, 201);
  } catch (e) {
    return jsonError(e);
  }
}
