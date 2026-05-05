const Stripe = require('stripe');
const logger = require('./logger');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const stripeUtil = {
  async createCheckoutSession(order) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: order.orderItems.map(item => ({
          price_data: {
            currency: 'vnd',
            product_data: {
              name: item.name,
              images: item.imageUrl ? [item.imageUrl] : [],
            },
            unit_amount: item.price,
          },
          quantity: item.qty,
        })),
        mode: 'payment',
        success_url: `${process.env.DOMAIN || 'http://localhost:5000'}/order-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.DOMAIN || 'http://localhost:5000'}/cart.html`,
        metadata: {
          orderId: order.id.toString(),
        },
      });
      return session;
    } catch (error) {
      logger.error('Stripe session creation failed: %o', error);
      throw error;
    }
  },

  async verifyWebhook(rawBody, sig) {
    try {
      return stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (error) {
      logger.error('Stripe webhook verification failed: %o', error);
      throw error;
    }
  }
};

module.exports = stripeUtil;
