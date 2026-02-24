// Premium Prediction Service
// Advanced AI-based predictions for premium users

import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateStochastic,
  calculateADX
} from './technicalIndicators.js';
import { getHistoricalData, getQuote } from './yahooFinance.js';

// Advanced Moving Average Crossover with multiple timeframes
export async function multiTimeframeAnalysis(symbol) {
  const timeframes = [
    { period: '1d', interval: '5m', label: '5 Min' },
    { period: '1d', interval: '15m', label: '15 Min' },
    { period: '1mo', interval: '1h', label: '1 Hour' },
    { period: '1y', interval: '1d', label: 'Daily' }
  ];

  const analyses = [];

  for (const tf of timeframes) {
    try {
      const data = await getHistoricalData(symbol, tf.period, tf.interval);
      if (data && data.length > 50) {
        const ema9 = calculateEMA(data, 9);
        const ema21 = calculateEMA(data, 21);
        const ema50 = calculateEMA(data, 50);

        const currentEma9 = ema9[ema9.length - 1];
        const currentEma21 = ema21[ema21.length - 1];
        const currentEma50 = ema50[ema50.length - 1];

        let signal = 'neutral';
        if (currentEma9 > currentEma21 && currentEma21 > currentEma50) {
          signal = 'strong bullish';
        } else if (currentEma9 < currentEma21 && currentEma21 < currentEma50) {
          signal = 'strong bearish';
        } else if (currentEma9 > currentEma21) {
          signal = 'bullish';
        } else if (currentEma9 < currentEma21) {
          signal = 'bearish';
        }

        analyses.push({
          timeframe: tf.label,
          signal,
          ema9: currentEma9,
          ema21: currentEma21,
          ema50: currentEma50
        });
      }
    } catch (e) {
      // Skip this timeframe if it fails
    }
  }

  return {
    symbol,
    analysis: analyses,
    overall: calculateOverallSignal(analyses)
  };
}

// Fibonacci Retracement levels
export function fibonacciRetracement(data) {
  const highs = data.slice(-50).map(d => d.high);
  const lows = data.slice(-50).map(d => d.low);

  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  const diff = maxHigh - minLow;

  const currentPrice = data[data.length - 1].close;

  return {
    type: 'fibonacci',
    levels: {
      level0: maxHigh,
      level236: maxHigh - diff * 0.236,
      level382: maxHigh - diff * 0.382,
      level500: maxHigh - diff * 0.5,
      level618: maxHigh - diff * 0.618,
      level786: maxHigh - diff * 0.786,
      level100: minLow
    },
    currentPosition: (maxHigh - currentPrice) / diff,
    signals: {
      support: maxHigh - diff * 0.618,
      resistance: maxHigh - diff * 0.382
    }
  };
}

// Advanced Pattern Recognition
export function patternRecognition(data) {
  const closes = data.slice(-30).map(d => d.close);
  const highs = data.slice(-30).map(d => d.high);
  const lows = data.slice(-30).map(d => d.low);

  const patterns = [];

  // Double Top
  if (isDoubleTop(highs)) {
    patterns.push({ name: 'Double Top', signal: 'bearish', confidence: 75 });
  }

  // Double Bottom
  if (isDoubleBottom(lows)) {
    patterns.push({ name: 'Double Bottom', signal: 'bullish', confidence: 75 });
  }

  // Head and Shoulders
  if (isHeadAndShoulders(highs)) {
    patterns.push({ name: 'Head and Shoulders', signal: 'bearish', confidence: 70 });
  }

  // Inverse Head and Shoulders
  if (isInverseHeadAndShoulders(lows)) {
    patterns.push({ name: 'Inverse Head and Shoulders', signal: 'bullish', confidence: 70 });
  }

  // Rising Wedge
  if (isRisingWedge(closes)) {
    patterns.push({ name: 'Rising Wedge', signal: 'bearish', confidence: 65 });
  }

  // Falling Wedge
  if (isFallingWedge(closes)) {
    patterns.push({ name: 'Falling Wedge', signal: 'bullish', confidence: 65 });
  }

  return {
    type: 'patterns',
    patterns: patterns.length > 0 ? patterns : [{ name: 'No clear patterns', signal: 'neutral', confidence: 0 }],
    overallSignal: calculatePatternSignal(patterns)
  };
}

function isDoubleTop(highs) {
  const last5 = highs.slice(-5);
  const max = Math.max(...last5);
  const maxCount = last5.filter(h => Math.abs(h - max) < max * 0.005).length;
  return maxCount >= 2 && last5.indexOf(max) < 3;
}

function isDoubleBottom(lows) {
  const last5 = lows.slice(-5);
  const min = Math.min(...last5);
  const minCount = lows.filter(l => Math.abs(l - min) < min * 0.005).length;
  return minCount >= 2 && last5.indexOf(min) < 3;
}

