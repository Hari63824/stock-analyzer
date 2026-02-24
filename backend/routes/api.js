import express from 'express';
import { getQuote, getHistoricalData, searchSymbols, getOptionsChain } from '../services/yahooFinance.js';
import { calculateAllIndicators } from '../services/technicalIndicators.js';
import { calculateBlackScholes, calculateGreeks, calculateImpliedVolatility } from '../services/optionsPricing.js';
import { generateAllSignals } from '../services/strategies.js';
import { getNews, analyzeSentiment } from '../services/newsService.js';
import { getPrediction } from '../services/predictionEngine.js';
import { getPortfolioWithPrices, buyStock, sellStock, getTransactionHistory, resetPortfolio, getOrderBook, placeLimitOrder } from '../services/paperTrading.js';

const router = express.Router();

// Stock data endpoints
router.get('/quote/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const quote = await getQuote(symbol);
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/historical/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y', interval = '1d' } = req.query;
    const data = await getHistoricalData(symbol, period, interval);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    const results = await searchSymbols(q);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/options/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const options = await getOptionsChain(symbol);
    res.json(options);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Technical indicators
router.get('/indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y', interval = '1d' } = req.query;
    const historical = await getHistoricalData(symbol, period, interval);
    const indicators = calculateAllIndicators(historical);
    res.json(indicators);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Options pricing
router.post('/options/price', async (req, res) => {
  try {
    const { S, K, T, r, sigma, type = 'call' } = req.body;
    const price = calculateBlackScholes(S, K, T, r, sigma, type);
    const greeks = calculateGreeks(S, K, T, r, sigma, type);
    res.json({ price, greeks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/options/implied-volatility', async (req, res) => {
  try {
    const { S, K, T, r, marketPrice, type = 'call' } = req.body;
    const iv = calculateImpliedVolatility(S, K, T, r, marketPrice, type);
    res.json({ impliedVolatility: iv });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Trading strategies
router.get('/strategies/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y', interval = '1d' } = req.query;
    const historical = await getHistoricalData(symbol, period, interval);
    const signals = await generateAllSignals(historical, symbol);
    res.json(signals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// News
router.get('/news', async (req, res) => {
  try {
    const { symbol, limit = 20 } = req.query;
    const news = await getNews(symbol, limit);
    res.json(news);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/news/sentiment', async (req, res) => {
  try {
    const { text } = req.body;
    const sentiment = analyzeSentiment(text);
    res.json(sentiment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prediction
router.get('/prediction/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { period = '1y', interval = '1d' } = req.query;
    const historical = await getHistoricalData(symbol, period, interval);
    const prediction = await getPrediction(historical, symbol);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    // Get data for major indices and popular stocks
    const symbols = ['RELIANCE.NS', 'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'INFY.NS', 'TCS.NS'];
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await getQuote(symbol);
        } catch {
          return null;
        }
      })
    );
    res.json(quotes.filter(Boolean));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ PAPER TRADING ROUTES ============

// Get portfolio
router.get('/portfolio', async (req, res) => {
  try {
    const userId = req.query.userId || 'default';
    const portfolio = await getPortfolioWithPrices(userId);
    res.json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Buy stock
router.post('/trade/buy', async (req, res) => {
  try {
    const { symbol, quantity, userId = 'default' } = req.body;
    if (!symbol || !quantity) {
      return res.status(400).json({ error: 'Symbol and quantity are required' });
    }
    const result = await buyStock(symbol, parseInt(quantity), userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Sell stock
router.post('/trade/sell', async (req, res) => {
  try {
    const { symbol, quantity, userId = 'default' } = req.body;
    if (!symbol || !quantity) {
      return res.status(400).json({ error: 'Symbol and quantity are required' });
    }
    const result = await sellStock(symbol, parseInt(quantity), userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get transaction history
router.get('/portfolio/transactions', async (req, res) => {
  try {
    const { userId = 'default', limit = 50 } = req.query;
    const transactions = getTransactionHistory(userId, parseInt(limit));
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset portfolio
router.post('/portfolio/reset', async (req, res) => {
  try {
    const { userId = 'default' } = req.body;
    const portfolio = resetPortfolio(userId);
    res.json({ message: 'Portfolio reset successfully', portfolio });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order book
router.get('/orderbook/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const orderBook = await getOrderBook(symbol);
    res.json(orderBook);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Place limit order
router.post('/trade/limit', async (req, res) => {
  try {
    const { symbol, quantity, limitPrice, orderType, userId = 'default' } = req.body;
    if (!symbol || !quantity || !limitPrice || !orderType) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const result = await placeLimitOrder(symbol, parseInt(quantity), parseFloat(limitPrice), orderType, userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ============ F&O TRADING ROUTES ============

import {
  getLotSize,
  getFNOExpiries,
  getStrikePrices,
  longCall,
  longPut,
  coveredCall,
  protectivePut,
  bullCallSpread,
  bearPutSpread,
  longStraddle,
  longStrangle,
  ironCondor,
  ironButterfly,
  calculateFuturesPrice,
  calculateFuturesProfit,
  calculateOptionsMargin,
  calculateFuturesMargin,
  calculatePositionSize,
  generatePayoff,
  calculatePortfolioGreeks
} from '../services/fnoTrading.js';

// Get lot size for symbol
router.get('/fno/lotsize/:symbol', (req, res) => {
  const { symbol } = req.params;
  const lotSize = getLotSize(symbol.replace('.NS', ''));
  res.json({ symbol, lotSize });
});

// Get F&O expiries
router.get('/fno/expiries/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const expiries = await getFNOExpiries(symbol);
    res.json({ symbol, expiries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get strike prices
router.get('/fno/strikes/:symbol', (req, res) => {
  const { symbol } = req.params;
  const { spot } = req.query;
  const spotPrice = parseFloat(spot) || 20000;
  const strikes = getStrikePrices(spotPrice, symbol.includes('NIFTY') ? 'index' : 'stock');
  res.json({ symbol, strikes, spotPrice });
});

// Calculate option strategy
router.post('/fno/strategy', (req, res) => {
  try {
    const { strategy, spotPrice, strikePrice, premium, quantity = 1, upperStrike, lowerStrike, upperPremium, lowerPremium, callStrike, putStrike, callPremium, putPremium } = req.body;

    let result;
    switch (strategy) {
      case 'longCall':
        result = longCall(spotPrice, strikePrice, premium, quantity);
        break;
      case 'longPut':
        result = longPut(spotPrice, strikePrice, premium, quantity);
        break;
      case 'coveredCall':
        result = coveredCall(spotPrice, strikePrice, premium, quantity * 75);
        break;
      case 'protectivePut':
        result = protectivePut(spotPrice, strikePrice, premium, quantity * 75);
        break;
      case 'bullCallSpread':
        result = bullCallSpread(spotPrice, lowerStrike, upperStrike, lowerPremium, upperPremium, quantity);
        break;
      case 'bearPutSpread':
        result = bearPutSpread(spotPrice, upperStrike, lowerStrike, upperPremium, lowerPremium, quantity);
        break;
      case 'longStraddle':
        result = longStraddle(spotPrice, strikePrice, callPremium, putPremium, quantity);
        break;
      case 'longStrangle':
        result = longStrangle(spotPrice, callStrike, putStrike, callPremium, putPremium, quantity);
        break;
      case 'ironCondor':
        result = ironCondor(spotPrice, putLowerStrike || strikePrice - 200, putUpperStrike || strikePrice - 100, callUpperStrike || strikePrice + 100, callLowerStrike || strikePrice + 200, putLowerPrem || premium * 0.3, putUpperPrem || premium * 0.5, upperPremium || premium * 0.5, lowerPremium || premium * 0.3, quantity);
        break;
      case 'ironButterfly':
        result = ironButterfly(spotPrice, lowerStrike || strikePrice - 100, strikePrice, upperStrike || strikePrice + 100, lowerPremium || premium * 0.3, premium, upperPremium || premium * 0.3, quantity);
        break;
      default:
        return res.status(400).json({ error: 'Unknown strategy' });
    }

    // Add payoff chart data
    result.payoffChart = generatePayoff(result);

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all strategies
router.get('/fno/strategies', (req, res) => {
  res.json({
    strategies: [
      { id: 'longCall', name: 'Long Call', type: 'Bullish', risk: 'Low Risk', reward: 'High Reward' },
      { id: 'longPut', name: 'Long Put', type: 'Bearish', risk: 'Low Risk', reward: 'High Reward' },
      { id: 'coveredCall', name: 'Covered Call', type: 'Neutral', risk: 'Limited', reward: 'Limited' },
      { id: 'protectivePut', name: 'Protective Put', type: 'Bullish', risk: 'Limited', reward: 'High' },
      { id: 'bullCallSpread', name: 'Bull Call Spread', type: 'Moderate Bullish', risk: 'Limited', reward: 'Limited' },
      { id: 'bearPutSpread', name: 'Bear Put Spread', type: 'Moderate Bearish', risk: 'Limited', reward: 'Limited' },
      { id: 'longStraddle', name: 'Long Straddle', type: 'High Volatility', risk: 'Low', reward: 'Unlimited' },
      { id: 'longStrangle', name: 'Long Strangle', type: 'Very High Volatility', risk: 'Low', reward: 'Unlimited' },
      { id: 'ironCondor', name: 'Iron Condor', type: 'Low Volatility', risk: 'Limited', reward: 'Limited' },
      { id: 'ironButterfly', name: 'Iron Butterfly', type: 'Neutral', risk: 'Limited', reward: 'Limited' }
    ]
  });
});

// Calculate futures price
router.get('/fno/futures/:symbol', (req, res) => {
  const { symbol } = req.params;
  const { spot } = req.query;
  const spotPrice = parseFloat(spot) || 20000;
  const futures = calculateFuturesPrice(spotPrice);
  res.json({ symbol, ...futures });
});

// Calculate futures profit
router.post('/fno/futures/profit', (req, res) => {
  const { entryPrice, exitPrice, quantity, lotSize, side } = req.body;
  const result = calculateFuturesProfit(entryPrice, exitPrice, quantity, lotSize, side);
  res.json(result);
});

// Calculate options margin
router.post('/fno/margin/options', (req, res) => {
  const { premium, lotSize, quantity } = req.body;
  const result = calculateOptionsMargin(premium, lotSize, quantity);
  res.json(result);
});

// Calculate futures margin
router.post('/fno/margin/futures', (req, res) => {
  const { price, lotSize, quantity, leverage } = req.body;
  const result = calculateFuturesMargin(price, lotSize, quantity, leverage || 20);
  res.json(result);
});

// Calculate position size
router.post('/fno/position-size', (req, res) => {
  const { accountCapital, riskPercent, entryPrice, stopLoss, lotSize } = req.body;
  const result = calculatePositionSize(accountCapital, riskPercent, entryPrice, stopLoss, lotSize);
  res.json(result);
});

export default router;