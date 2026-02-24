// Trading Strategies Service
// Implements all major trading strategies

import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStochastic,
  calculateADX,
  calculateATR,
  calculateROC,
  calculateCCI
} from './technicalIndicators.js';

// ============ TREND FOLLOWING STRATEGIES ============

// Moving Average Crossover Strategy
export function movingAverageCrossover(data) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const signals = [];

  for (let i = 1; i < data.length; i++) {
    if (ema12[i - 1] === null || ema26[i - 1] === null) continue;

    const prevDiff = ema12[i - 1] - ema26[i - 1];
    const currDiff = ema12[i] - ema26[i];

    if (prevDiff <= 0 && currDiff > 0) {
      signals.push({
        date: data[i].date,
        type: 'BUY',
        price: data[i].close,
        reason: 'Golden Cross - EMA12 crossed above EMA26'
      });
    } else if (prevDiff >= 0 && currDiff < 0) {
      signals.push({
        date: data[i].date,
        type: 'SELL',
        price: data[i].close,
        reason: 'Death Cross - EMA12 crossed below EMA26'
      });
    }
  }

  return signals;
}

// MACD Strategy
export function macdStrategy(data) {
  const macd = calculateMACD(data);
  const signals = [];

  for (let i = 2; i < data.length; i++) {
    if (macd.histogram[i] === null || macd.histogram[i - 1] === null) continue;

    // MACD crosses above signal line
    if (macd.histogram[i - 1] <= 0 && macd.histogram[i] > 0) {
      signals.push({
        date: data[i].date,
        type: 'BUY',
        price: data[i].close,
        reason: 'MACD bullish crossover'
      });
    }
    // MACD crosses below signal line
    else if (macd.histogram[i - 1] >= 0 && macd.histogram[i] < 0) {
      signals.push({
        date: data[i].date,
        type: 'SELL',
        price: data[i].close,
        reason: 'MACD bearish crossover'
      });
    }
  }

  return signals;
}

// ADX Trend Strategy
export function adxTrendStrategy(data, adxThreshold = 25) {
  const adxData = calculateADX(data);
  const signals = [];

  for (let i = 1; i < data.length; i++) {
    if (adxData.adx[i] === null) continue;

    const strongTrend = adxData.adx[i] > adxThreshold;

    if (strongTrend && adxData.plusDI[i] > adxData.minusDI[i]) {
      signals.push({
        date: data[i].date,
        type: 'BUY',
        price: data[i].close,
        reason: `Strong uptrend - ADX: ${adxData.adx[i].toFixed(2)}`
      });
    } else if (strongTrend && adxData.plusDI[i] < adxData.minusDI[i]) {
      signals.push({
        date: data[i].date,
        type: 'SELL',
        price: data[i].close,
        reason: `Strong downtrend - ADX: ${adxData.adx[i].toFixed(2)}`
      });
    }
  }

  return signals;
}

// ============ MEAN REVERSION STRATEGIES ============

// Bollinger Bands Bounce Strategy
export function bollingerBounceStrategy(data) {
  const bb = calculateBollingerBands(data);
  const signals = [];

  for (let i = 1; i < data.length; i++) {
    if (bb.lower[i] === null) continue;

    // Price touches lower band - potential buy
    if (data[i].close <= bb.lower[i] && data[i - 1].close > bb.lower[i - 1]) {
      signals.push({
        date: data[i].date,
        type: 'BUY',
        price: data[i].close,
        reason: 'Price touched lower Bollinger Band - oversold'
      });
    }
    // Price touches upper band - potential sell
    else if (data[i].close >= bb.upper[i] && data[i - 1].close < bb.upper[i - 1]) {
      signals.push({
        date: data[i].date,
        type: 'SELL',
        price: data[i].close,
        reason: 'Price touched upper Bollinger Band - overbought'
      });
    }
  }

  return signals;
}

