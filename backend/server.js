import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import apiRouter from './routes/api.js';
import { initDatabase } from './services/database.js';
import { register, login, verifyToken, authMiddleware, premiumMiddleware, adminMiddleware } from './services/auth.js';
import { getAllUsers, updateUserAdmin, deleteUser, getUserAlerts, getUserPortfolio, getUserTransactions } from './services/database.js';
import {
  createStripeCheckout,
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyStripePayment,
  handleStripeWebhook,
  getSubscriptionStatus
} from './services/payment.js';
import {
  createPriceAlert,
  getAlerts,
  removeAlert
} from './services/alerts.js';
import {
  getPremiumPortfolio,
  addPosition,
  sellPosition,
  getPortfolioHistory,
  getTransactions
} from './services/portfolio.js';
import { generateTechnicalReport, generatePortfolioReport } from './services/reports.js';
import { getAdvancedPrediction } from './services/predictionPremium.js';
import { getPrediction } from './services/predictionEngine.js';
import cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    console.log('Database initialized');

    // Schedule alert checking every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        const { checkAlerts } = await import('./services/alerts.js');
        const triggered = await checkAlerts();
        if (triggered.length > 0) {
          console.log(`Triggered ${triggered.length} alerts`);
          // In production, send notifications here
        }
      } catch (e) {
        console.error('Alert check error:', e);
      }
    });

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // WebSocket server for real-time updates
    const wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws) => {
      console.log('WebSocket client connected');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          if (data.type === 'subscribe') {
            console.log(`Client subscribed to: ${data.symbols}`);
          }
        } catch (e) {
          console.error('WebSocket message error:', e);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ============ AUTH ROUTES ============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await register(email, password, name || email.split('@')[0]);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      isPremium: req.user.is_premium === 1,
      isAdmin: req.user.is_admin === 1,
      subscriptionStart: req.user.subscription_start,
      subscriptionEnd: req.user.subscription_end
    }
  });
});

// ============ ADMIN ROUTES ============

// Get all users (admin only)
app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = getAllUsers();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user admin status (admin only)
app.put('/api/admin/users/:id/admin', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;
    updateUserAdmin(parseInt(id), isAdmin);
    res.json({ success: true, message: 'User admin status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user premium status (admin only)
app.put('/api/admin/users/:id/premium', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { isPremium } = req.body;
    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    updateUserPremium(parseInt(id), isPremium, now.toISOString(), isPremium ? endDate.toISOString() : null);
    res.json({ success: true, message: 'User premium status updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (admin only)
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    deleteUser(parseInt(id));
    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's alerts (admin can view any user)
app.get('/api/admin/users/:id/alerts', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const alerts = getUserAlerts(parseInt(id));
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's portfolio (admin can view any user)
app.get('/api/admin/users/:id/portfolio', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const portfolio = getUserPortfolio(parseInt(id));
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's transactions (admin can view any user)
app.get('/api/admin/users/:id/transactions', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const transactions = getUserTransactions(parseInt(id));
    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PAYMENT ROUTES ============

// Create Stripe checkout session
app.post('/api/payment/create-checkout-session', authMiddleware, async (req, res) => {
  try {
    const session = await createStripeCheckout(req.user.id, req.user.email);
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Razorpay order
app.post('/api/payment/create-razorpay-order', authMiddleware, async (req, res) => {
  try {
    const order = await createRazorpayOrder(req.user.id);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Razorpay payment
app.post('/api/payment/verify-razorpay', authMiddleware, async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const result = await verifyRazorpayPayment(
      req.user.id,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Verify Stripe payment
app.post('/api/payment/verify-stripe', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const result = await verifyStripePayment(sessionId, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stripe webhook
app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    await handleStripeWebhook(req);
    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get subscription status
app.get('/api/payment/subscription', authMiddleware, (req, res) => {
  const status = getSubscriptionStatus(req.user);
  res.json(status);
});

// ============ PREMIUM PREDICTION ROUTES ============

// Advanced AI predictions (premium only)
app.get('/api/premium/predictions/advanced/:symbol', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const { symbol } = req.params;
    const prediction = await getAdvancedPrediction(symbol);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Basic prediction (available to all)
app.get('/api/prediction/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y', interval = '1d' } = req.query;
    const { getHistoricalData } = await import('./services/yahooFinance.js');
    const historical = await getHistoricalData(symbol, period, interval);
    const prediction = await getPrediction(historical, symbol);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PREMIUM ALERT ROUTES ============

// Create alert
app.post('/api/premium/alerts', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const { symbol, targetPrice, condition } = req.body;
    if (!symbol || !targetPrice) {
      return res.status(400).json({ error: 'Symbol and target price are required' });
    }
    const alert = createPriceAlert(req.user.id, symbol, targetPrice, condition);
    res.json(alert);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user alerts
app.get('/api/premium/alerts', authMiddleware, premiumMiddleware, (req, res) => {
  try {
    const alerts = getAlerts(req.user.id);
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete alert
app.delete('/api/premium/alerts/:id', authMiddleware, premiumMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const result = removeAlert(parseInt(id), req.user.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ PREMIUM PORTFOLIO ROUTES ============

// Get premium portfolio
app.get('/api/premium/portfolio', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const portfolio = await getPremiumPortfolio(req.user.id);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add to portfolio
app.post('/api/premium/portfolio', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const { symbol, quantity, price } = req.body;
    if (!symbol || !quantity) {
      return res.status(400).json({ error: 'Symbol and quantity are required' });
    }
    const result = await addPosition(req.user.id, symbol, quantity, price);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Sell from portfolio
app.post('/api/premium/portfolio/sell', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    if (!symbol || !quantity) {
      return res.status(400).json({ error: 'Symbol and quantity are required' });
    }
    const result = await sellPosition(req.user.id, symbol, quantity);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get portfolio history
app.get('/api/premium/portfolio/history', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const { period = '1mo' } = req.query;
    const history = await getPortfolioHistory(req.user.id, period);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transaction history
app.get('/api/premium/portfolio/transactions', authMiddleware, premiumMiddleware, (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const transactions = getTransactions(req.user.id, parseInt(limit));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PREMIUM REPORT ROUTES ============

// Generate technical analysis report
app.get('/api/premium/report/:symbol', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const { symbol } = req.params;
    const { premium } = req.query;

    const isPremiumUser = req.user.is_premium === 1;
    const { pdf, filename } = await generateTechnicalReport(symbol, isPremiumUser);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate portfolio report
app.get('/api/premium/report/portfolio', authMiddleware, premiumMiddleware, async (req, res) => {
  try {
    const portfolio = await getPremiumPortfolio(req.user.id);
    const history = await getPortfolioHistory(req.user.id, '1mo');
    const isPremiumUser = req.user.is_premium === 1;

    const { pdf, filename } = await generatePortfolioReport(
      { ...portfolio, history },
      isPremiumUser
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EXISTING API ROUTES ============
app.use('/api', apiRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
startServer();

// Export for testing
export default app;