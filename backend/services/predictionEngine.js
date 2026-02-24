// Prediction Engine Service
// ML-based stock prediction using various algorithms

import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR
} from './technicalIndicators.js';

// Simple Linear Regression for trend prediction
export function linearRegressionPrediction(data, lookback = 20, forecastDays = 5) {
  const prices = data.slice(-lookback).map(d => d.close);
  const x = prices.map((_, i) => i);
  const y = prices;

  // Calculate regression coefficients
  const n = prices.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Forecast
  const predictions = [];
  for (let i = 1; i <= forecastDays; i++) {
    const forecastX = n + i - 1;
    const predictedPrice = slope * forecastX + intercept;
    predictions.push({
      day: i,
      price: predictedPrice,
      change: ((predictedPrice - prices[prices.length - 1]) / prices[prices.length - 1]) * 100
    });
  }

  return {
    type: 'linear_regression',
    slope,
    intercept,
    currentPrice: prices[prices.length - 1],
    predictions
  };
}

// Moving Average based prediction
export function maPrediction(data) {
  const sma20 = calculateSMA(data, 20);
  const sma50 = calculateSMA(data, 50);
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  const currentPrice = data[data.length - 1].close;

  // Get last valid values (filter out nulls)
  const validSMA20 = sma20.filter(v => v !== null && !isNaN(v));
  const validSMA50 = sma50.filter(v => v !== null && !isNaN(v));
  const validEMA12 = ema12.filter(v => v !== null && !isNaN(v));
  const validEMA26 = ema26.filter(v => v !== null && !isNaN(v));

  const currentSMA20 = validSMA20.length > 0 ? validSMA20[validSMA20.length - 1] : currentPrice;
  const currentSMA50 = validSMA50.length > 0 ? validSMA50[validSMA50.length - 1] : currentPrice;
  const currentEMA12 = validEMA12.length > 0 ? validEMA12[validEMA12.length - 1] : currentPrice;
  const currentEMA26 = validEMA26.length > 0 ? validEMA26[validEMA26.length - 1] : currentPrice;

  // Trend analysis
  let trend = 'neutral';
  let confidence = 0;

  if (currentPrice > currentEMA12 && currentEMA12 > currentEMA26) {
    trend = 'bullish';
    confidence = 70;
  } else if (currentPrice < currentEMA12 && currentEMA12 < currentEMA26) {
    trend = 'bearish';
    confidence = 70;
  } else if (currentPrice > currentSMA50 && currentSMA20 > currentSMA50) {
    trend = 'bullish';
    confidence = 60;
  } else if (currentPrice < currentSMA50 && currentSMA20 < currentSMA50) {
    trend = 'bearish';
    confidence = 60;
  }

  // Calculate support and resistance
  const recentHighs = data.slice(-20).map(d => d.high);
  const recentLows = data.slice(-20).map(d => d.low);

  return {
    type: 'moving_average',
    trend,
    confidence,
    currentPrice,
    support: Math.min(...recentLows),
    resistance: Math.max(...recentHighs),
    sma20: currentSMA20,
    sma50: currentSMA50,
    ema12: currentEMA12,
    ema26: currentEMA26
  };
}

// RSI-based prediction
export function rsiPrediction(data) {
  const rsi = calculateRSI(data);

  // Get valid RSI values
  const validRSI = rsi.filter(v => v !== null && !isNaN(v));
  const currentRSI = validRSI.length > 0 ? validRSI[validRSI.length - 1] : 50;
  const prevRSI = validRSI.length > 1 ? validRSI[validRSI.length - 2] : 50;

  let signal = 'neutral';
  let confidence = 0;

  if (currentRSI < 30) {
    signal = 'oversold - potential reversal up';
    confidence = 75;
  } else if (currentRSI > 70) {
    signal = 'overbought - potential reversal down';
    confidence = 75;
  } else if (currentRSI > 50 && prevRSI < 50) {
    signal = 'bullish momentum building';
    confidence = 60;
  } else if (currentRSI < 50 && prevRSI > 50) {
    signal = 'bearish momentum building';
    confidence = 60;
  } else {
    signal = currentRSI > 50 ? 'bullish territory' : 'bearish territory';
    confidence = 40;
  }

  return {
    type: 'rsi',
    currentRSI,
    signal,
    confidence
  };
}

