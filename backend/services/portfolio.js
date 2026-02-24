// Premium Portfolio Service
// Enhanced portfolio tracking for premium users with real-time updates

import { getUserPortfolio, addToPortfolio, removeFromPortfolio, addTransaction, getUserTransactions } from './database.js';
import { getQuote, getHistoricalData } from './yahooFinance.js';

// Get user's premium portfolio with live prices
export async function getPremiumPortfolio(userId) {
  const portfolio = getUserPortfolio(userId);
  const positions = [];

  let totalInvested = 0;
  let totalCurrentValue = 0;

  for (const position of portfolio) {
    try {
      const quote = await getQuote(position.symbol);
      const currentPrice = quote.regularMarketPrice || quote.currentPrice;
      const currentValue = currentPrice * position.quantity;
      const investedValue = position.avg_price * position.quantity;
      const profitLoss = currentValue - investedValue;
      const profitLossPercent = ((currentPrice - position.avg_price) / position.avg_price) * 100;

      totalInvested += investedValue;
      totalCurrentValue += currentValue;

      positions.push({
        id: position.id,
        symbol: position.symbol,
        quantity: position.quantity,
        avgPrice: position.avg_price,
        currentPrice,
        currentValue,
        profitLoss,
        profitLossPercent,
        dayChange: quote.regularMarketChange || quote.change || 0,
        dayChangePercent: quote.regularMarketChangePercent || quote.changePercent || 0
      });
    } catch (error) {
      // Include position with last known values if price fetch fails
      const currentValue = position.avg_price * position.quantity;
      totalInvested += currentValue;
      totalCurrentValue += currentValue;

      positions.push({
        id: position.id,
        symbol: position.symbol,
        quantity: position.quantity,
        avgPrice: position.avg_price,
        currentPrice: position.avg_price,
        currentValue,
        profitLoss: 0,
        profitLossPercent: 0,
        dayChange: 0,
        dayChangePercent: 0,
        error: 'Price unavailable'
      });
    }
  }

  const totalProfitLoss = totalCurrentValue - totalInvested;
  const totalProfitLossPercent = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    positions,
    summary: {
      totalInvested: Math.round(totalInvested * 100) / 100,
      totalCurrentValue: Math.round(totalCurrentValue * 100) / 100,
      totalProfitLoss: Math.round(totalProfitLoss * 100) / 100,
      totalProfitLossPercent: Math.round(totalProfitLossPercent * 100) / 100,
      positionCount: positions.length
    }
  };
}

// Add position to portfolio
export async function addPosition(userId, symbol, quantity, price) {
  if (!symbol || !quantity || quantity <= 0) {
    throw new Error('Invalid symbol or quantity');
  }

  const qty = parseInt(quantity);
  const unitPrice = price ? parseFloat(price) : null;

  // Get current price if not provided
  let actualPrice;
  if (unitPrice) {
    actualPrice = unitPrice;
  } else {
    const quote = await getQuote(symbol);
    actualPrice = quote.regularMarketPrice || quote.currentPrice;
  }

  // Update portfolio
  addToPortfolio(userId, symbol, qty, actualPrice);

  // Record transaction
  addTransaction(userId, symbol, 'BUY', qty, actualPrice);

  return {
    success: true,
    position: {
      symbol,
      quantity: qty,
      price: actualPrice,
      total: qty * actualPrice
    }
  };
}

// Sell from portfolio
export async function sellPosition(userId, symbol, quantity) {
  if (!symbol || !quantity || quantity <= 0) {
    throw new Error('Invalid symbol or quantity');
  }

  const qty = parseInt(quantity);

  // Get current price
  const quote = await getQuote(symbol);
  const currentPrice = quote.regularMarketPrice || quote.currentPrice;

  // Remove from portfolio (handles partial and full sells)
  removeFromPortfolio(userId, symbol, qty);

  // Record transaction
  addTransaction(userId, symbol, 'SELL', qty, currentPrice);

  return {
    success: true,
    transaction: {
      symbol,
      quantity: qty,
      price: currentPrice,
      total: qty * currentPrice
    }
  };
}

// Get portfolio performance history
export async function getPortfolioHistory(userId, period = '1mo') {
  const portfolio = getUserPortfolio(userId);

  if (portfolio.length === 0) {
    return {
      history: [],
      summary: { startValue: 0, endValue: 0, return: 0, returnPercent: 0 }
    };
  }

  // Get historical data for all symbols
  const historyData = {};
  const endDate = new Date();
  const startDate = new Date();

  if (period === '1w') startDate.setDate(startDate.getDate() - 7);
  else if (period === '1mo') startDate.setMonth(startDate.getMonth() - 1);
  else if (period === '3mo') startDate.setMonth(startDate.getMonth() - 3);
  else if (period === '1y') startDate.setFullYear(startDate.getFullYear() - 1);

  // Fetch historical data for each position
  for (const position of portfolio) {
    try {
      const historical = await getHistoricalData(position.symbol, period, '1d');
      historyData[position.symbol] = {
        data: historical,
        quantity: position.quantity,
        avgPrice: position.avg_price
      };
    } catch (e) {
      console.error(`Error fetching history for ${position.symbol}:`, e);
    }
  }

  // Calculate daily portfolio values
  const history = [];
  const dates = new Set();

  // Collect all unique dates
  Object.values(historyData).forEach(h => {
    h.data.forEach(d => dates.add(d.date));
  });

  const sortedDates = Array.from(dates).sort();

  for (const date of sortedDates.slice(-30)) { // Last 30 data points
    let dayValue = 0;
    let dayInvested = 0;

    for (const [symbol, h] of Object.entries(historyData)) {
      const dayData = h.data.find(d => d.date === date);
      if (dayData) {
        dayValue += dayData.close * h.quantity;
        dayInvested += h.avgPrice * h.quantity;
      }
    }

    if (dayValue > 0) {
      history.push({
        date,
        value: Math.round(dayValue * 100) / 100,
        invested: Math.round(dayInvested * 100) / 100,
        profitLoss: Math.round((dayValue - dayInvested) * 100) / 100,
        profitLossPercent: Math.round(((dayValue - dayInvested) / dayInvested) * 10000) / 100
      });
    }
  }

  const startValue = history.length > 0 ? history[0].value : 0;
  const endValue = history.length > 0 ? history[history.length - 1].value : 0;
  const returnVal = endValue - startValue;
  const returnPercent = startValue > 0 ? (returnVal / startValue) * 100 : 0;

  return {
    history,
    summary: {
      startValue: Math.round(startValue * 100) / 100,
      endValue: Math.round(endValue * 100) / 100,
      return: Math.round(returnVal * 100) / 100,
      returnPercent: Math.round(returnPercent * 100) / 100
    }
  };
}

// Get transaction history
export function getTransactions(userId, limit = 50) {
  const transactions = getUserTransactions(userId, limit);
  return transactions.map(t => ({
    id: t.id,
    symbol: t.symbol,
    type: t.type,
    quantity: t.quantity,
    price: t.price,
    total: t.total,
    date: t.created_at
  }));
}

export default {
  getPremiumPortfolio,
  addPosition,
  sellPosition,
  getPortfolioHistory,
  getTransactions
};