// RSI Oversold/Overbought Strategy
export function rsiStrategy(data, oversold = 30, overbought = 70) {
  const rsi = calculateRSI(data);
  const signals = [];

  for (let i = 1; i < data.length; i++) {
    if (rsi[i] === null) continue;

    // RSI crosses above oversold level
    if (rsi[i - 1] <= oversold && rsi[i] > oversold) {
      signals.push({
        date: data[i].date,
        type: 'BUY',
        price: data[i].close,
        reason: `RSI exited oversold territory: ${rsi[i].toFixed(2)}`
      });
    }
    // RSI crosses below overbought level
    else if (rsi[i - 1] >= overbought && rsi[i] < overbought) {
      signals.push({
        date: data[i].date,
        type: 'SELL',
        price: data[i].close,
        reason: `RSI exited overbought territory: ${rsi[i].toFixed(2)}`
      });
    }
  }

  return signals;
}

// Statistical Arbitrage (Pair Trading)
export function statisticalArbitrage(data1, data2, lookback = 20) {
  const signals = [];

  // Calculate spread
  const prices1 = data1.map(d => d.close);
  const prices2 = data2.map(d => d.close);

  const spreads = prices1.map((p1, i) => p1 / prices2[i]);
  const smaSpread = calculateSMA(
    spreads.map(s => ({ close: s })),
    lookback
  );

  for (let i = lookback; i < spreads.length; i++) {
    if (smaSpread[i] === null) continue;

    const zScore = (spreads[i] - smaSpread[i]) / standardDeviation(spreads.slice(i - lookback, i));

    if (zScore < -2) {
      signals.push({
        date: data1[i].date,
        type: 'BUY_SPREAD',
        price: spreads[i],
        reason: `Z-score: ${zScore.toFixed(2)} - Spread undervalued`
      });
    } else if (zScore > 2) {
      signals.push({
        date: data1[i].date,
        type: 'SELL_SPREAD',
        price: spreads[i],
        reason: `Z-score: ${zScore.toFixed(2)} - Spread overvalued`
      });
    }
  }

  return signals;
}

// ============ MOMENTUM STRATEGIES ============

// Stochastic Momentum Strategy
export function stochasticMomentumStrategy(data, oversold = 20, overbought = 80) {
  const stoch = calculateStochastic(data);
  const signals = [];

  for (let i = 1; i < data.length; i++) {
    if (stoch.k[i] === null || stoch.d[i] === null) continue;

    // %K crosses above %D in oversold
    if (stoch.k[i - 1] <= stoch.d[i - 1] && stoch.k[i] > stoch.d[i] && stoch.k[i] < oversold) {
      signals.push({
        date: data[i].date,
        type: 'BUY',
        price: data[i].close,
        reason: `Stochastic bullish crossover in oversold: K=${stoch.k[i].toFixed(2)}`
      });
    }
    // %K crosses below %D in overbought
    else if (stoch.k[i - 1] >= stoch.d[i - 1] && stoch.k[i] < stoch.d[i] && stoch.k[i] > overbought) {
      signals.push({
        date: data[i].date,
        type: 'SELL',
        price: data[i].close,
        reason: `Stochastic bearish crossover in overbought: K=${stoch.k[i].toFixed(2)}`
      });
    }
  }

  return signals;
}

// RSI Momentum Strategy
export function rsiMomentumStrategy(data, threshold = 50) {
  const rsi = calculateRSI(data);
  const signals = [];

  for (let i = 1; i < data.length; i++) {
    if (rsi[i] === null) continue;

    // RSI crosses above 50 - bullish momentum
    if (rsi[i - 1] < threshold && rsi[i] >= threshold) {
      signals.push({
        date: data[i].date,
        type: 'BUY',
        price: data[i].close,
        reason: `RSI bullish momentum: ${rsi[i].toFixed(2)}`
      });
    }
    // RSI crosses below 50 - bearish momentum
    else if (rsi[i - 1] > threshold && rsi[i] <= threshold) {
      signals.push({
        date: data[i].date,
        type: 'SELL',
        price: data[i].close,
        reason: `RSI bearish momentum: ${rsi[i].toFixed(2)}`
      });
    }
  }

  return signals;
}

