const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function check() {
  const prods = await p.product.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { images: true }
  });
  console.log(JSON.stringify(prods, null, 2));
  await p.$disconnect();
}
check();