// MACD-based prediction
export function macdPrediction(data) {
  const macd = calculateMACD(data);

  // Get valid values
  const validMacd = macd.macd.filter(v => v !== null && !isNaN(v));
  const validSignal = macd.signal.filter(v => v !== null && !isNaN(v));
  const validHist = macd.histogram.filter(v => v !== null && !isNaN(v));

  const macdLine = validMacd.length > 0 ? validMacd[validMacd.length - 1] : 0;
  const signalLine = validSignal.length > 0 ? validSignal[validSignal.length - 1] : 0;
  const hist = validHist.length > 0 ? validHist[validHist.length - 1] : 0;
  const prevHist = validHist.length > 1 ? validHist[validHist.length - 2] : 0;

  let signal = 'neutral';
  let confidence = 0;

  if (hist > 0 && prevHist <= 0) {
    signal = 'bullish crossover';
    confidence = 70;
  } else if (hist < 0 && prevHist >= 0) {
    signal = 'bearish crossover';
    confidence = 70;
  } else if (hist > 0 && macdLine > signalLine) {
    signal = 'bullish momentum';
    confidence = 60;
  } else if (hist < 0 && macdLine < signalLine) {
    signal = 'bearish momentum';
    confidence = 60;
  }

  return {
    type: 'macd',
    macdLine,
    signalLine,
    histogram: hist,
    signal,
    confidence
  };
}

// Bollinger Bands prediction
export function bollingerPrediction(data) {
  const bb = calculateBollingerBands(data);
  const currentPrice = data[data.length - 1].close;

  // Get valid values
  const validUpper = bb.upper.filter(v => v !== null && !isNaN(v));
  const validLower = bb.lower.filter(v => v !== null && !isNaN(v));
  const validMiddle = bb.middle.filter(v => v !== null && !isNaN(v));

  const upper = validUpper.length > 0 ? validUpper[validUpper.length - 1] : currentPrice * 1.02;
  const lower = validLower.length > 0 ? validLower[validLower.length - 1] : currentPrice * 0.98;
  const middle = validMiddle.length > 0 ? validMiddle[validMiddle.length - 1] : currentPrice;

  let signal = 'neutral';
  let confidence = 0;
  let target = middle;

  if (currentPrice <= lower) {
    signal = 'at lower band - potential bounce up';
    confidence = 65;
    target = middle;
  } else if (currentPrice >= upper) {
    signal = 'at upper band - potential pullback';
    confidence = 65;
    target = middle;
  } else if (currentPrice > middle) {
    signal = 'above middle - bullish';
    confidence = 50;
    target = upper;
  } else {
    signal = 'below middle - bearish';
    confidence = 50;
    target = lower;
  }

  return {
    type: 'bollinger',
    currentPrice,
    upper,
    middle,
    lower,
    signal,
    confidence,
    target
  };
}

// Volatility-based prediction
export function volatilityPrediction(data) {
  const atr = calculateATR(data);
  // Get the last valid ATR value (filter out nulls)
  const validAtrValues = atr.filter(v => v !== null && !isNaN(v));
  const currentATR = validAtrValues.length > 0 ? validAtrValues[validAtrValues.length - 1] : data[data.length - 1].close * 0.02;
  const currentPrice = data[data.length - 1].close;

  const atrPercent = (currentATR / currentPrice) * 100;

  let signal = 'normal volatility';
  let expectedMove = currentATR;

  if (atrPercent > 3) {
    signal = 'high volatility - expect significant moves';
  } else if (atrPercent < 1) {
    signal = 'low volatility - potential breakout coming';
    expectedMove = currentATR * 2;
  }

  return {
    type: 'volatility',
    atr: currentATR,
    atrPercent,
    expectedMoveUp: currentPrice + expectedMove,
    expectedMoveDown: currentPrice - expectedMove,
    signal
  };
}

// Sentiment-based prediction
export function sentimentPrediction(news) {
  if (!news || news.length === 0) {
    return {
      type: 'sentiment',
      signal: 'no news data',
      confidence: 0
    };
  }

  const sentiments = news.map(n => n.sentiment || 0);
  const avgSentiment = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;

  let signal = 'neutral';
  let confidence = Math.min(80, news.length * 10);

  if (avgSentiment > 0.4) {
    signal = 'positive sentiment - bullish';
  } else if (avgSentiment > 0.2) {
    signal = 'slightly positive';
  } else if (avgSentiment < -0.4) {
    signal = 'negative sentiment - bearish';
  } else if (avgSentiment < -0.2) {
    signal = 'slightly negative';
  }

  return {
    type: 'sentiment',
    avgSentiment,
    newsCount: news.length,
    signal,
    confidence
  };
}

