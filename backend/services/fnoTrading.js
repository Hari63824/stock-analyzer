// F&O (Futures & Options) Trading Service
// Complete F&O trading platform with strategies, calculators, and education

// Indian market lot sizes (NSE)
const LOT_SIZES = {
  // Nifty 50
  'NIFTY': 75,
  // Bank Nifty
  'BANKNIFTY': 25,
  // Nifty IT
  'NIFTYIT': 50,
  // Nifty Pharma
  'NIFTYPHARMA': 60,
  // Nifty Auto
  'NIFTYAUTO': 40,
  // Nifty Metal
  'NIFTYMETAL': 65,
  // Nifty FMCG
  'NIFTYFMCG': 40,
  // Nifty Energy
  'NIFTYENERGY': 40,
  // Individual Stocks (example - actual varies)
  'RELIANCE': 250,
  'TCS': 125,
  'INFY': 125,
  'HDFCBANK': 250,
  'ICICIBANK': 375,
  'SBIN': 500,
  'BAJFINANCE': 125,
  'LT': 125,
  'HINDUNILVR': 125,
  'ITC': 400,
  'MARUTI': 100,
  'TITAN': 125,
  'M&M': 250,
  'WIPRO': 400,
  'SUNPHARMA': 375,
  'AXISBANK': 250,
  'ASIANPAINT': 125,
  'ULTRACEMCO': 50,
  'ADANIPORTS': 250,
  'TATASTEEL': 500,
  'JSWSTEEL': 250,
  'CIPLA': 250,
  'DRREDDY': 125,
  'ONGC': 500,
  'NTPC': 500,
  'POWERGRID': 500,
  'HCLTECH': 125,
  'TECHM': 125,
  'GRASIM': 125,
  'DIVISLAB': 100,
  'SBILIFE': 125,
  'BPCL': 250,
  'COALINDIA': 400,
  'EICHERMOT': 50,
  'VEDL': 500,
  'YESBANK': 1000,
  'IDEA': 2500,
  'BHARTIARTL': 250
};

// US Stock Options (usually 100 shares per contract)
const US_LOT_SIZE = 100;

// Get lot size for a symbol
export function getLotSize(symbol) {
  // Check if it's an index
  if (symbol.includes('NIFTY') || symbol === 'NIFTY') return 75;
  if (symbol.includes('BANK') && symbol.includes('NS')) return 25;

  // Check Indian stock
  const baseSymbol = symbol.replace('.NS', '');
  for (const [key, value] of Object.entries(LOT_SIZES)) {
    if (baseSymbol.includes(key) || key.includes(baseSymbol)) {
      return value;
    }
  }

  // Default for US stocks
  return 100;
}

// Get all available expiries for F&O
export async function getFNOExpiries(symbol) {
  // Generate weekly and monthly expiries
  const today = new Date();
  const expiries = [];

  // Weekly expiries (every Thursday)
  for (let i = 0; i < 4; i++) {
    const thursday = new Date(today);
    thursday.setDate(today.getDate() + (3 - today.getDay() + 7 * i) % 7);
    if (thursday > today) {
      expiries.push({
        date: thursday.toISOString().split('T')[0],
        type: 'weekly',
        daysToExpiry: Math.ceil((thursday - today) / (1000 * 60 * 60 * 24))
      });
    }
  }

  // Monthly expiries (last Thursday of month)
  const lastThursday = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  while (lastThursday.getDay() !== 4) {
    lastThursday.setDate(lastThursday.getDate() - 1);
  }
  if (lastThursday > today) {
    expiries.push({
      date: lastThursday.toISOString().split('T')[0],
      type: 'monthly',
      daysToExpiry: Math.ceil((lastThursday - today) / (1000 * 60 * 60 * 24))
    });
  }

  return expiries;
}

// Get strike prices for options
export function getStrikePrices(spotPrice, type = 'index') {
  const strikes = [];
  const step = type === 'index' ? 50 : spotPrice > 1000 ? 50 : spotPrice > 100 ? 10 : 5;

  // Generate strikes around ATM
  for (let i = -15; i <= 15; i++) {
    const strike = Math.round((spotPrice + i * step) / step) * step;
    if (!strikes.includes(strike)) {
      strikes.push(strike);
    }
  }

  return strikes.sort((a, b) => a - b);
}

// ============== OPTIONS STRATEGIES ==============

