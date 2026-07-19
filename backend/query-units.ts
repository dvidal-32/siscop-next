import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const units = await prisma.catalogItem.findMany({
    select: { unit: true },
    distinct: ['unit']
  });
  console.log("Distinct units in DB:");
  console.dir(units);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
