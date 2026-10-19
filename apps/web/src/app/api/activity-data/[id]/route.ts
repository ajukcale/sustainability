import { HttpError, PERMISSIONS } from "@sustainability/auth";
import { jsonError, jsonOk } from "@/server/http";
import { requireAppPermission, requireAppTenant } from "@/server/auth";
import { transitionActivity } from "@/server/activity";
import { ACTIVITY_STATUS } from "@sustainability/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { status?: string };
    if (!body.status) throw new HttpError(400, "status gerekli");

    if (
      body.status === ACTIVITY_STATUS.APPROVED ||
      body.status === ACTIVITY_STATUS.LOCKED
    ) {
      await requireAppPermission(
        body.status === ACTIVITY_STATUS.LOCKED
          ? PERMISSIONS.DATA_LOCK
          : PERMISSIONS.DATA_APPROVE,
      );
    } else {
      await requireAppPermission(PERMISSIONS.DATA_WRITE);
    }

    const ctx = await requireAppTenant();
    const row = await transitionActivity({
      app: ctx,
      id,
      toStatus: body.status,
    });
    return jsonOk({ activityData: row });
  } catch (e) {
    return jsonError(e);
  }
}