// 1. Long Call (Bullish)
export function longCall(spotPrice, strikePrice, premium, quantity = 1) {
  const lotSize = getLotSize('NIFTY');
  const contracts = quantity;
  const totalPremium = premium * lotSize * contracts;
  const breakeven = strikePrice + premium;
  const maxLoss = totalPremium;
  const maxProfit = spotPrice > strikePrice ? Infinity : (strikePrice - premium) * lotSize * contracts;

  return {
    name: 'Long Call',
    type: 'Bullish',
    description: 'Buy a call option when you expect the stock to go up significantly. Limited risk, unlimited profit potential.',
    entry: { spotPrice, strikePrice, premium, contracts, lotSize },
    breakeven,
    maxLoss,
    maxProfit: 'Unlimited',
    riskReward: 'High Reward, Low Risk',
    expiryProfit: (expiryPrice) => {
      if (expiryPrice <= strikePrice) return -totalPremium;
      return (expiryPrice - strikePrice) * lotSize * contracts - totalPremium;
    }
  };
}

// 2. Long Put (Bearish)
export function longPut(spotPrice, strikePrice, premium, quantity = 1) {
  const lotSize = getLotSize('NIFTY');
  const contracts = quantity;
  const totalPremium = premium * lotSize * contracts;
  const breakeven = strikePrice - premium;
  const maxLoss = totalPremium;
  const maxProfit = (strikePrice - premium) * lotSize * contracts;

  return {
    name: 'Long Put',
    type: 'Bearish',
    description: 'Buy a put option when you expect the stock to fall significantly. Limited risk, high profit potential.',
    entry: { spotPrice, strikePrice, premium, contracts, lotSize },
    breakeven,
    maxLoss,
    maxProfit,
    riskReward: 'High Reward, Low Risk',
    expiryProfit: (expiryPrice) => {
      if (expiryPrice >= strikePrice) return -totalPremium;
      return (strikePrice - expiryPrice) * lotSize * contracts - totalPremium;
    }
  };
}

// 3. Covered Call (Neutral to Bullish)
export function coveredCall(spotPrice, strikePrice, premium, stockQuantity, lotSize = 75) {
  const contracts = Math.floor(stockQuantity / lotSize);
  const totalPremium = premium * lotSize * contracts;
  const breakeven = spotPrice - premium;
  const maxProfit = (strikePrice - spotPrice + premium) * lotSize * contracts;
  const maxLoss = 'Stock downside';

  return {
    name: 'Covered Call',
    type: 'Neutral to Bullish',
    description: 'Own the stock and sell a call option. Generate income from premium while holding the stock.',
    entry: { spotPrice, strikePrice, premium, contracts, lotSize },
    breakeven,
    maxLoss,
    maxProfit,
    riskReward: 'Limited Reward, Limited Risk',
    expiryProfit: (expiryPrice) => {
      if (expiryPrice <= strikePrice) {
        return totalPremium + (expiryPrice - spotPrice) * lotSize * contracts;
      }
      return maxProfit;
    }
  };
}

// 4. Protective Put (Bullish)
export function protectivePut(spotPrice, strikePrice, premium, stockQuantity, lotSize = 75) {
  const contracts = Math.floor(stockQuantity / lotSize);
  const totalPremium = premium * lotSize * contracts;
  const breakeven = spotPrice + premium;
  const maxLoss = (spotPrice - strikePrice + premium) * lotSize * contracts;
  const maxProfit = 'Unlimited';

  return {
    name: 'Protective Put',
    type: 'Bullish',
    description: 'Own the stock and buy a put option for downside protection. Limited loss, unlimited profit.',
    entry: { spotPrice, strikePrice, premium, contracts, lotSize },
    breakeven,
    maxLoss,
    maxProfit,
    riskReward: 'High Reward, Limited Risk',
    expiryProfit: (expiryPrice) => {
      const stockPL = (expiryPrice - spotPrice) * lotSize * contracts;
      const optionPL = expiryPrice < strikePrice
        ? (strikePrice - expiryPrice - premium) * lotSize * contracts
        : -totalPremium;
      return stockPL + optionPL;
    }
  };
}

