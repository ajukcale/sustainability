import {
  AuditActions,
  HttpError,
  PERMISSIONS,
  hasPermission,
  writeAudit,
} from "@sustainability/auth";
import { prisma, withTenantRls, ROLE_KEYS } from "@sustainability/db";
import { jsonError, jsonOk } from "@/server/http";
import { requireAppPermission, requireAppTenant } from "@/server/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  try {
    const app = await requireAppPermission(PERMISSIONS.USER_MANAGE);
    const ctx = await requireAppTenant();
    const { id: userId } = await params;
    const body = (await req.json()) as {
      roleId?: string;
      status?: string;
      orgUnitIds?: string[];
    };

    if (body.roleId && !hasPermission(app, PERMISSIONS.ROLE_ASSIGN)) {
      throw new HttpError(403, "Rol atama yetkisi yok");
    }

    const result = await withTenantRls(prisma, ctx.activeTenantId, async (tx) => {
      const membership = await tx.userMembership.findUnique({
        where: {
          tenantId_userId: { tenantId: ctx.activeTenantId, userId },
        },
        include: { role: true },
      });
      if (!membership) throw new HttpError(404, "Kullanıcı bulunamadı");

      let roleId = membership.roleId;
      if (body.roleId) {
        const role = await tx.role.findFirst({
          where: { id: body.roleId, tenantId: ctx.activeTenantId },
        });
        if (!role) throw new HttpError(400, "Rol bulunamadı");
        if (role.key === ROLE_KEYS.PLATFORM_SUPER_ADMIN) {
          throw new HttpError(400, "Platform rolü atanamaz");
        }
        roleId = role.id;
      }

      if (
        body.status &&
        !["active", "suspended", "deactivated"].includes(body.status)
      ) {
        throw new HttpError(400, "Geçersiz durum");
      }
      const status = body.status ?? membership.status;

      const updated = await tx.userMembership.update({
        where: { id: membership.id },
        data: { roleId, status },
        include: { role: true, user: true },
      });

      if (body.orgUnitIds) {
        await tx.membershipOrgScope.deleteMany({
          where: { membershipId: membership.id },
        });
        if (body.orgUnitIds.length > 0) {
          await tx.membershipOrgScope.createMany({
            data: body.orgUnitIds.map((orgUnitId) => ({
              membershipId: membership.id,
              orgUnitId,
              tenantId: ctx.activeTenantId,
            })),
          });
        }
      }

      if (body.roleId && body.roleId !== membership.roleId) {
        await tx.auditEvent.create({
          data: {
            tenantId: ctx.activeTenantId,
            actorId: ctx.user.id,
            action: AuditActions.USER_ROLE_CHANGE,
            entityType: "user_membership",
            entityId: membership.id,
            metadata: {
              userId,
              fromRoleId: membership.roleId,
              toRoleId: roleId,
            },
          },
        });
      }

      return { updated, prevStatus: membership.status };
    });

    if (body.status && body.status !== result.prevStatus) {
      await writeAudit({
        tenantId: ctx.activeTenantId,
        actorId: ctx.user.id,
        action: AuditActions.USER_STATUS_CHANGE,
        entityType: "user_membership",
        entityId: result.updated.id,
        metadata: { userId, status: body.status },
      });
    }

    return jsonOk({
      user: {
        userId: result.updated.userId,
        email: result.updated.user.email,
        roleId: result.updated.roleId,
        roleKey: result.updated.role.key,
        status: result.updated.status,
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
