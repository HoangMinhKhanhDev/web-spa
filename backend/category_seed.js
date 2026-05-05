const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCategories() {
  console.log('🌱 Seeding multi-level categories...');
  
  // 1. Level 1: Chăm sóc vải
  const fabricCare = await prisma.category.create({
    data: { name: 'Chăm sóc vải' }
  });
  
  // 1.1 Level 2: Nước giặt
  await prisma.category.create({
    data: { name: 'Nước giặt', parentId: fabricCare.id }
  });
  
  // 1.2 Level 2: Nước xả vải
  await prisma.category.create({
    data: { name: 'Nước xả vải', parentId: fabricCare.id }
  });

  // 2. Level 1: Chăm sóc nhà cửa
  const homeCare = await prisma.category.create({
    data: { name: 'Chăm sóc nhà cửa' }
  });
  
  // 2.1 Level 2: Nước rửa chén
  await prisma.category.create({
    data: { name: 'Nước rửa chén', parentId: homeCare.id }
  });
  
  // 2.2 Level 2: Tẩy rửa đa năng
  await prisma.category.create({
    data: { name: 'Tẩy rửa đa năng', parentId: homeCare.id }
  });

  console.log('✅ Categories seeded!');
}

seedCategories()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
