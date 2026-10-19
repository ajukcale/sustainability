import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Sets PostgreSQL session variable used by RLS policies.
 * Must run inside a transaction (SET LOCAL via set_config is_local=true).
 * Note: PostgreSQL superusers bypass RLS — use a non-superuser app role.
 */
export async function setTenantContext(
  tx: Tx,
  tenantId: string | null,
): Promise<void> {
  const value = tenantId ?? "";
  await tx.$executeRaw`SELECT set_config('app.tenant_id', ${value}, true)`;
}

/** Run work with RLS tenant context applied (SET LOCAL inside a transaction). */
export async function withTenantRls<T>(
  prisma: PrismaClient,
  tenantId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await setTenantContext(tx, tenantId);
    return fn(tx);
  });
}