function isHeadAndShoulders(highs) {
  // Simplified detection
  const last5 = highs.slice(-5);
  const max = Math.max(...last5);
  const maxIdx = last5.indexOf(max);
  return maxIdx > 0 && maxIdx < 4;
}

function isInverseHeadAndShoulders(lows) {
  const last5 = lows.slice(-5);
  const min = Math.min(...last5);
  const minIdx = last5.indexOf(min);
  return minIdx > 0 && minIdx < 4;
}

function isRisingWedge(closes) {
  const last10 = closes.slice(-10);
  const slope1 = (last10[9] - last10[4]) / 5;
  const slope2 = (last10[4] - last10[0]) / 4;
  return slope1 > 0 && slope1 < slope2;
}

function isFallingWedge(closes) {
  const last10 = closes.slice(-10);
  const slope1 = (last10[9] - last10[4]) / 5;
  const slope2 = (last10[4] - last10[0]) / 4;
  return slope1 < 0 && slope1 > slope2;
}

function calculatePatternSignal(patterns) {
  if (patterns.length === 0) return { signal: 'neutral', confidence: 0 };

  let bullish = 0, bearish = 0, total = 0;
  for (const p of patterns) {
    if (p.signal === 'bullish') bullish += p.confidence;
    else if (p.signal === 'bearish') bearish += p.confidence;
    total += p.confidence;
  }

  if (bullish > bearish * 1.2) return { signal: 'bullish', confidence: Math.round(bullish / total * 100) };
  if (bearish > bullish * 1.2) return { signal: 'bearish', confidence: Math.round(bearish / total * 100) };
  return { signal: 'neutral', confidence: 50 };
}

// Advanced Stochastic with KDJ
export function advancedStochastic(data) {
  const stoch = calculateStochastic(data);
  const adx = calculateADX(data);

  const validK = stoch.k.filter(v => v !== null);
  const validD = stoch.d.filter(v => v !== null);

  const k = validK.length > 0 ? validK[validK.length - 1] : 50;
  const d = validD.length > 0 ? validD[validD.length - 1] : 50;
  const prevK = validK.length > 1 ? validK[validK.length - 2] : 50;
  const prevD = validD.length > 1 ? validD[validD.length - 2] : 50;

  let signal = 'neutral';
  let confidence = 60;

  // KDJ signals
  if (k < 20 && d < 20 && k > d && prevK <= prevD) {
    signal = 'strong buy - oversold';
    confidence = 80;
  } else if (k > 80 && d > 80 && k < d && prevK >= prevD) {
    signal = 'strong sell - overbought';
    confidence = 80;
  } else if (k > d && prevK <= prevD) {
    signal = 'buy signal';
    confidence = 65;
  } else if (k < d && prevK >= prevD) {
    signal = 'sell signal';
    confidence = 65;
  }

  const adxValue = adx[adx.length - 1];

  return {
    type: 'stochastic_kdj',
    k,
    d,
    adx: adxValue,
    trendStrength: adxValue > 25 ? 'strong' : adxValue > 15 ? 'moderate' : 'weak',
    signal,
    confidence
  };
}

