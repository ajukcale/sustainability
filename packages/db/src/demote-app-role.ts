/**
 * Official Postgres images often make POSTGRES_USER a superuser, which bypasses
 * RLS. Demote when possible so FORCE ROW LEVEL SECURITY applies.
 *
 * Idempotent: if the role is already non-superuser / no BYPASSRLS, exit 0.
 * GitHub Actions postgres services may already run as a non-superuser.
 */
import { prisma } from "./index";

type RoleFlags = { rolsuper: boolean; rolbypassrls: boolean };

async function currentRoleFlags(): Promise<RoleFlags | null> {
  const rows = await prisma.$queryRaw<RoleFlags[]>`
    SELECT rolsuper, rolbypassrls
    FROM pg_roles
    WHERE rolname = current_user
  `;
  return rows[0] ?? null;
}

async function main() {
  const role = process.env.DB_APP_ROLE ?? "sustainability";
  const before = await currentRoleFlags();
  if (!before) {
    throw new Error("Could not read current role flags from pg_roles");
  }

  if (!before.rolsuper && !before.rolbypassrls) {
    console.log(
      `Role ${role} already NOSUPERUSER NOBYPASSRLS — RLS will apply; nothing to do.`,
    );
    await prisma.$disconnect();
    return;
  }

  try {
    await prisma.$executeRawUnsafe(
      `ALTER ROLE "${role.replace(/"/g, "")}" NOSUPERUSER NOBYPASSRLS`,
    );
    console.log(`Demoted role ${role} (NOSUPERUSER NOBYPASSRLS)`);
  } catch (err) {
    const after = await currentRoleFlags();
    if (after && !after.rolsuper && !after.rolbypassrls) {
      console.log(
        `ALTER ROLE failed but role is already non-superuser; continuing.`,
      );
    } else {
      console.warn(
        `Could not demote ${role} (bootstrap/superuser restriction). ` +
          `Use \`pnpm --filter @sustainability/db ensure-app-role\` and connect as the app role.`,
      );
      console.warn(err);
      // Non-fatal for local docker bootstrap users; CI uses ensure-app-role instead.
    }
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
