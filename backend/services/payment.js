import { updateUserPremium, setStripeCustomerId } from './database.js';

const PREMIUM_PRICE_INR = 499;
const PREMIUM_PRICE_USD = 6;

// Demo mode - set to true if no payment credentials
const DEMO_MODE = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder');

// Initialize Stripe only if we have real credentials
let stripe = null;
let razorpay = null;

if (!DEMO_MODE) {
  try {
    const Stripe = (await import('stripe')).default;
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  } catch (e) {
    console.log('Stripe not available, using demo mode');
  }
}

// Create Stripe checkout session
export async function createStripeCheckout(userId, userEmail) {
  // Demo mode - return a demo URL
  if (DEMO_MODE) {
    return {
      url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?demo_payment=true&userId=${userId}`,
      sessionId: `demo_session_${Date.now()}`,
      demoMode: true
    };
  }

  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    let customer;
    const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId: userId.toString() }
      });
    }

    setStripeCustomerId(userId, customer.id);

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Stock Analizer Premium',
              description: 'Full access to premium features - AI predictions, alerts, portfolio, reports'
            },
            unit_amount: PREMIUM_PRICE_USD * 100
          },
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment-cancelled`
    });

    return { url: session.url, sessionId: session.id };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    throw new Error('Failed to create checkout session');
  }
}

// Create Razorpay order (for Indian users)
export async function createRazorpayOrder(userId) {
  // Demo mode
  if (DEMO_MODE) {
    return {
      orderId: `demo_order_${Date.now()}`,
      amount: PREMIUM_PRICE_INR * 100,
      currency: 'INR',
      demoMode: true
    };
  }

  if (!razorpay) {
    throw new Error('Razorpay not configured');
  }

  try {
    const options = {
      amount: PREMIUM_PRICE_INR * 100,
      currency: 'INR',
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        plan: 'premium_monthly'
      }
    };

    const order = await razorpay.orders.create(options);
    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    };
  } catch (error) {
    console.error('Razorpay order error:', error);
    throw new Error('Failed to create order');
  }
}

// Verify Razorpay payment
export async function verifyRazorpayPayment(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  // Demo mode - just grant premium
  if (DEMO_MODE || !process.env.RAZORPAY_KEY_SECRET) {
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    updateUserPremium(userId, true, now.toISOString(), endDate.toISOString());

    return { success: true, message: 'Payment verified successfully (Demo Mode)' };
  }

  try {
    const crypto = await import('crypto');

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      throw new Error('Invalid signature');
    }

    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    updateUserPremium(userId, true, now.toISOString(), endDate.toISOString());

    return { success: true, message: 'Payment verified successfully' };
  } catch (error) {
    console.error('Razorpay verification error:', error);
    throw new Error('Payment verification failed');
  }
}

// Verify Stripe payment
export async function verifyStripePayment(sessionId, userId) {
  // Demo mode - just grant premium
  if (DEMO_MODE) {
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    if (userId) {
      updateUserPremium(userId, true, now.toISOString(), endDate.toISOString());
    }

    return { success: true, message: 'Payment verified (Demo Mode)' };
  }

  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const uid = userId || parseInt(session.client_reference_id || session.metadata?.userId);

      if (uid) {
        const now = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);

        updateUserPremium(uid, true, now.toISOString(), endDate.toISOString());
      }

      return { success: true, message: 'Payment verified' };
    }

    throw new Error('Payment not completed');
  } catch (error) {
    console.error('Stripe verification error:', error);
    throw new Error('Payment verification failed');
  }
}

// Handle Stripe webhook
export async function handleStripeWebhook(req) {
  if (DEMO_MODE) {
    return { received: true, demoMode: true };
  }

  if (!stripe) {
    throw new Error('Stripe not configured');
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    let event;

    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const userId = parseInt(session.client_reference_id || session.metadata?.userId);

        if (userId && session.payment_status === 'paid') {
          const now = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);

          updateUserPremium(userId, true, now.toISOString(), endDate.toISOString());
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  } catch (error) {
    console.error('Webhook error:', error);
    throw error;
  }
}

// Get subscription status
export function getSubscriptionStatus(user) {
  if (!user.is_premium) {
    return {
      isPremium: false,
      plan: 'free'
    };
  }

  const now = new Date();
  const endDate = user.subscription_end ? new Date(user.subscription_end) : null;

  if (endDate && endDate < now) {
    return {
      isPremium: false,
      plan: 'free',
      message: 'Your premium subscription has expired'
    };
  }

  return {
    isPremium: true,
    plan: 'premium',
    startDate: user.subscription_start,
    endDate: user.subscription_end
  };
}

export default {
  createStripeCheckout,
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyStripePayment,
  handleStripeWebhook,
  getSubscriptionStatus
};