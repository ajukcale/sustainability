import { HttpError, setActiveTenant } from "@sustainability/auth";
import { prisma } from "@sustainability/db";
import { jsonError, jsonOk } from "@/server/http";
import { getAppAuthSession, requireAppUser } from "@/server/auth";

export async function POST(req: Request) {
  try {
    const app = await requireAppUser();
    const body = (await req.json()) as { tenantId?: string };
    if (!body.tenantId) throw new HttpError(400, "tenantId gerekli");

    const membership = await prisma.userMembership.findUnique({
      where: {
        tenantId_userId: { tenantId: body.tenantId, userId: app.user.id },
      },
    });
    if (!membership || membership.status !== "active") {
      throw new HttpError(403, "Bu firmaya erişiminiz yok");
    }

    const session = await getAppAuthSession();
    if (!session?.session?.token) throw new HttpError(401, "Oturum gerekli");

    await setActiveTenant(session.session.token, body.tenantId);
    return jsonOk({ activeTenantId: body.tenantId });
  } catch (e) {
    return jsonError(e);
  }
}
