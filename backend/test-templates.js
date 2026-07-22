const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.catalogItem.findMany({ where: { type: 'glass' } });
  console.log(items.map(i => ({ id: i.id, name: i.name, unit: i.unit, type: i.type, cost: i.cost })));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
