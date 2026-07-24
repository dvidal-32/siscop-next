const { PrismaClient } = require('./backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tmpl = await prisma.engineeringTemplate.findFirst({
    where: { code: 'VCRCOF' },
    include: { variables: true }
  });
  
  if (tmpl) {
    console.log('Template:', tmpl.name);
    tmpl.variables.forEach(v => {
      console.log(`- ${v.name} (${v.type}): defaultValue="${v.default_value}", formula="${v.computation_formula}"`);
    });
  } else {
    console.log('Template VCRCOF not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
