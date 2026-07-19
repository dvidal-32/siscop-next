const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Update tenants permissions
  await prisma.permission.update({
    where: { code: 'tenants.view' },
    data: { name: 'Ver Compañías' }
  }).catch(() => {});
  
  await prisma.permission.update({
    where: { code: 'tenants.update' },
    data: { name: 'Editar Compañías' }
  }).catch(() => {});

  await prisma.permission.update({
    where: { code: 'tenants.suspend' },
    data: { name: 'Suspender Compañías' }
  }).catch(() => {});

  await prisma.permission.update({
    where: { code: 'tenants.activate' },
    data: { name: 'Activar Compañías' }
  }).catch(() => {});

  // Update settings permissions
  await prisma.permission.update({
    where: { code: 'settings.view' },
    data: { name: 'Ver Mi Empresa' }
  }).catch(() => {});

  await prisma.permission.update({
    where: { code: 'settings.update' },
    data: { name: 'Editar Mi Empresa' }
  }).catch(() => {});

  console.log('Permisos actualizados correctamente en DB');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
