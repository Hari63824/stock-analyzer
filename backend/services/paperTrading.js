// Paper Trading Service
// Simulates live trading for practice purposes

// In-memory portfolio storage (in production, use a database)
const portfolios = new Map();

// Default portfolio for new users
const createDefaultPortfolio = (userId = 'default') => ({
  userId,
  cash: 1000000, // 10 lakhs starting balance
  initialCapital: 1000000,
  positions: [],
  transactions: [],
  createdAt: new Date().toISOString()
});

// Get portfolio
export function getPortfolio(userId = 'default') {
  if (!portfolios.has(userId)) {
    portfolios.set(userId, createDefaultPortfolio(userId));
  }
  return portfolios.get(userId);
}

// Get stock price (simulated with slight variation)
export async function getStockPrice(symbol) {
  // Import yahoo finance to get real prices
  const { getQuote } = await import('./yahooFinance.js');
  const quote = await getQuote(symbol);
  return quote.price;
}

// Buy stock
export async function buyStock(symbol, quantity, userId = 'default') {
  const portfolio = getPortfolio(userId);
  const currentPrice = await getStockPrice(symbol);
  const totalCost = currentPrice * quantity;
  const brokerage = totalCost * 0.001; // 0.1% brokerage
  const totalWithBrokerage = totalCost + brokerage;

  if (portfolio.cash < totalWithBrokerage) {
    throw new Error('Insufficient funds');
  }

  // Check if position already exists
  const existingPosition = portfolio.positions.find(p => p.symbol === symbol);

  if (existingPosition) {
    // Average out the position
    const newQuantity = existingPosition.quantity + quantity;
    const newAvgPrice = ((existingPosition.avgPrice * existingPosition.quantity) + (currentPrice * quantity)) / newQuantity;
    existingPosition.quantity = newQuantity;
    existingPosition.avgPrice = newAvgPrice;
  } else {
    portfolio.positions.push({
      symbol,
      quantity,
      avgPrice: currentPrice,
      buyPrice: currentPrice,
      buyDate: new Date().toISOString()
    });
  }

  // Deduct cash
  portfolio.cash -= totalWithBrokerage;

  // Record transaction
  portfolio.transactions.push({
    id: `TXN${Date.now()}`,
    type: 'BUY',
    symbol,
    quantity,
    price: currentPrice,
    brokerage,
    total: totalWithBrokerage,
    date: new Date().toISOString()
  });

  return {
    success: true,
    orderId: `ORD${Date.now()}`,
    symbol,
    quantity,
    price: currentPrice,
    brokerage,
    total: totalWithBrokerage,
    remainingCash: portfolio.cash,
    portfolio: {
      cash: portfolio.cash,
      positions: portfolio.positions,
      totalValue: calculatePortfolioValue(portfolio)
    }
  };
}

// Sell stock
export async function sellStock(symbol, quantity, userId = 'default') {
  const portfolio = getPortfolio(userId);
  const currentPrice = await getStockPrice(symbol);

  // Find position
  const positionIndex = portfolio.positions.findIndex(p => p.symbol === symbol);

  if (positionIndex === -1) {
    throw new Error('No position found for this stock');
  }

  const position = portfolio.positions[positionIndex];

  if (position.quantity < quantity) {
    throw new Error('Insufficient quantity to sell');
  }

  const totalValue = currentPrice * quantity;
  const brokerage = totalValue * 0.001; // 0.1% brokerage
  const netProceeds = totalValue - brokerage;

  // Update or remove position
  if (position.quantity === quantity) {
    portfolio.positions.splice(positionIndex, 1);
  } else {
    position.quantity -= quantity;
  }

  // Add cash
  portfolio.cash += netProceeds;

  // Record transaction
  const profit = netProceeds - (position.avgPrice * quantity);
  portfolio.transactions.push({
    id: `TXN${Date.now()}`,
    type: 'SELL',
    symbol,
    quantity,
    price: currentPrice,
    brokerage,
    netProceeds,
    profit,
    date: new Date().toISOString()
  });

  return {
    success: true,
    orderId: `ORD${Date.now()}`,
    symbol,
    quantity,
    price: currentPrice,
    brokerage,
    netProceeds,
    profit,
    remainingCash: portfolio.cash,
    portfolio: {
      cash: portfolio.cash,
      positions: portfolio.positions,
      totalValue: calculatePortfolioValue(portfolio)
    }
  };
}

