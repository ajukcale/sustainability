/**
 * Official Postgres images / CREATE USER ... SUPERUSER make the app role a
 * superuser, which bypasses RLS. Demote for local/CI so FORCE RLS applies.
 */
import { prisma } from "./index";

const role = process.env.DB_APP_ROLE ?? "sustainability";

async function main() {
  await prisma.$executeRawUnsafe(
    `ALTER ROLE ${role} NOSUPERUSER NOBYPASSRLS`,
  );
  console.log(`Demoted role ${role} (NOSUPERUSER NOBYPASSRLS)`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