// 5. Bull Call Spread (Moderate Bullish)
export function bullCallSpread(spotPrice, lowerStrike, upperStrike, lowerPremium, upperPremium, quantity = 1) {
  const lotSize = getLotSize('NIFTY');
  const contracts = quantity;
  const netPremium = lowerPremium - upperPremium;
  const totalPremium = netPremium * lotSize * contracts;
  const breakeven = lowerStrike + netPremium;
  const maxProfit = (upperStrike - lowerStrike - netPremium) * lotSize * contracts;
  const maxLoss = totalPremium;

  return {
    name: 'Bull Call Spread',
    type: 'Moderate Bullish',
    description: 'Buy a lower strike call and sell a higher strike call. Reduce cost but cap profits.',
    entry: { spotPrice, lowerStrike, upperStrike, lowerPremium, upperPremium, contracts, lotSize },
    breakeven,
    maxLoss,
    maxProfit,
    riskReward: 'Limited Reward, Limited Risk',
    expiryProfit: (expiryPrice) => {
      if (expiryPrice <= lowerStrike) return -totalPremium;
      if (expiryPrice >= upperStrike) return maxProfit;
      return (expiryPrice - lowerStrike) * lotSize * contracts - totalPremium;
    }
  };
}

// 6. Bear Put Spread (Moderate Bearish)
export function bearPutSpread(spotPrice, upperStrike, lowerStrike, upperPremium, lowerPremium, quantity = 1) {
  const lotSize = getLotSize('NIFTY');
  const contracts = quantity;
  const netPremium = upperPremium - lowerPremium;
  const totalPremium = netPremium * lotSize * contracts;
  const breakeven = upperStrike - netPremium;
  const maxProfit = (upperStrike - lowerStrike - netPremium) * lotSize * contracts;
  const maxLoss = totalPremium;

  return {
    name: 'Bear Put Spread',
    type: 'Moderate Bearish',
    description: 'Buy a higher strike put and sell a lower strike put. Reduce cost but cap profits.',
    entry: { spotPrice, upperStrike, lowerStrike, upperPremium, lowerPremium, contracts, lotSize },
    breakeven,
    maxLoss,
    maxProfit,
    riskReward: 'Limited Reward, Limited Risk',
    expiryProfit: (expiryPrice) => {
      if (expiryPrice >= upperStrike) return -totalPremium;
      if (expiryPrice <= lowerStrike) return maxProfit;
      return (upperStrike - expiryPrice) * lotSize * contracts - totalPremium;
    }
  };
}

// 7. Long Straddle (High Volatility)
export function longStraddle(spotPrice, strikePrice, callPremium, putPremium, quantity = 1) {
  const lotSize = getLotSize('NIFTY');
  const contracts = quantity;
  const totalPremium = (callPremium + putPremium) * lotSize * contracts;
  const upperBreakeven = strikePrice + totalPremium / (lotSize * contracts);
  const lowerBreakeven = strikePrice - totalPremium / (lotSize * contracts);
  const maxLoss = totalPremium;
  const maxProfit = 'Unlimited';

  return {
    name: 'Long Straddle',
    type: 'High Volatility',
    description: 'Buy both call and put at the same strike. Profit from big moves in either direction.',
    entry: { spotPrice, strikePrice, callPremium, putPremium, contracts, lotSize },
    breakeven: [lowerBreakeven, upperBreakeven],
    maxLoss,
    maxProfit,
    riskReward: 'High Reward, Low Risk',
    expiryProfit: (expiryPrice) => {
      const callPL = expiryPrice > strikePrice
        ? (expiryPrice - strikePrice - callPremium) * lotSize * contracts
        : -callPremium * lotSize * contracts;
      const putPL = expiryPrice < strikePrice
        ? (strikePrice - expiryPrice - putPremium) * lotSize * contracts
        : -putPremium * lotSize * contracts;
      return callPL + putPL;
    }
  };
}

// 8. Long Strangle (Very High Volatility)
export function longStrangle(spotPrice, callStrike, putStrike, callPremium, putPremium, quantity = 1) {
  const lotSize = getLotSize('NIFTY');
  const contracts = quantity;
  const totalPremium = (callPremium + putPremium) * lotSize * contracts;
  const upperBreakeven = callStrike + totalPremium / (lotSize * contracts);
  const lowerBreakeven = putStrike - totalPremium / (lotSize * contracts);
  const maxLoss = totalPremium;
  const maxProfit = 'Unlimited';

  return {
    name: 'Long Strangle',
    type: 'Very High Volatility',
    description: 'Buy OTM call and put. Cheaper than straddle but needs bigger move to profit.',
    entry: { spotPrice, callStrike, putStrike, callPremium, putPremium, contracts, lotSize },
    breakeven: [lowerBreakeven, upperBreakeven],
    maxLoss,
    maxProfit,
    riskReward: 'High Reward, Low Risk',
    expiryProfit: (expiryPrice) => {
      const callPL = expiryPrice > callStrike
        ? (expiryPrice - callStrike - callPremium) * lotSize * contracts
        : -callPremium * lotSize * contracts;
      const putPL = expiryPrice < putStrike
        ? (putStrike - expiryPrice - putPremium) * lotSize * contracts
        : -putPremium * lotSize * contracts;
      return callPL + putPL;
    }
  };
}

