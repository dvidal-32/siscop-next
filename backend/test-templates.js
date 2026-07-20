const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.engineeringTemplate.findMany({
    include: { minimum_areas: true },
  });
  console.log(JSON.stringify(templates, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
