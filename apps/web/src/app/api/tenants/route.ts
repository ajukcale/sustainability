import {
  HttpError,
  PERMISSIONS,
  hasPermission,
  setActiveTenant,
} from "@sustainability/auth";
import { prisma } from "@sustainability/db";
import { jsonError, jsonOk } from "@/server/http";
import { createTenantWithAdmin } from "@/server/tenants";
import { getAppAuthSession, requireAppUser } from "@/server/auth";

export async function GET() {
  try {
    const app = await requireAppUser();
    const memberships = await prisma.userMembership.findMany({
      where: { userId: app.user.id, status: "active" },
      include: { tenant: true },
    });
    return jsonOk({
      tenants: memberships.map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        status: m.tenant.status,
      })),
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const app = await requireAppUser();
    const body = (await req.json()) as { name?: string; slug?: string };

    const existingMemberships = await prisma.userMembership.count({
      where: { userId: app.user.id },
    });
    const canCreate =
      hasPermission(app, PERMISSIONS.TENANT_CREATE) ||
      existingMemberships === 0 ||
      app.isPlatformAdmin;

    if (!canCreate) {
      throw new HttpError(403, "Yetkisiz");
    }
    if (!body.name?.trim()) {
      throw new HttpError(400, "Firma adı gerekli");
    }

    const result = await createTenantWithAdmin({
      app,
      name: body.name,
      slug: body.slug,
      assignCreatorAsAdmin: true,
    });

    const session = await getAppAuthSession();
    if (session?.session?.token) {
      await setActiveTenant(session.session.token, result.tenant.id);
    }

    return jsonOk(result, 201);
  } catch (e) {
    return jsonError(e);
  }
}