// Ensemble prediction - combines all methods
export function ensemblePrediction(data, news) {
  const predictions = {
    linear: linearRegressionPrediction(data),
    ma: maPrediction(data),
    rsi: rsiPrediction(data),
    macd: macdPrediction(data),
    bollinger: bollingerPrediction(data),
    volatility: volatilityPrediction(data)
  };

  if (news && news.length > 0) {
    predictions.sentiment = sentimentPrediction(news);
  }

  // Calculate overall prediction
  let bullishSignals = 0;
  let bearishSignals = 0;
  let totalConfidence = 0;

  // Moving Average
  if (predictions.ma.trend === 'bullish') bullishSignals += predictions.ma.confidence;
  else if (predictions.ma.trend === 'bearish') bearishSignals += predictions.ma.confidence;
  totalConfidence += predictions.ma.confidence;

  // RSI
  if (predictions.rsi.signal.includes('up') || predictions.rsi.signal.includes('bullish')) {
    bullishSignals += predictions.rsi.confidence;
  } else if (predictions.rsi.signal.includes('down') || predictions.rsi.signal.includes('bearish')) {
    bearishSignals += predictions.rsi.confidence;
  }
  totalConfidence += predictions.rsi.confidence;

  // MACD
  if (predictions.macd.signal.includes('bullish')) bullishSignals += predictions.macd.confidence;
  else if (predictions.macd.signal.includes('bearish')) bearishSignals += predictions.macd.confidence;
  totalConfidence += predictions.macd.confidence;

  // Bollinger
  if (predictions.bollinger.signal.includes('bounce') || predictions.bollinger.signal.includes('bullish')) {
    bullishSignals += predictions.bollinger.confidence;
  } else if (predictions.bollinger.signal.includes('pullback') || predictions.bollinger.signal.includes('bearish')) {
    bearishSignals += predictions.bollinger.confidence;
  }
  totalConfidence += predictions.bollinger.confidence;

  // Sentiment (if available)
  if (predictions.sentiment) {
    if (predictions.sentiment.signal.includes('positive') || predictions.sentiment.signal.includes('bullish')) {
      bullishSignals += predictions.sentiment.confidence;
    } else if (predictions.sentiment.signal.includes('negative') || predictions.sentiment.signal.includes('bearish')) {
      bearishSignals += predictions.sentiment.confidence;
    }
    totalConfidence += predictions.sentiment.confidence;
  }

  // Determine overall direction
  const totalSignals = bullishSignals + bearishSignals;
  const bullishPercent = totalSignals > 0 ? (bullishSignals / totalSignals) * 100 : 50;

  let overallSignal = 'HOLD';
  if (bullishPercent > 60) overallSignal = 'BUY';
  else if (bullishPercent < 40) overallSignal = 'SELL';

  // Overall confidence
  const overallConfidence = Math.min(85, Math.max(40, (bullishPercent - 50) * 2 + 50));

  // Price targets
  const currentPrice = data[data.length - 1].close;
  // Get last valid ATR value (filter out nulls)
  const atrArray = predictions.volatility.atr;
  const validAtrValues = atrArray.filter(v => v !== null && !isNaN(v));
  const atr = validAtrValues.length > 0 ? validAtrValues[validAtrValues.length - 1] : currentPrice * 0.02; // Fallback to 2% of price if no ATR

  // Fallback targets if ATR calculation fails
  const targetHigh = isNaN(atr) || atr === 0 ? currentPrice * 1.05 : currentPrice + atr * 2;
  const targetLow = isNaN(atr) || atr === 0 ? currentPrice * 0.95 : currentPrice - atr * 2;

  return {
    type: 'ensemble',
    signal: overallSignal,
    confidence: Math.round(overallConfidence),
    bullishPercent: Math.round(bullishPercent),
    predictions,
    target: {
      high: Math.round(targetHigh * 100) / 100,
      low: Math.round(targetLow * 100) / 100,
      current: currentPrice
    },
    timestamp: new Date().toISOString()
  };
}

// Main prediction function
export async function getPrediction(historicalData, symbol) {
  try {
    // Fetch news for the symbol
    const { getNews } = await import('./newsService.js');
    const news = await getNews(symbol, 10);

    // Generate ensemble prediction
    const prediction = ensemblePrediction(historicalData, news);

    return {
      symbol,
      ...prediction,
      historical: {
        lastPrice: historicalData[historicalData.length - 1].close,
        lastDate: historicalData[historicalData.length - 1].date
      }
    };
  } catch (error) {
    console.error('Error generating prediction:', error);
    return {
      symbol,
      error: error.message,
      signal: 'ERROR',
      confidence: 0
    };
  }
}