import { HttpError, PERMISSIONS } from "@sustainability/auth";
import { jsonError, jsonOk } from "@/server/http";
import { requireAppPermission, requireAppTenant } from "@/server/auth";
import {
  importValidatedRows,
  parseActivityCsv,
} from "@/server/activity";

export async function POST(req: Request) {
  try {
    await requireAppPermission(PERMISSIONS.DATA_IMPORT);
    const ctx = await requireAppTenant();
    const form = await req.formData();
    const file = form.get("file");
    const dryRun = form.get("dryRun") === "true";

    if (!(file instanceof File)) {
      throw new HttpError(400, "file gerekli (CSV)");
    }

    const text = await file.text();
    const parsed = parseActivityCsv(text);

    if (dryRun || parsed.rows.length === 0) {
      return jsonOk({
        dryRun: true,
        validRows: parsed.rows.length,
        errorRows: parsed.errors.length,
        errors: parsed.errors,
        preview: parsed.rows.slice(0, 20),
      });
    }

    const job = await importValidatedRows({
      app: ctx,
      fileName: file.name,
      rows: parsed.rows,
      preErrors: parsed.errors,
    });

    return jsonOk({ importJob: job }, 201);
  } catch (e) {
    return jsonError(e);
  }
}
