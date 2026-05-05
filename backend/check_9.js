const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function check() {
  const prod = await p.product.findUnique({ where: { id: 9 } });
  console.log(JSON.stringify(prod, null, 2));
  await p.$disconnect();
}
check();
