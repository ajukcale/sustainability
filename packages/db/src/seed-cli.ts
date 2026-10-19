import { prisma } from "./index";
import { seedSystemRoles } from "./seed";

await seedSystemRoles();
console.log("System roles seeded.");
await prisma.$disconnect();
