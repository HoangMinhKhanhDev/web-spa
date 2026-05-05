require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Clearing existing data...');
  await prisma.variantOption.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productAttribute.deleteMany();
  await prisma.product.deleteMany();
  await prisma.attributeValue.deleteMany();
  await prisma.attribute.deleteMany();
  await prisma.category.deleteMany();
  
  console.log('🌱 Seeding Thảnh Thơi Farm CMS...');

  // Admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@thanhthoi.farm' },
    update: {},
    create: { email: 'admin@thanhthoi.farm', password: hashedPassword, name: 'Admin', isAdmin: true }
  });
  console.log('✅ Admin user created (admin@thanhthoi.farm)');

  // Categories (Cosmetics)
  const skincare = await prisma.category.create({ data: { name: 'Chăm sóc da', slug: 'cham-soc-da', sortOrder: 1 } });
  const faceSerum = await prisma.category.create({ data: { name: 'Serum da mặt', slug: 'serum-da-mat', parentId: skincare.id, sortOrder: 1 } });
  const moisturizer = await prisma.category.create({ data: { name: 'Kem dưỡng ẩm', slug: 'kem-duong-am', parentId: skincare.id, sortOrder: 2 } });

  const haircare = await prisma.category.create({ data: { name: 'Chăm sóc tóc', slug: 'cham-soc-toc', sortOrder: 2 } });
  const shampoo = await prisma.category.create({ data: { name: 'Dầu gội thảo dược', slug: 'dau-goi-thao-duoc', parentId: haircare.id, sortOrder: 1 } });
  const conditioner = await prisma.category.create({ data: { name: 'Dầu xả tóc', slug: 'dau-xa-toc', parentId: haircare.id, sortOrder: 2 } });

  const bodycare = await prisma.category.create({ data: { name: 'Sữa tắm & Thân thể', slug: 'sua-tam-than-the', sortOrder: 3 } });
  const bodyWash = await prisma.category.create({ data: { name: 'Sữa tắm hữu cơ', slug: 'sua-tam-huu-co', parentId: bodycare.id, sortOrder: 1 } });

  const tech = await prisma.category.create({ data: { name: 'Thiết bị Xanh', slug: 'thiet-bi-xanh', sortOrder: 4 } });
  const lifestyle = await prisma.category.create({ data: { name: 'Lối sống Thảnh Thơi', slug: 'loi-song-thanh-thoi', sortOrder: 5 } });
  
  console.log('✅ Categories created');

  // Attributes
  const scentAttr = await prisma.attribute.create({
    data: { name: 'Mùi hương', values: { create: [{ value: 'Sả Chanh' }, { value: 'Bồ Kết' }, { value: 'Hoa Bưởi' }, { value: 'Trà Xanh' }] } }
  });
  const skinTypeAttr = await prisma.attribute.create({
    data: { name: 'Loại da', values: { create: [{ value: 'Da thường' }, { value: 'Da dầu' }, { value: 'Da khô' }, { value: 'Da nhạy cảm' }] } }
  });
  console.log('✅ Attributes created');

  // Sample products (Diverse Brand Showcase)
  const products = [
    { name: 'Serum Hào Quang Sáng - Chiết xuất Cam Thảo', slug: 'serum-hao-quang-sang', sku: 'SR-001', categoryId: faceSerum.id, category: 'Serum da mặt', price: 350000, salePrice: 299000, stock: 100, badge: 'Bán chạy', shortDesc: 'Dưỡng trắng tự nhiên, mờ thâm nám', description: 'Serum công thức thảo mộc giúp da sáng khỏe đồng đều màu.', rating: 4.9, reviews: 342, tags: '100% Thiên nhiên, Phục hồi, Tinh túy thảo mộc' },
    { name: 'Dầu Gội Bồ Kết 30 Thảo Mộc', slug: 'dau-goi-bo-ket-30-thao-moc', sku: 'DG-001', categoryId: shampoo.id, category: 'Dầu gội thảo dược', price: 225000, stock: 150, badge: 'Hot', shortDesc: 'Giảm rụng tóc, sạch gàu tự nhiên', description: 'Dầu gội nấu thủ công từ bồ kết, vỏ bưởi và 30 loại thảo dược quý.', rating: 4.8, reviews: 520, tags: '100% Thiên nhiên, Phục hồi, Bồ kết Tây Bắc' },
    { name: 'Sữa Tắm Tía Tô Hữu Cơ', slug: 'sua-tam-tia-to-huu-co', sku: 'ST-001', categoryId: bodyWash.id, category: 'Sữa tắm hữu cơ', price: 185000, salePrice: 165000, stock: 80, badge: 'Sale', shortDesc: 'Kháng khuẩn, chăm sóc da mụn lưng', description: 'Chiết xuất từ lá tía tô tươi, nhẹ dịu cho mọi làn da.', rating: 4.7, reviews: 215, tags: 'Chiết xuất tự nhiên, Bảo vệ, Tía tô hữu cơ' },
    { name: 'Kem Dưỡng Thạch Trà Xanh', slug: 'kem-duong-thach-tra-xanh', sku: 'KD-001', categoryId: moisturizer.id, category: 'Kem dưỡng ẩm', price: 290000, stock: 45, badge: 'Mới', shortDesc: 'Cấp ẩm tức thì, làm dịu da cháy nắng', isNew: true, rating: 4.9, reviews: 88, tags: 'Chiết xuất tự nhiên, Phục hồi, Trà xanh' },
    { name: 'Xà Bông Thủ Công Mật Ong', slug: 'xa-bong-thu-cong-mat-ong', sku: 'XB-001', categoryId: bodyWash.id, category: 'Sữa tắm hữu cơ', price: 95000, stock: 200, shortDesc: 'Dưỡng ẩm, làm sạch dịu nhẹ', description: 'Xà bông phôi dầu dừa mật ong rừng nguyên chất.', rating: 4.6, reviews: 156, tags: '100% Thiên nhiên, Bảo vệ' },
    { name: 'Dầu Xả Tóc Hương Bưởi', slug: 'dau-xa-toc-huong-buoi', sku: 'DX-001', categoryId: conditioner.id, category: 'Dầu xả tóc', price: 210000, salePrice: 185000, stock: 60, shortDesc: 'Mượt tóc, kích thích mọc tóc', description: 'Dầu xả tinh chất vỏ bưởi rừng.', rating: 4.5, reviews: 92, tags: 'Chiết xuất tự nhiên, Phục hồi' },
    { name: 'Mặt Nạ Bùn Khoáng Nha Đam', slug: 'mat-na-bun-khoang-nha-dam', sku: 'MN-001', categoryId: skincare.id, category: 'Chăm sóc da', price: 155000, stock: 0, shortDesc: 'Thải độc da, se khít lỗ chân lông', description: 'Bùn khoáng thiên nhiên kết hợp nha đam tươi.', allowPreorder: true, rating: 4.4, reviews: 76, tags: 'Chiết xuất tự nhiên, Phục hồi' },
    { name: 'Tinh Dầu Sả Chanh Nguyên Chất', slug: 'tinh-dau-sa-chanh-nguyen-chat', sku: 'TD-001', categoryId: bodycare.id, category: 'Sữa tắm & Thân thể', price: 120000, stock: 50, badge: 'Premium', shortDesc: 'Xông phòng, đuổi côn trùng', description: 'Tinh dầu sả chanh ép lạnh nguyên chất.', rating: 5.0, reviews: 310, tags: '100% Thiên nhiên, Bảo vệ' },
    
    // Tech & Lifestyle (Modern Harmony)
    { name: 'Máy Khuếch Tán Gốm Thủ Công', slug: 'may-khuech-tan-gom', sku: 'TH-001', categoryId: tech.id, category: 'Thiết bị Xanh', price: 850000, stock: 20, badge: 'Nghệ nhân', shortDesc: 'Chất liệu gốm nung truyền thống', description: 'Sự kết hợp giữa công nghệ siêu âm và nghệ thuật gốm sứ.', rating: 4.8, reviews: 45, tags: 'Công nghệ xanh, Lối sống, Modern Harmony' },
    { name: 'Bộ Dụng Cụ Làm Vườn Inox', slug: 'bo-dung-cu-lam-vuon', sku: 'LS-001', categoryId: lifestyle.id, category: 'Lối sống Thảnh Thơi', price: 540000, stock: 30, badge: 'Bền vững', shortDesc: 'Thiết kế Ergo, thép không gỉ cao cấp', description: 'Người bạn đồng hành cho tâm hồn yêu cây cỏ.', rating: 4.9, reviews: 12, tags: 'Công nghệ xanh, Lối sống, Legacy' },
    { name: 'Sổ Tay Giấy Rơm Tái Chế', slug: 'so-tay-giay-rom', sku: 'LS-002', categoryId: lifestyle.id, category: 'Lối sống Thảnh Thơi', price: 125000, stock: 100, badge: 'Eco-Choice', shortDesc: '100% rơm khô tái chế, không tẩy trắng', description: 'Nơi lưu giữ những ý tưởng xanh.', rating: 4.7, reviews: 38, tags: 'Công nghệ xanh, Lối sống' },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }
  console.log('✅ 8 cosmetic products created');

  console.log('\n🎉 Seed complete! Login: admin@thanhthoi.farm / admin123');
}

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());
