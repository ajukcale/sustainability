import { jsonError, jsonOk } from "@/server/http";
import { getInviteByToken } from "@/server/invites";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { token } = await params;
    const invite = await getInviteByToken(token);
    return jsonOk({
      email: invite.email,
      tenantName: invite.tenant.name,
      roleName: invite.role.name,
      expiresAt: invite.expiresAt,
    });
  } catch (e) {
    return jsonError(e);
  }
}
