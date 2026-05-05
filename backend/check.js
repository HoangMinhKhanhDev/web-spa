const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function check() {
  const cats = await p.category.findMany();
  console.log('Categories:', cats.length);
  const prods = await p.product.findMany();
  console.log('Products:', prods.length);
  await p.$disconnect();
}
check();
