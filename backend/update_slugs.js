const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  const products = await prisma.product.findMany();
  console.log(`Updating ${products.length} products...`);
  
  for (const p of products) {
    let slug = slugify(p.name);
    // Ensure uniqueness
    const existing = await prisma.product.findFirst({ where: { slug, id: { not: p.id } } });
    if (existing) slug = `${slug}-${p.id}`;
    
    await prisma.product.update({
      where: { id: p.id },
      data: { slug }
    });
    console.log(`Updated: ${p.name} -> ${slug}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
