const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("--- Catalog Items (glass) ---");
  const glasses = await prisma.catalogItem.findMany({ where: { type: 'glass' } });
  console.dir(glasses, { depth: null });

  console.log("--- Units in Catalog ---");
  const units = await prisma.catalogItem.findMany({
    select: { unit: true },
    distinct: ['unit']
  });
  console.dir(units, { depth: null });
}
run().catch(console.error).finally(() => prisma.$disconnect());
