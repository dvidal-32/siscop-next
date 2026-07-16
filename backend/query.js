const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== USERS ===");
  const users = await prisma.user.findMany();
  console.log(users);

  console.log("=== TENANTS ===");
  const tenants = await prisma.tenant.findMany();
  console.log(tenants);

  console.log("=== TENANT SETTINGS ===");
  const settings = await prisma.tenantSetting.findMany();
  console.log(settings);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