// 9. Iron Condor (Low Volatility)
export function ironCondor(spotPrice, putLowerStrike, putUpperStrike, callUpperStrike, callLowerStrike,
  putLowerPrem, putUpperPrem, callUpperPrem, callLowerPrem, quantity = 1) {
  const lotSize = getLotSize('NIFTY');
  const contracts = quantity;
  const totalCredit = (putLowerPrem + callUpperPrem - putUpperPrem - callLowerPrem) * lotSize * contracts;
  const maxProfit = totalCredit;
  const putRisk = (putUpperStrike - putLowerStrike) * lotSize * contracts;
  const callRisk = (callUpperStrike - callLowerStrike) * lotSize * contracts;
  const maxLoss = Math.max(putRisk, callRisk) - totalCredit;
  const lowerBreakeven = putLowerStrike - totalCredit / (lotSize * contracts);
  const upperBreakeven = callUpperStrike + totalCredit / (lotSize * contracts);

  return {
    name: 'Iron Condor',
    type: 'Low Volatility',
    description: 'Sell OTM put spread and call spread. Profit if price stays in range.',
    entry: { spotPrice, putLowerStrike, putUpperStrike, callUpperStrike, callLowerStrike, contracts, lotSize },
    breakeven: [lowerBreakeven, upperBreakeven],
    maxLoss,
    maxProfit,
    riskReward: 'Limited Reward, Limited Risk',
    expiryProfit: (expiryPrice) => {
      let pl = totalCredit;
      if (expiryPrice < putLowerStrike) pl -= (putUpperStrike - putLowerStrike) * lotSize * contracts;
      if (expiryPrice > callUpperStrike) pl -= (callUpperStrike - callLowerStrike) * lotSize * contracts;
      return pl;
    }
  };
}

// 10. Iron Butterfly (Neutral)
export function ironButterfly(spotPrice, lowerStrike, strike, upperStrike,
  lowerPrem, strikePrem, upperPrem, quantity = 1) {
  const lotSize = getLotSize('NIFTY');
  const contracts = quantity;
  const totalCredit = (lowerPrem + upperPrem - 2 * strikePrem) * lotSize * contracts;
  const maxProfit = totalCredit;
  const maxLoss = (strike - lowerStrike) * lotSize * contracts - totalCredit;
  const lowerBreakeven = strike - totalCredit / (lotSize * contracts);
  const upperBreakeven = strike + totalCredit / (lotSize * contracts);

  return {
    name: 'Iron Butterfly',
    type: 'Neutral',
    description: 'Sell ATM straddle and buy OTM wings. Maximum profit if price stays at strike.',
    entry: { spotPrice, lowerStrike, strike, upperStrike, contracts, lotSize },
    breakeven: [lowerBreakeven, upperBreakeven],
    maxLoss,
    maxProfit,
    riskReward: 'Limited Reward, Limited Risk',
    expiryProfit: (expiryPrice) => {
      let pl = totalCredit;
      if (expiryPrice < lowerStrike) pl -= (strike - lowerStrike) * lotSize * contracts;
      if (expiryPrice > upperStrike) pl -= (upperStrike - strike) * lotSize * contracts;
      return pl;
    }
  };
}

// ============== FUTURES TRADING ==============

// Calculate futures price with fair value
export function calculateFuturesPrice(spotPrice, interestRate = 0.07, daysToExpiry = 30) {
  const fairValue = spotPrice * Math.exp(interestRate * daysToExpiry / 365);
  const premium = fairValue - spotPrice;
  return {
    spotPrice,
    fairValue: fairValue.toFixed(2),
    premium: premium.toFixed(2),
    annualizedPremium: ((premium / spotPrice) * 365 / daysToExpiry * 100).toFixed(2) + '%'
  };
}

