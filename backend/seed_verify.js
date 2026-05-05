const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedRealData() {
  console.log('Seeding real order data for verification...');
  
  // Find a product
  const products = await prisma.product.findMany();
  if (products.length === 0) {
    console.log('No products found to create orders.');
    return;
  }

  // Find a user
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('No users found to create orders.');
    return;
  }

  const testUser = users[0];
  const testProduct = products[0];

  // Create some orders for the past week
  for (let i = 0; i < 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    await prisma.order.create({
      data: {
        userId: testUser.id,
        totalAmount: 500000 + (i * 100000),
        items: JSON.stringify([{
          id: testProduct.id,
          name: testProduct.name,
          price: testProduct.price,
          qty: 1,
          emoji: testProduct.emoji
        }]),
        status: 'delivered',
        paymentStatus: 'paid',
        paymentMethod: 'bank',
        createdAt: date
      }
    });
  }

  console.log('Seed completed successfully!');
}

seedRealData()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
