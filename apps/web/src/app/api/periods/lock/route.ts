import { HttpError, PERMISSIONS } from "@sustainability/auth";
import { jsonError, jsonOk } from "@/server/http";
import { requireAppPermission, requireAppTenant } from "@/server/auth";
import { lockPeriod } from "@/server/activity";

export async function POST(req: Request) {
  try {
    await requireAppPermission(PERMISSIONS.DATA_LOCK);
    const ctx = await requireAppTenant();
    const body = (await req.json()) as {
      periodKey?: string;
      category?: string;
      reason?: string;
    };
    if (!body.periodKey) throw new HttpError(400, "periodKey gerekli");
    const lock = await lockPeriod({
      app: ctx,
      periodKey: body.periodKey,
      category: body.category,
      reason: body.reason,
    });
    return jsonOk({ periodLock: lock }, 201);
  } catch (e) {
    return jsonError(e);
  }
}