// Rate of Change Strategy
export function rocStrategy(data, threshold = 5) {
  const roc = calculateROC(data);
  const signals = [];

  for (let i = 1; i < data.length; i++) {
    if (roc[i] === null) continue;

    // Strong positive momentum
    if (roc[i] > threshold && roc[i - 1] <= threshold) {
      signals.push({
        date: data[i].date,
        type: 'BUY',
        price: data[i].close,
        reason: `ROC momentum breakout: ${roc[i].toFixed(2)}%`
      });
    }
    // Strong negative momentum
    else if (roc[i] < -threshold && roc[i - 1] >= -threshold) {
      signals.push({
        date: data[i].date,
        type: 'SELL',
        price: data[i].close,
        reason: `ROC momentum breakdown: ${roc[i].toFixed(2)}%`
      });
    }
  }

  return signals;
}

// ============ OPTIONS STRATEGIES ============

// Covered Call Strategy Signal
export function coveredCallSignal(currentPrice, targetPrice, premium) {
  const breakeven = currentPrice - premium;
  const maxProfit = targetPrice - currentPrice + premium;

  return {
    strategy: 'Covered Call',
    entry: currentPrice,
    target: targetPrice,
    premium,
    breakeven,
    maxProfit,
    maxProfitPercent: (maxProfit / currentPrice) * 100,
    recommendation: currentPrice < targetPrice ? 'SELL' : 'HOLD'
  };
}

// Protective Put Strategy Signal
export function protectivePutSignal(currentPrice, strike, premium) {
  const downsideProtection = strike - currentPrice - premium;

  return {
    strategy: 'Protective Put',
    entry: currentPrice,
    strike,
    premium,
    downsideProtectionPercent: (downsideProtection / currentPrice) * 100,
    recommendation: 'BUY'
  };
}

// Straddle Strategy Signal
export function straddleSignal(currentPrice, volatility, expectedMove) {
  const callPremium = currentPrice * volatility * 0.3; // Approximate
  const putPremium = callPremium;
  const totalPremium = callPremium + putPremium;

  return {
    strategy: 'Long Straddle',
    entry: currentPrice,
    expectedMoveUp: currentPrice + expectedMove,
    expectedMoveDown: currentPrice - expectedMove,
    totalPremium,
    breakevenUp: currentPrice + totalPremium,
    breakevenDown: currentPrice - totalPremium,
    recommendation: volatility > 30 ? 'BUY' : 'WAIT'
  };
}

// Iron Condor Strategy
export function ironCondorSignal(currentPrice, volatility) {
  const width = currentPrice * 0.05;
  const premium = width * 0.1; // Approximate

  return {
    strategy: 'Iron Condor',
    currentPrice,
    putShortStrike: currentPrice - width,
    putLongStrike: currentPrice - width * 2,
    callShortStrike: currentPrice + width,
    callLongStrike: currentTime + width * 2,
    creditReceived: premium,
    maxLoss: width - premium,
    recommendation: volatility < 25 ? 'SELL' : 'WAIT'
  };
}

// ============ COMBINED STRATEGIES ============

// Generate all signals
export async function generateAllSignals(data, symbol) {
  const signals = {
    symbol,
    timestamp: new Date().toISOString(),
    strategies: {}
  };

  try {
    // Trend Following
    signals.strategies.macCrossover = movingAverageCrossover(data);
    signals.strategies.macd = macdStrategy(data);
    signals.strategies.adx = adxTrendStrategy(data);

    // Mean Reversion
    signals.strategies.bollingerBounce = bollingerBounceStrategy(data);
    signals.strategies.rsi = rsiStrategy(data);

    // Momentum
    signals.strategies.stochastic = stochasticMomentumStrategy(data);
    signals.strategies.rsiMomentum = rsiMomentumStrategy(data);
    signals.strategies.roc = rocStrategy(data);
  } catch (error) {
    console.error('Error generating signals:', error);
  }

  return signals;
}

// Helper function for standard deviation
function standardDeviation(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}