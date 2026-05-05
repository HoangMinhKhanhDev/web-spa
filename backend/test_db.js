const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const cats = await prisma.category.findMany();
    console.log('Categories found:', cats.length);
    console.log('Category structure OK');
  } catch (e) {
    console.error('Category model not found or DB error:', e.message);
  }
}

test().finally(() => prisma.$disconnect());
