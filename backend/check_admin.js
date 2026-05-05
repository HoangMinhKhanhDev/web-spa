const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmin() {
  const adminEmail = "admin@thanhthoi.farm";
  const user = await prisma.user.findUnique({
    where: { email: adminEmail }
  });
  
  if (user) {
    console.log(`User ${adminEmail} exists.`);
    console.log(`isAdmin: ${user.isAdmin}`);
  } else {
    console.log(`User ${adminEmail} does not exist.`);
  }
}

checkAdmin()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
