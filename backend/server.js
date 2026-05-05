require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

// Custom Utils
const logger = require('./utils/logger');
const { schemas, validate } = require('./utils/validation');
const mailer = require('./utils/mailer');
const stripeUtil = require('./utils/stripe');


// ═══════════════════════════════════════
// STARTUP CHECKS
// ═══════════════════════════════════════
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

if (!process.env.JWT_SECRET) {
  logger.error('JWT_SECRET is not set in .env. Server cannot start safely.');
  process.exit(1);
}

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
const IS_PROD = process.env.NODE_ENV === 'production';

// ═══════════════════════════════════════
// MIDDLEWARES & RATE LIMITING
// ═══════════════════════════════════════
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 15, 
  message: { error: 'Thử đăng nhập quá nhiều lần, vui lòng quay lại sau 1 giờ.' },
});

app.use(cors({
  origin: IS_PROD ? process.env.ALLOWED_ORIGIN : true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use('/api/', apiLimiter);

// ═══════════════════════════════════════
// STRIPE WEBHOOK (Must be before express.json)
// ═══════════════════════════════════════
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripeUtil.verifyWebhook(req.body, sig);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = parseInt(session.metadata.orderId);
    
    // Update order status
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'paid', status: 'processing' },
      include: { orderItems: true }
    });

    // Send confirmation email after payment success
    mailer.sendOrderConfirmation(order.shipEmail, order);
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '10mb' }));
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Thảnh Thơi Farm API',
      version: '1.0.0',
      description: 'Hệ thống API cho cửa hàng mỹ phẩm thiên nhiên hữu cơ Thảnh Thơi Farm',
    },
    servers: [
      { url: `http://localhost:${PORT}`, description: 'Development server' },
    ],
  },
  apis: ['./server.js'], // Files containing annotations
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Static files
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploads directly for prod

// ═══════════════════════════════════════
// FILE UPLOAD – lưu ngoài frontend/ để tránh direct script execution
// ═══════════════════════════════════════
const uploadsDir = path.join(__dirname, 'uploads'); // backend/uploads/, KHÔNG phải frontend/uploads
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Whitelist cứng (không tin file.mimetype từ browser)
const ALLOWED_MIME = new Set(['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']);
const ALLOWED_EXT = new Set(['.jpg','.jpeg','.png','.webp','.gif','.mp4','.webm']);

// Serve uploads qua route có kiểm soát (không expose trực tiếp qua express.static)
app.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // strip path traversal
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return res.status(403).json({ error: 'Forbidden file type' });
  res.sendFile(filePath);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext) || !ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Loại file không được phép'));
    }
    cb(null, true);
  }
});

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const getCategoryTreeIds = async (parentId) => {
  const children = await prisma.category.findMany({ where: { parentId: parseInt(parentId) } });
  let ids = [parseInt(parentId)];
  for (const child of children) {
    const subIds = await getCategoryTreeIds(child.id);
    ids = ids.concat(subIds);
  }
  return ids;
};

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════

// Helper: set auth cookie
const COOKIE_NAME = 'thanhthoi_token';
const COOKIE_OPTS = {
  httpOnly: true,           // Không cho JS đọc → chống XSS
  secure: process.env.NODE_ENV === 'production', // HTTPS only khi deploy
  sameSite: 'Lax',          // Chống CSRF cơ bản
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 ngày
};

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               name: { type: string }
 *     responses:
 *       200:
 *         description: Đăng ký thành công
 */
