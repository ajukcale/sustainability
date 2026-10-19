import { PERMISSIONS } from "@sustainability/auth";
import { requireAppPermission } from "@/server/auth";
import { CSV_TEMPLATE } from "@/server/activity";
import { jsonError } from "@/server/http";

export async function GET() {
  try {
    await requireAppPermission(PERMISSIONS.DATA_READ);
    return new Response(CSV_TEMPLATE, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="aktivite-sablon.csv"',
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