// Futures profit calculator
export function calculateFuturesProfit(entryPrice, exitPrice, quantity, lotSize, side = 'LONG') {
  const contracts = Math.floor(quantity / lotSize);
  const multiplier = side === 'LONG' ? 1 : -1;
  const profit = (exitPrice - entryPrice) * contracts * lotSize * multiplier;
  const returnPercent = ((exitPrice - entryPrice) / entryPrice * 100) * multiplier;

  return {
    entryPrice,
    exitPrice,
    contracts,
    totalQuantity: contracts * lotSize,
    profit: profit.toFixed(2),
    returnPercent: returnPercent.toFixed(2) + '%',
    brokerages: (contracts * lotSize * (entryPrice + exitPrice) * 0.001).toFixed(2), // 0.1% brokerage
    netProfit: (profit - contracts * lotSize * (entryPrice + exitPrice) * 0.001).toFixed(2)
  };
}

// ============== MARGIN CALCULATOR ==============

// Calculate options margin (simplified)
export function calculateOptionsMargin(premium, lotSize, quantity = 1) {
  const spans = 0.5; // 50% Span (simplified)
  const exposure = premium * lotSize * quantity * 0.1; // 10% of notional
  const initialMargin = premium * lotSize * quantity * spans;

  return {
    premium: premium * lotSize * quantity,
    initialMargin: Math.max(initialMargin, 5000),
    exposure: exposure,
    totalMargin: Math.max(initialMargin, 5000) + exposure
  };
}

// Calculate futures margin
export function calculateFuturesMargin(price, lotSize, quantity = 1, leverage = 20) {
  const notional = price * lotSize * quantity;
  const initialMargin = notional / leverage;
  const maintenanceMargin = initialMargin * 0.75;

  return {
    price,
    notionalValue: notional,
    initialMargin: initialMargin.toFixed(2),
    maintenanceMargin: maintenanceMargin.toFixed(2),
    leverage: leverage + 'x',
    requiredCapital: initialMargin.toFixed(2)
  };
}

// ============== RISK MANAGEMENT ==============

// Position sizing calculator
export function calculatePositionSize(accountCapital, riskPercent, entryPrice, stopLoss, lotSize) {
  const riskAmount = accountCapital * (riskPercent / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const shares = Math.floor(riskAmount / riskPerShare);
  const contracts = Math.floor(shares / lotSize);
  const actualRisk = contracts * lotSize * riskPerShare;
  const positionValue = contracts * lotSize * entrySize;

  return {
    accountCapital,
    riskAmount,
    riskPerShare,
    maxShares: shares,
    contracts,
    actualPosition: contracts * lotSize,
    actualRisk: actualRisk.toFixed(2),
    positionValue: positionValue.toFixed(2),
    riskPercent: ((actualRisk / accountCapital) * 100).toFixed(2) + '%'
  };
}

// ============== PAYOFF TABLES ==============

// Generate payoff data for charting
export function generatePayoff(strategy, priceRange = 0.2) {
  const spotPrice = strategy.entry.spotPrice;
  const minPrice = spotPrice * (1 - priceRange);
  const maxPrice = spotPrice * (1 + priceRange);
  const step = (maxPrice - minPrice) / 20;

  const data = [];
  for (let price = minPrice; price <= maxPrice; price += step) {
    data.push({
      price: price.toFixed(2),
      profit: strategy.expiryProfit(price).toFixed(2),
      isProfit: strategy.expiryProfit(price) >= 0
    });
  }

  return data;
}

// ============== GREEKS PORTFOLIO ==============

// Calculate portfolio Greeks
export function calculatePortfolioGreeks(positions) {
  let totalDelta = 0;
  let totalGamma = 0;
  let totalTheta = 0;
  let totalVega = 0;

  for (const pos of positions) {
    const multiplier = pos.quantity * getLotSize(pos.symbol);
    totalDelta += (pos.delta || 0) * multiplier;
    totalGamma += (pos.gamma || 0) * multiplier;
    totalTheta += (pos.theta || 0) * multiplier;
    totalVega += (pos.vega || 0) * multiplier;
  }

  return {
    delta: totalDelta.toFixed(4),
    gamma: totalGamma.toFixed(4),
    theta: totalTheta.toFixed(4),
    vega: totalVega.toFixed(4),
    interpretation: {
      delta: totalDelta > 0 ? 'Net Bullish' : totalDelta < 0 ? 'Net Bearish' : 'Neutral',
      gamma: totalGamma > 0 ? 'Long Gamma (Positive)' : 'Short Gamma (Negative)',
      theta: totalTheta > 0 ? 'Time Decay Benefits' : 'Time Decay Hurts',
      vega: totalVega > 0 ? 'Long Vega (Long Vol)' : 'Short Vega (Short Vol)'
    }
  };
}