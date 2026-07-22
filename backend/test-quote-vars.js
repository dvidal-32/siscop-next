const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const quotes = await prisma.quote.findMany({
    include: {
      versions: {
        include: {
          products: true
        }
      }
    },
    orderBy: { created_at: 'desc' },
    take: 1
  });
  
  if (quotes.length > 0) {
    const q = quotes[0];
    console.log("Last quote ID:", q.id);
    const ver = q.versions.find(v => v.is_current) || q.versions[0];
    for (const prod of ver.products) {
      console.log("Product:", prod.name);
      console.log("Variables:", JSON.stringify(prod.variables));
    }
  } else {
    console.log("No quotes");
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