// Calculate portfolio value
function calculatePortfolioValue(portfolio) {
  return portfolio.positions.reduce((total, position) => {
    return total + (position.currentPrice || position.avgPrice) * position.quantity;
  }, 0) + portfolio.cash;
}

// Get portfolio with current prices
export async function getPortfolioWithPrices(userId = 'default') {
  const portfolio = getPortfolio(userId);

  // Update current prices for all positions
  for (const position of portfolio.positions) {
    try {
      const quote = await getQuote(position.symbol);
      position.currentPrice = quote.price;
      position.change = quote.change;
      position.changePercent = quote.changePercent;
      position.dayHigh = quote.high;
      position.dayLow = quote.low;
    } catch {
      position.currentPrice = position.avgPrice;
    }
  }

  const investedValue = portfolio.positions.reduce((sum, p) => sum + (p.avgPrice * p.quantity), 0);
  const currentValue = portfolio.positions.reduce((sum, p) => sum + ((p.currentPrice || p.avgPrice) * p.quantity), 0);
  const unrealizedPL = currentValue - investedValue;
  const unrealizedPLPercent = investedValue > 0 ? (unrealizedPL / investedValue) * 100 : 0;

  return {
    cash: portfolio.cash,
    initialCapital: portfolio.initialCapital,
    investedValue,
    currentValue,
    totalValue: portfolio.cash + currentValue,
    unrealizedPL,
    unrealizedPLPercent,
    positions: portfolio.positions,
    transactions: portfolio.transactions.slice(-50).reverse(), // Last 50 transactions
    todayPL: portfolio.positions.reduce((sum, p) => {
      return sum + (p.change || 0) * p.quantity;
    }, 0)
  };
}

// Get transaction history
export function getTransactionHistory(userId = 'default', limit = 50) {
  const portfolio = getPortfolio(userId);
  return portfolio.transactions.slice(-limit).reverse();
}

// Reset portfolio
export function resetPortfolio(userId = 'default') {
  portfolios.set(userId, createDefaultPortfolio(userId));
  return getPortfolio(userId);
}

// Get market order book (simulated)
export async function getOrderBook(symbol) {
  const currentPrice = await getStockPrice(symbol);
  const spread = currentPrice * 0.001; // 0.1% spread

  return {
    symbol,
    timestamp: new Date().toISOString(),
    bids: [
      { price: currentPrice - spread * 0.5, quantity: Math.floor(Math.random() * 10000) + 1000 },
      { price: currentPrice - spread * 1, quantity: Math.floor(Math.random() * 8000) + 800 },
      { price: currentPrice - spread * 1.5, quantity: Math.floor(Math.random() * 6000) + 600 },
      { price: currentPrice - spread * 2, quantity: Math.floor(Math.random() * 4000) + 400 },
      { price: currentPrice - spread * 2.5, quantity: Math.floor(Math.random() * 2000) + 200 }
    ],
    asks: [
      { price: currentPrice + spread * 0.5, quantity: Math.floor(Math.random() * 10000) + 1000 },
      { price: currentPrice + spread * 1, quantity: Math.floor(Math.random() * 8000) + 800 },
      { price: currentPrice + spread * 1.5, quantity: Math.floor(Math.random() * 6000) + 600 },
      { price: currentPrice + spread * 2, quantity: Math.floor(Math.random() * 4000) + 400 },
      { price: currentPrice + spread * 2.5, quantity: Math.floor(Math.random() * 2000) + 200 }
    ],
    lastPrice: currentPrice,
    volume: Math.floor(Math.random() * 10000000) + 1000000
  };
}

// Place limit order
export async function placeLimitOrder(symbol, quantity, limitPrice, orderType, userId = 'default') {
  const portfolio = getPortfolio(userId);
  const currentPrice = await getStockPrice(symbol);

  // Simulate order execution if price matches
  if (orderType === 'BUY' && currentPrice <= limitPrice) {
    return buyStock(symbol, quantity, userId);
  } else if (orderType === 'SELL' && currentPrice >= limitPrice) {
    return sellStock(symbol, quantity, userId);
  }

  // Order pending
  return {
    success: false,
    status: 'PENDING',
    message: `Order placed at ₹${limitPrice}. Will execute when price reaches ₹${limitPrice}`,
    order: {
      id: `ORD${Date.now()}`,
      symbol,
      quantity,
      limitPrice,
      type: orderType,
      date: new Date().toISOString()
    }
  };
}