// Generate comprehensive AI prediction for premium users
export async function getAdvancedPrediction(symbol) {
  const data = await getHistoricalData(symbol, '1y', '1d');
  const quote = await getQuote(symbol);

  // Run all advanced analyses
  const multiTf = await multiTimeframeAnalysis(symbol);
  const fib = fibonacciRetracement(data);
  const patterns = patternRecognition(data);
  const stoch = advancedStochastic(data);

  // Get standard predictions
  const rsi = calculateRSI(data);
  const macd = calculateMACD(data);
  const bb = calculateBollingerBands(data);

  // Calculate overall AI signal
  const signals = [];

  // RSI signal
  const currentRsi = rsi[rsi.length - 1];
  if (currentRsi < 30) signals.push({ name: 'RSI Oversold', signal: 'bullish', weight: 15 });
  else if (currentRsi > 70) signals.push({ name: 'RSI Overbought', signal: 'bearish', weight: 15 });

  // MACD signal
  const currentMacd = macd.macd[macd.macd.length - 1];
  const currentSignal = macd.signal[macd.signal.length - 1];
  if (currentMacd > currentSignal) signals.push({ name: 'MACD Bullish', signal: 'bullish', weight: 20 });
  else signals.push({ name: 'MACD Bearish', signal: 'bearish', weight: 20 });

  // Pattern signals
  patterns.patterns.forEach(p => {
    if (p.confidence > 50) {
      signals.push({ name: p.name, signal: p.signal, weight: p.confidence * 0.3 });
    }
  });

  // Stochastic signals
  if (stoch.signal.includes('buy')) signals.push({ name: 'Stochastic Buy', signal: 'bullish', weight: 15 });
  if (stoch.signal.includes('sell')) signals.push({ name: 'Stochastic Sell', signal: 'bearish', weight: 15 });

  // Calculate weighted signal
  let bullishScore = 0, bearishScore = 0, totalWeight = 0;
  signals.forEach(s => {
    totalWeight += s.weight;
    if (s.signal === 'bullish') bullishScore += s.weight;
    else if (s.signal === 'bearish') bearishScore += s.weight;
  });

  const bullishPercent = totalWeight > 0 ? (bullishScore / totalWeight) * 100 : 50;

  let overallSignal = 'HOLD';
  let confidence = 60;

  if (bullishPercent > 65) {
    overallSignal = 'STRONG BUY';
    confidence = Math.min(90, 60 + (bullishPercent - 50) * 0.6);
  } else if (bullishPercent > 55) {
    overallSignal = 'BUY';
    confidence = 55 + (bullishPercent - 50);
  } else if (bullishPercent < 35) {
    overallSignal = 'STRONG SELL';
    confidence = Math.min(90, 60 + (50 - bullishPercent) * 0.6);
  } else if (bullishPercent < 45) {
    overallSignal = 'SELL';
    confidence = 55 + (50 - bullishPercent);
  }

  return {
    symbol,
    currentPrice: quote.regularMarketPrice || quote.currentPrice,
    signal: overallSignal,
    confidence: Math.round(confidence),
    bullishPercent: Math.round(bullishPercent),
    generatedAt: new Date().toISOString(),
    components: {
      multiTimeframe: multiTf,
      fibonacci: fib,
      patterns: patterns,
      stochastic: stoch,
      signals: signals
    },
    recommendation: generateRecommendation(overallSignal, quote.regularMarketPrice || quote.currentPrice, fib.levels, data)
  };
}

function calculateOverallSignal(analyses) {
  if (analyses.length === 0) return { signal: 'neutral', strength: 0 };

  const bullish = analyses.filter(a => a.signal.includes('bullish')).length;
  const bearish = analyses.filter(a => a.signal.includes('bearish')).length;
  const total = analyses.length;

  if (bullish > bearish * 1.5) return { signal: 'bullish', strength: Math.round((bullish / total) * 100) };
  if (bearish > bullish * 1.5) return { signal: 'bearish', strength: Math.round((bearish / total) * 100) };
  return { signal: 'neutral', strength: 50 };
}

function generateRecommendation(signal, currentPrice, fibLevels, data) {
  const atr = calculateATR(data);
  const validAtr = atr.filter(v => v !== null && !isNaN(v));
  const currentAtr = validAtr.length > 0 ? validAtr[validAtr.length - 1] : currentPrice * 0.02;

  const recommendations = {
    'STRONG BUY': {
      action: 'Enter long position',
      entry: currentPrice,
      stopLoss: Math.round((currentPrice - currentAtr * 2) * 100) / 100,
      target1: Math.round((currentPrice + currentAtr * 2) * 100) / 100,
      target2: Math.round((currentPrice + currentAtr * 4) * 100) / 100,
      riskReward: '1:2'
    },
    'BUY': {
      action: 'Consider long position',
      entry: currentPrice,
      stopLoss: Math.round((currentPrice - currentAtr * 1.5) * 100) / 100,
      target1: Math.round((currentPrice + currentAtr * 1.5) * 100) / 100,
      target2: Math.round((currentPrice + currentAtr * 3) * 100) / 100,
      riskReward: '1:1.5'
    },
    'HOLD': {
      action: 'Wait for clearer signals',
      entry: currentPrice,
      stopLoss: null,
      target1: null,
      target2: null,
      riskReward: null
    },
    'SELL': {
      action: 'Consider short position',
      entry: currentPrice,
      stopLoss: Math.round((currentPrice + currentAtr * 1.5) * 100) / 100,
      target1: Math.round((currentPrice - currentAtr * 1.5) * 100) / 100,
      target2: Math.round((currentPrice - currentAtr * 3) * 100) / 100,
      riskReward: '1:1.5'
    },
    'STRONG SELL': {
      action: 'Enter short position',
      entry: currentPrice,
      stopLoss: Math.round((currentPrice + currentAtr * 2) * 100) / 100,
      target1: Math.round((currentPrice - currentAtr * 2) * 100) / 100,
      target2: Math.round((currentPrice - currentAtr * 4) * 100) / 100,
      riskReward: '1:2'
    }
  };

  return recommendations[signal] || recommendations['HOLD'];
}

export default {
  getAdvancedPrediction,
  multiTimeframeAnalysis,
  fibonacciRetracement,
  patternRecognition,
  advancedStochastic
};