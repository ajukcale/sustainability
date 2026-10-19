/**
 * Ensures a non-superuser application role exists for RLS-effective connections.
 * Connect with a privileged DATABASE_URL (bootstrap/superuser), then switch
 * app traffic to APP_DATABASE_URL / the created role.
 */
import { PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });
loadEnv({ path: resolve(process.cwd(), "../../.env") });

const adminUrlRaw = process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
if (!adminUrlRaw) {
  throw new Error("ADMIN_DATABASE_URL or DATABASE_URL is required");
}
const adminUrl: string = adminUrlRaw;
const appRole = process.env.DB_APP_ROLE ?? "sustainability_app";
const appPassword = process.env.DB_APP_PASSWORD ?? "sustainability_app";
const dbName = process.env.DB_NAME ?? "sustainability";

function quoteIdent(id: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(id)) {
    throw new Error(`Unsafe SQL identifier: ${id}`);
  }
  return `"${id}"`;
}

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: adminUrl } },
  });

  const role = quoteIdent(appRole);
  const database = quoteIdent(dbName);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${appRole}') THEN
        CREATE ROLE ${role} LOGIN PASSWORD '${appPassword.replace(/'/g, "''")}'
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      ELSE
        ALTER ROLE ${role} WITH LOGIN PASSWORD '${appPassword.replace(/'/g, "''")}'
          NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      END IF;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`GRANT CONNECT ON DATABASE ${database} TO ${role}`);
  await prisma.$executeRawUnsafe(`GRANT USAGE, CREATE ON SCHEMA public TO ${role}`);
  await prisma.$executeRawUnsafe(
    `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${role}`,
  );
  await prisma.$executeRawUnsafe(
    `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${role}`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${role}`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${role}`,
  );

  // Transfer ownership of existing public tables so app role can RLS-manage them.
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  for (const { tablename } of tables) {
    if (!/^[a-zA-Z0-9_]+$/.test(tablename)) continue;
    await prisma.$executeRawUnsafe(
      `ALTER TABLE ${quoteIdent(tablename)} OWNER TO ${role}`,
    );
  }

  const u = new URL(adminUrl);
  u.username = appRole;
  u.password = appPassword;
  const appUrl = u.toString();

  console.log(`Ensured app role ${appRole} (NOSUPERUSER NOBYPASSRLS)`);
  console.log(`APP_DATABASE_URL=${appUrl}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