app.post('/api/auth/register', authLimiter, validate(schemas.register), async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, isAdmin: false }
    });
    const token = jwt.sign({ userId: user.id, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json({ user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
    logger.info('User registered: %s', email);
  } catch (error) {
    if (error.code === 'P2002') return res.status(400).json({ error: 'Email đã tồn tại' });
    logger.error('Registration error: %o', error);
    res.status(400).json({ error: 'Invalid data' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 */
app.post('/api/auth/login', authLimiter, validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      logger.warn('Failed login attempt: %s', email);
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
    }
    const token = jwt.sign({ userId: user.id, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
    res.json({ user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin } });
    logger.info('User logged in: %s', email);
  } catch (error) {
    logger.error('Login error: %o', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Logout: xóa cookie
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ message: 'Logged out' });
});

// ═══════════════════════════════════════
// AUTH MIDDLEWARE (cookie-based)
// ═══════════════════════════════════════
const authenticate = (req, res, next) => {
  // Hỗ trợ cả cookie (mới) và Authorization header (backward-compat)
  const token = req.cookies[COOKIE_NAME] || (req.headers.authorization?.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.isAdmin = decoded.isAdmin;
    next();
  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const adminAuthenticate = (req, res, next) => {
  authenticate(req, res, () => {
    if (!req.isAdmin) return res.status(403).json({ error: 'Forbidden: Admin access required' });
    next();
  });
};

// ═══════════════════════════════════════
// FILE UPLOAD
// ═══════════════════════════════════════

app.post('/api/upload', adminAuthenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

app.post('/api/upload/multiple', adminAuthenticate, upload.array('files', 20), (req, res) => {
  if (!req.files || !req.files.length) return res.status(400).json({ error: 'No files uploaded' });
  const urls = req.files.map(f => ({ url: `/uploads/${f.filename}`, filename: f.filename }));
  res.json(urls);
});

// ═══════════════════════════════════════
// BLOG / NEWS
// ═══════════════════════════════════════
app.get('/api/blog', async (req, res) => {
  try {
    const posts = await prisma.blog.findMany({ 
      where: { isPublished: true }, 
      orderBy: { createdAt: 'desc' } 
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.get('/api/blog/:slug', async (req, res) => {
  try {
    const post = await prisma.blog.findUnique({ where: { slug: req.params.slug } });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

app.post('/api/blog', adminAuthenticate, async (req, res) => {
  try {
    const post = await prisma.blog.create({ data: req.body });
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create post' });
  }
});

// ═══════════════════════════════════════
// CATEGORY CRUD
// ═══════════════════════════════════════

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: { children: true, _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', adminAuthenticate, async (req, res) => {
  try {
    const { name, description, imageUrl, parentId, isActive } = req.body;
    let slug = req.body.slug || slugify(name);
    // Ensure unique slug
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) slug = slug + '-' + Date.now();
    
    const category = await prisma.category.create({
      data: { name, slug, description, imageUrl, parentId: parentId ? parseInt(parentId) : null, isActive: isActive !== false }
    });
    res.status(201).json(category);
  } catch (error) {
    logger.error('Create category error: %o', error);
    res.status(400).json({ error: 'Failed to create category' });
  }
});

app.put('/api/categories/:id', adminAuthenticate, async (req, res) => {
  try {
    const { name, slug, description, imageUrl, parentId, isActive, sortOrder } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) data.description = description;
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    if (parentId !== undefined) data.parentId = parentId ? parseInt(parentId) : null;
    if (isActive !== undefined) data.isActive = isActive;
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);

    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update category' });
  }
});

app.patch('/api/categories/reorder', adminAuthenticate, async (req, res) => {
  try {
    const { items } = req.body; // [{id, sortOrder}]
    for (const item of items) {
      await prisma.category.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: 'Failed to reorder' });
  }
});

app.delete('/api/categories/:id', adminAuthenticate, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const children = await prisma.category.count({ where: { parentId: id } });
    if (children > 0) return res.status(400).json({ error: 'Xóa danh mục con trước' });
    await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete category' });
  }
});

// ═══════════════════════════════════════
// PRODUCT CRUD (Pro)
// ═══════════════════════════════════════

const productIncludes = { 
  images: { orderBy: { sortOrder: 'asc' } }, 
  categoryRef: { include: { parent: true } },
  variants: { include: { options: { include: { attribute: true, value: true } } } }, 
  productAttrs: { include: { attribute: { include: { values: true } } } } 
};

app.get('/api/products', async (req, res) => {
  try {
    const { category, categoryId, scent, size, minPrice, maxPrice, sort, limit, search, status } = req.query;
    let where = {};

    if (categoryId && categoryId !== 'undefined') {
      const allIds = await getCategoryTreeIds(categoryId);
      where.categoryId = { in: allIds };
    } else if (category && category !== 'Tất cả' && category !== 'undefined') {
      where.category = category;
    }

    if (scent && scent !== 'undefined') where.scent = scent;
    if (size && size !== 'undefined') where.size = size;
    if (minPrice || maxPrice) {
      where.price = { gte: parseFloat(minPrice) || 0, lte: parseFloat(maxPrice) || 10000000 };
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { category: { contains: search } },
        { sku: { contains: search } },
        { tags: { contains: search } },
        { description: { contains: search } }
      ];
    }
    if (status === 'out_of_stock') where.stock = 0;
    if (status === 'on_sale') where.salePrice = { not: null };

    let orderBy = {};
    if (sort === 'price-asc') orderBy = { price: 'asc' };
    else if (sort === 'price-desc') orderBy = { price: 'desc' };
    else if (sort === 'rating') orderBy = { rating: 'desc' };
    else if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const products = await prisma.product.findMany({
      where, orderBy,
      take: limit ? parseInt(limit) : undefined,
      include: { images: { orderBy: { sortOrder: 'asc' } } }
    });
    res.json(products);
  } catch (error) {
    logger.error('Products error: %o', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/products/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isId = /^\d+$/.test(idOrSlug);
    const product = await prisma.product.findUnique({
      where: isId ? { id: parseInt(idOrSlug) } : { slug: idOrSlug },
      include: { 
        ...productIncludes,
        reviews: { include: { user: { select: { name: true } } }, orderBy: { createdAt: 'desc' } }
      }
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════
app.post('/api/reviews', authenticate, async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const review = await prisma.review.create({
      data: { productId: parseInt(productId), userId: req.userId, rating: parseInt(rating), comment }
    });
    // Update product average rating (simple logic)
    const allReviews = await prisma.review.findMany({ where: { productId: parseInt(productId) } });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
    await prisma.product.update({ where: { id: parseInt(productId) }, data: { rating: avg, reviews: allReviews.length } });
    
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ error: 'Failed to post review' });
  }
});

// ═══════════════════════════════════════
// WISHLIST
// ═══════════════════════════════════════
app.get('/api/wishlist', authenticate, async (req, res) => {
  const items = await prisma.wishlist.findMany({ 
    where: { userId: req.userId }, 
    include: { product: { include: { images: true } } } 
  });
  res.json(items);
});

app.post('/api/wishlist/:productId', authenticate, async (req, res) => {
  try {
    const productId = parseInt(req.params.productId);
    const item = await prisma.wishlist.create({ data: { userId: req.userId, productId } });
    res.json(item);
  } catch (error) {
    res.status(400).json({ error: 'Already in wishlist' });
  }
});

app.delete('/api/wishlist/:productId', authenticate, async (req, res) => {
  await prisma.wishlist.deleteMany({ where: { userId: req.userId, productId: parseInt(req.params.productId) } });
  res.json({ success: true });
});


/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 */
app.post('/api/products', adminAuthenticate, async (req, res) => {
  try {
    if (IS_PROD) {
      logger.info('Product creation requested: %s', req.body.name);
    }

    const { images, ...productData } = req.body;
    // Clean undefined fields
    Object.keys(productData).forEach(k => { if (productData[k] === undefined || productData[k] === '') delete productData[k]; });
    
    // Generate slug
    if (productData.name) {
      productData.slug = productData.slug || slugify(productData.name);
      const existing = await prisma.product.findUnique({ where: { slug: productData.slug } });
      if (existing) productData.slug = productData.slug + '-' + Date.now();
    }

    if (productData.categoryId) productData.categoryId = parseInt(productData.categoryId);
    if (productData.price) productData.price = parseFloat(productData.price);
    if (productData.salePrice) productData.salePrice = parseFloat(productData.salePrice);
    if (productData.stock !== undefined) productData.stock = parseInt(productData.stock);
    if (productData.prepDays) productData.prepDays = parseInt(productData.prepDays);

    const product = await prisma.product.create({
      data: {
        ...productData,
        images: { create: (images || []).map((url, i) => ({ url, sortOrder: i })) }
      },
      include: productIncludes
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create product: ' + error.message });
  }
});

app.put('/api/products/:id', adminAuthenticate, async (req, res) => {
  try {
    const { images, ...productData } = req.body;
    Object.keys(productData).forEach(k => { if (productData[k] === undefined) delete productData[k]; });
    
    // Update slug if name changes or slug provided
    if (productData.slug || productData.name) {
      if (!productData.slug) productData.slug = slugify(productData.name);
      const existing = await prisma.product.findFirst({ where: { slug: productData.slug, id: { not: parseInt(req.params.id) } } });
      if (existing) productData.slug = productData.slug + '-' + Date.now();
    }

    if (productData.categoryId) productData.categoryId = parseInt(productData.categoryId);
    if (productData.price) productData.price = parseFloat(productData.price);
    if (productData.salePrice !== undefined) productData.salePrice = productData.salePrice ? parseFloat(productData.salePrice) : null;
    if (productData.stock !== undefined) productData.stock = parseInt(productData.stock);
    if (productData.prepDays !== undefined) productData.prepDays = productData.prepDays ? parseInt(productData.prepDays) : null;

    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...productData,
        images: images ? { deleteMany: {}, create: images.map((url, i) => ({ url, sortOrder: i })) } : undefined
      },
      include: productIncludes
    });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update product: ' + error.message });
  }
});

app.delete('/api/products/:id', adminAuthenticate, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete product' });
  }
});

// Duplicate product
app.post('/api/products/:id/duplicate', adminAuthenticate, async (req, res) => {
  try {
    const original = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { images: true }
    });
    if (!original) return res.status(404).json({ error: 'Not found' });

    const { id, createdAt, sku, images, ...data } = original;
    const newProduct = await prisma.product.create({
      data: {
        ...data,
        name: data.name + ' (Bản sao)',
        sku: sku ? sku + '-COPY-' + Date.now() : null,
        images: { create: images.map((img, i) => ({ url: img.url, sortOrder: i })) }
      },
      include: productIncludes
    });
    res.json(newProduct);
  } catch (error) {
    res.status(400).json({ error: 'Failed to duplicate' });
  }
});

// Bulk update (quick edit)
app.patch('/api/products/bulk-update', adminAuthenticate, async (req, res) => {
  try {
    const { updates } = req.body; // [{id, price?, stock?}]
    for (const u of updates) {
      const data = {};
      if (u.price !== undefined) data.price = parseFloat(u.price);
      if (u.salePrice !== undefined) data.salePrice = u.salePrice ? parseFloat(u.salePrice) : null;
      if (u.stock !== undefined) data.stock = parseInt(u.stock);
      await prisma.product.update({ where: { id: u.id }, data });
    }
    res.json({ success: true, count: updates.length });
  } catch (error) {
    res.status(400).json({ error: 'Failed to bulk update' });
  }
});

// ═══════════════════════════════════════
// ATTRIBUTES & VARIANTS
// ═══════════════════════════════════════

app.get('/api/attributes', async (req, res) => {
  try {
    const attrs = await prisma.attribute.findMany({ include: { values: true } });
    res.json(attrs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attributes' });
  }
});

app.post('/api/attributes', adminAuthenticate, async (req, res) => {
  try {
    const { name, values } = req.body; // values: ["S","M","L"]
    const attr = await prisma.attribute.create({
      data: {
        name,
        values: { create: (values || []).map(v => ({ value: v })) }
      },
      include: { values: true }
    });
    res.status(201).json(attr);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create attribute' });
  }
});

app.delete('/api/attributes/:id', adminAuthenticate, async (req, res) => {
  try {
    await prisma.attribute.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete attribute' });
  }
});

// Generate variant matrix
app.post('/api/products/:id/generate-variants', adminAuthenticate, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { attributeIds } = req.body; // [1, 2] (Màu sắc ID, Kích thước ID)
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    // Delete existing variants
    await prisma.variant.deleteMany({ where: { productId } });
    await prisma.productAttribute.deleteMany({ where: { productId } });

    // Fetch attribute values
    const attrs = await prisma.attribute.findMany({
      where: { id: { in: attributeIds.map(Number) } },
      include: { values: true }
    });

    // Create ProductAttribute links
    for (const attr of attrs) {
      await prisma.productAttribute.create({ data: { productId, attributeId: attr.id } });
    }

    // Generate cartesian product
    function cartesian(arrays) {
      return arrays.reduce((acc, arr) => acc.flatMap(a => arr.map(b => [...a, b])), [[]]);
    }
    const valueSets = attrs.map(a => a.values.map(v => ({ attributeId: a.id, valueId: v.id, value: v.value, attrName: a.name })));
    const combos = cartesian(valueSets);

    // Create variants
    const variants = [];
    for (const combo of combos) {
      const label = combo.map(c => c.value).join(' / ');
      const variant = await prisma.variant.create({
        data: {
          productId,
          sku: (product.sku || 'SKU') + '-' + combo.map(c => c.value.substring(0, 3).toUpperCase()).join('-'),
          price: product.price,
          stock: 0,
          options: {
            create: combo.map(c => ({ attributeId: c.attributeId, valueId: c.valueId }))
          }
        },
        include: { options: { include: { attribute: true, value: true } } }
      });
      variants.push(variant);
    }

    res.json({ count: variants.length, variants });
  } catch (error) {
    res.status(400).json({ error: 'Failed to generate variants' });
  }
});

// Update single variant
app.put('/api/variants/:id', adminAuthenticate, async (req, res) => {
  try {
    const { sku, price, stock, imageUrl } = req.body;
    const variant = await prisma.variant.update({
      where: { id: parseInt(req.params.id) },
      data: {
        sku: sku || undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        stock: stock !== undefined ? parseInt(stock) : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined
      },
      include: { options: { include: { attribute: true, value: true } } }
    });
    res.json(variant);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update variant' });
  }
});

// ═══════════════════════════════════════
// CSV IMPORT/EXPORT
// ═══════════════════════════════════════

app.get('/api/products/export/csv', adminAuthenticate, async (req, res) => {
  try {
    const products = await prisma.product.findMany({ include: { images: true } });
    const header = 'name,sku,category,price,salePrice,stock,shortDesc,tags\n';
    const rows = products.map(p =>
      `"${p.name}","${p.sku || ''}","${p.category}",${p.price},${p.salePrice || ''},${p.stock},"${p.shortDesc || ''}","${p.tags || ''}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(header + rows);
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

app.post('/api/products/import/csv', adminAuthenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const lines = csvContent.split('\n').filter(l => l.trim());
    const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    let imported = 0;
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].match(/(".*?"|[^,]+)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || [];
      if (vals.length < 4) continue;
      const row = {};
      header.forEach((h, j) => { row[h] = vals[j] || ''; });
      
      await prisma.product.create({
        data: {
          name: row.name || 'Unnamed',
          sku: row.sku || null,
          category: row.category || '',
          price: parseFloat(row.price) || 0,
          salePrice: row.salePrice ? parseFloat(row.salePrice) : null,
          stock: parseInt(row.stock) || 0,
          shortDesc: row.shortDesc || null,
          tags: row.tags || null
        }
      });
      imported++;
    }
    // Cleanup uploaded CSV
    fs.unlinkSync(req.file.path);
    res.json({ success: true, imported });
  } catch (error) {
    res.status(400).json({ error: 'Import failed: ' + error.message });
  }
});

// ═══════════════════════════════════════
// ORDERS
// ═══════════════════════════════════════

app.post('/api/orders', authenticate, validate(schemas.order), async (req, res) => {
  try {
    const { items, shippingInfo, totalAmount, paymentMethod } = req.body;
    
    // Get user email
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    const order = await prisma.order.create({
      data: {
        userId: req.userId,
        totalAmount: parseFloat(totalAmount),
        paymentMethod: paymentMethod || 'cod',
        shipName: shippingInfo?.name,
        shipPhone: shippingInfo?.phone,
        shipAddress: shippingInfo?.address,
        shipEmail: user.email,
        orderItems: {
          create: items.map(item => ({
            productId: parseInt(item.productId),
            qty: parseInt(item.qty),
            price: parseFloat(item.price),
            name: item.name || 'Sản phẩm',
            variantId: item.variantId ? parseInt(item.variantId) : null,
            variantLabel: item.variantLabel || null,
          }))
        }
      },
      include: { orderItems: true }
    });

    if (paymentMethod === 'stripe') {
      const session = await stripeUtil.createCheckoutSession(order);
      await prisma.order.update({ where: { id: order.id }, data: { paymentId: session.id } });
      res.json({ checkoutUrl: session.url, order });
    } else {
      // Send confirmation email for COD
      mailer.sendOrderConfirmation(user.email, order);
      res.json(order);
    }
  } catch (error) {
    logger.error('Order error: %o', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/orders/my-orders', authenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.userId },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/orders', adminAuthenticate, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: { user: true, orderItems: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/admin/orders/:id', adminAuthenticate, async (req, res) => {
  try {
    const updateData = {};
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.paymentStatus) updateData.paymentStatus = req.body.paymentStatus;
    const order = await prisma.order.update({ where: { id: parseInt(req.params.id) }, data: updateData });
    res.json(order);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update order' });
  }
});

// ═══════════════════════════════════════
// ADMIN STATS
// ═══════════════════════════════════════

app.get('/api/admin/stats', adminAuthenticate, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [userCount, productCount, orderCount, consultationCount, recentOrders, allOrders] = await Promise.all([
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.consultation.count(),
      prisma.order.findMany({ where: { createdAt: { gte: sevenDaysAgo } }, select: { totalAmount: true, createdAt: true } }),
      prisma.order.findMany({ include: { user: true } })
    ]);

    const trendMap = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      trendMap[d.toLocaleDateString('vi-VN')] = 0;
    }
    recentOrders.forEach(o => {
      const dateKey = new Date(o.createdAt).toLocaleDateString('vi-VN');
      if (trendMap[dateKey] !== undefined) trendMap[dateKey] += o.totalAmount;
    });
    const revenueTrend = Object.entries(trendMap).reverse().map(([label, value]) => ({ label, value }));

    const productSales = {};
    allOrders.forEach(o => {
      try {
        const items = JSON.parse(o.items);
        items.forEach(item => {
          if (!productSales[item.id]) productSales[item.id] = { name: item.name, qty: 0, revenue: 0 };
          productSales[item.id].qty += (item.qty || 1);
          productSales[item.id].revenue += (item.price * (item.qty || 1));
        });
      } catch (e) {}
    });
    const topProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

    const totalRevenue = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({ userCount, productCount, orderCount, consultationCount, revenue: totalRevenue, revenueTrend, topProducts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ═══════════════════════════════════════
// CONSULTATIONS
// ═══════════════════════════════════════

app.get('/api/admin/consultations', adminAuthenticate, async (req, res) => {
  try {
    const consultations = await prisma.consultation.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(consultations);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/consultations', async (req, res) => {
  try {
    const { userName, phone, category, skinType, householdSize, frequency, note } = req.body;
    if (!userName || !phone) return res.status(400).json({ error: 'Name and Phone are required' });
    const consultation = await prisma.consultation.create({
      data: { userName, phone, category, skinType, householdSize, frequency, note }
    });
    res.status(201).json(consultation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit consultation' });
  }
});

// ═══════════════════════════════════════
// GLOBAL ERROR HANDLER
// ═══════════════════════════════════════
app.use((err, req, res, next) => {
  logger.error('[GLOBAL ERROR]: %o', err);
  res.status(500).json({ error: IS_PROD ? 'Đã xảy ra lỗi hệ thống' : err.message });
});

// ═══════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server running in ${IS_PROD ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
  logger.info(`- API Endpoint: http://localhost:${PORT}`);
  logger.info(`- API Docs: http://localhost:${PORT}/api-docs`);
});
