import { prisma } from "./index";
import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  DEMO_TENANT_NAME,
  seedDemoAdmin,
  seedSystemRoles,
} from "./seed";

await seedSystemRoles();
const demo = await seedDemoAdmin();
console.log("System roles seeded.");
console.log("Demo admin seeded:");
console.log(`  tenant: ${demo.tenantName} (${demo.tenantSlug})`);
console.log(`  email:  ${DEMO_ADMIN_EMAIL}`);
console.log(`  password: ${DEMO_ADMIN_PASSWORD}`);
await prisma.$disconnect();
