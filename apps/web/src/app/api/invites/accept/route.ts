import { HttpError } from "@sustainability/auth";
import { jsonError, jsonOk } from "@/server/http";
import { acceptInvite } from "@/server/invites";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      name?: string;
      password?: string;
    };
    if (!body.token || !body.name || !body.password) {
      throw new HttpError(400, "token, name ve password gerekli");
    }
    const result = await acceptInvite({
      token: body.token,
      name: body.name,
      password: body.password,
    });
    return jsonOk({
      ok: true,
      email: result.email,
      tenantId: result.tenantId,
      message: "Davet kabul edildi. Giriş yapabilirsiniz.",
    });
  } catch (e) {
    return jsonError(e);
  }
}
