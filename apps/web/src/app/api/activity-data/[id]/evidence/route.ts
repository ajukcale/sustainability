import { HttpError, PERMISSIONS } from "@sustainability/auth";
import { jsonError, jsonOk } from "@/server/http";
import { requireAppPermission, requireAppTenant } from "@/server/auth";
import { attachEvidence } from "@/server/activity";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    await requireAppPermission(PERMISSIONS.DATA_WRITE);
    const ctx = await requireAppTenant();
    const { id } = await params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new HttpError(400, "file gerekli");
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024) {
      throw new HttpError(400, "Dosya en fazla 5MB");
    }

    const evidence = await attachEvidence({
      app: ctx,
      activityDataId: id,
      fileName: file.name,
      mimeType: file.type || undefined,
      bytes,
    });
    return jsonOk({ evidence }, 201);
  } catch (e) {
    return jsonError(e);
  }
}
