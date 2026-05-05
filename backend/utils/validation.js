const { z } = require('zod');

const schemas = {
  login: z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  }),
  
  register: z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
    name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự').optional(),
  }),

  product: z.object({
    name: z.string().min(2, 'Tên sản phẩm quá ngắn'),
    price: z.number().positive('Giá phải là số dương'),
    categoryId: z.number().int().optional(),
    stock: z.number().int().nonnegative().optional(),
    description: z.string().optional(),
    images: z.array(z.string()).optional(),
  }),

  order: z.object({
    items: z.array(z.object({
      productId: z.number(),
      qty: z.number().int().positive(),
      price: z.number(),
    })).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
    totalAmount: z.number().positive(),
    shippingInfo: z.object({
      name: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    }).optional(),
  })
};

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({ 
      error: 'Dữ liệu không hợp lệ', 
      details: error.errors.map(e => ({ path: e.path, message: e.message })) 
    });
  }
};

module.exports = { schemas, validate };
