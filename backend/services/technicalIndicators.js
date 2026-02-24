// Technical Indicators Service
// Implements all major technical indicators for stock analysis

// Simple Moving Average
export function calculateSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push(sum / period);
    }
  }
  return result;
}

// Exponential Moving Average
export function calculateEMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  result.push(sum / period);

  for (let i = period; i < data.length; i++) {
    const ema = (data[i].close - result[i - 1]) * multiplier + result[i - 1];
    result.push(ema);
  }

  // Fill nulls for initial period
  for (let i = 0; i < period - 1; i++) {
    result[i] = null;
  }

  return result;
}

// Weighted Moving Average
export function calculateWMA(data, period) {
  const result = [];
  const weightSum = (period * (period + 1)) / 2;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let weightedSum = 0;
      for (let j = 0; j < period; j++) {
        weightedSum += data[i - j].close * (period - j);
      }
      result.push(weightedSum / weightSum);
    }
  }
  return result;
}

// Relative Strength Index
export function calculateRSI(data, period = 14) {
  const result = [];
  const gains = [];
  const losses = [];

  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // First RSI value
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  result.push(null); // First item has no RSI

  for (let i = 1; i < period; i++) {
    result.push(null);
  }

  // Calculate RSI
  if (avgLoss === 0) {
    result.push(100);
  } else {
    const rs = avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }

  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // MACD Line
  const macdLine = [];
  for (let i = 0; i < data.length; i++) {
    if (fastEMA[i] && slowEMA[i]) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    } else {
      macdLine.push(null);
    }
  }

  // Signal Line (EMA of MACD)
  const signalLine = [];
  const validMacd = macdLine.filter(v => v !== null);
  const multiplier = 2 / (signalPeriod + 1);

  let validIndex = 0;
  let firstValid = null;

  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      signalLine.push(null);
    } else {
      if (firstValid === null) {
        // Initialize with SMA of first signalPeriod values
        const startIdx = i - signalPeriod + 1;
        if (startIdx >= 0) {
          const slice = macdLine.slice(startIdx, i + 1).filter(v => v !== null);
          if (slice.length === signalPeriod) {
            firstValid = slice.reduce((a, b) => a + b, 0) / signalPeriod;
            signalLine.push(firstValid);
            validIndex = i + 1;
          } else {
            signalLine.push(null);
          }
        } else {
          signalLine.push(null);
        }
      } else {
        const signal = (macdLine[i] - signalLine[i - 1]) * multiplier + signalLine[i - 1];
        signalLine.push(signal);
      }
    }
  }

  // Histogram
  const histogram = [];
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram.push(macdLine[i] - signalLine[i]);
    } else {
      histogram.push(null);
    }
  }

  return {
    macd: macdLine,
    signal: signalLine,
    histogram
  };
}

// Bollinger Bands
export function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const sma = calculateSMA(data, period);
  const upper = [];
  const lower = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      // Calculate standard deviation
      let sum = 0;
      for (let j = 0; j < period; j++) {
        const diff = data[i - j].close - sma[i];
        sum += diff * diff;
      }
      const std = Math.sqrt(sum / period);

      upper.push(sma[i] + stdDev * std);
      lower.push(sma[i] - stdDev * std);
    }
  }

  return { middle: sma, upper, lower };
}

// Stochastic Oscillator
export function calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
  const kLine = [];
  const dLine = [];

  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      kLine.push(null);
      continue;
    }

    let highestHigh = data[i - kPeriod + 1].high;
    let lowestLow = data[i - kPeriod + 1].low;

    for (let j = 1; j < kPeriod; j++) {
      highestHigh = Math.max(highestHigh, data[i - j].high);
      lowestLow = Math.min(lowestLow, data[i - j].low);
    }

    const k = highestHigh === lowestLow ? 50 :
      ((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
    kLine.push(k);
  }

  // D-Line (SMA of K)
  for (let i = 0; i < kLine.length; i++) {
    if (i < dPeriod - 1 || kLine[i] === null) {
      dLine.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < dPeriod; j++) {
        if (kLine[i - j] !== null) {
          sum += kLine[i - j];
        }
      }
      dLine.push(sum / dPeriod);
    }
  }

  return { k: kLine, d: dLine };
}

// Average True Range (ATR)
export function calculateATR(data, period = 14) {
  const tr = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
    } else {
      const hl = data[i].high - data[i].low;
      const hc = Math.abs(data[i].high - data[i - 1].close);
      const lc = Math.abs(data[i].low - data[i - 1].close);
      tr.push(Math.max(hl, hc, lc));
    }
  }

  const result = [];

  // First ATR is SMA of TR
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  result.push(sum / period);

  for (let i = period; i < tr.length; i++) {
    const atr = (result[i - 1] * (period - 1) + tr[i]) / period;
    result.push(atr);
  }

  // Fill initial nulls
  for (let i = 0; i < period - 1; i++) {
    result[i] = null;
  }

  return result;
}

// Average Directional Index (ADX)
export function calculateADX(data, period = 14) {
  const plusDM = [];
  const minusDM = [];
  const tr = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      tr.push(data[i].high - data[i].low);
      plusDM.push(0);
      minusDM.push(0);
    } else {
      const hl = data[i].high - data[i].low;
      const upMove = data[i].high - data[i - 1].high;
      const downMove = data[i - 1].low - data[i].low;

      tr.push(Math.max(hl, Math.abs(data[i].high - data[i - 1].close), Math.abs(data[i].low - data[i - 1].close)));

      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
  }

  // Smooth ATR
  const atr = calculateATR(data, period);

  // Smooth DM
  const smoothPlusDM = [];
  const smoothMinusDM = [];

  let sumPlus = 0, sumMinus = 0;
  for (let i = 0; i < period; i++) {
    sumPlus += plusDM[i];
    sumMinus += minusDM[i];
  }
  smoothPlusDM.push(sumPlus / period);
  smoothMinusDM.push(sumMinus / period);

  for (let i = period; i < plusDM.length; i++) {
    smoothPlusDM.push((smoothPlusDM[i - period] * (period - 1) + plusDM[i]) / period);
    smoothMinusDM.push((smoothMinusDM[i - period] * (period - 1) + minusDM[i]) / period);
  }

  // +DI and -DI
  const plusDI = [];
  const minusDI = [];

  for (let i = 0; i < period; i++) {
    plusDI.push(null);
    minusDI.push(null);
  }

  for (let i = period; i < data.length; i++) {
    if (atr[i]) {
      plusDI.push((smoothPlusDM[i] / atr[i]) * 100);
      minusDI.push((smoothMinusDM[i] / atr[i]) * 100);
    } else {
      plusDI.push(null);
      minusDI.push(null);
    }
  }

  // DX
  const dx = [];
  for (let i = 0; i < data.length; i++) {
    if (plusDI[i] === null || minusDI[i] === null) {
      dx.push(null);
    } else {
      const diSum = plusDI[i] + minusDI[i];
      if (diSum === 0) {
        dx.push(0);
      } else {
        dx.push((Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100);
      }
    }
  }

  // ADX
  const adx = [];
  let sumDx = 0;
  for (let i = 0; i < period; i++) {
    if (dx[i] !== null) sumDx += dx[i];
  }
  adx.push(sumDx / period);

  for (let i = period; i < dx.length; i++) {
    if (dx[i] !== null) {
      adx.push((adx[i - 1] * (period - 1) + dx[i]) / period);
    } else {
      adx.push(null);
    }
  }

  return { adx, plusDI, minusDI };
}

// Commodity Channel Index (CCI)
export function calculateCCI(data, period = 20) {
  const typicalPrice = data.map(d => (d.high + d.low + d.close) / 3);
  const sma = calculateSMA(data.map((_, i) => ({ close: typicalPrice[i] })), period);

  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || sma[i] === null) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += Math.abs(typicalPrice[i - j] - sma[i]);
      }
      const meanDeviation = sum / period;
      if (meanDeviation === 0) {
        result.push(0);
      } else {
        result.push((typicalPrice[i] - sma[i]) / (0.015 * meanDeviation));
      }
    }
  }

  return result;
}

// Ichimoku Cloud
export function calculateIchimoku(data, conversionPeriod = 9, basePeriod = 26, spanPeriod = 52, displacement = 26) {
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  const close = data.map(d => d.close);

  // Tenkan-sen (Conversion Line)
  const tenkanSen = [];
  for (let i = 0; i < data.length; i++) {
    if (i < conversionPeriod - 1) {
      tenkanSen.push(null);
    } else {
      let max = high[i - conversionPeriod + 1];
      let min = low[i - conversionPeriod + 1];
      for (let j = 1; j < conversionPeriod; j++) {
        max = Math.max(max, high[i - j]);
        min = Math.min(min, low[i - j]);
      }
      tenkanSen.push((max + min) / 2);
    }
  }

  // Kijun-sen (Base Line)
  const kijunSen = [];
  for (let i = 0; i < data.length; i++) {
    if (i < basePeriod - 1) {
      kijunSen.push(null);
    } else {
      let max = high[i - basePeriod + 1];
      let min = low[i - basePeriod + 1];
      for (let j = 1; j < basePeriod; j++) {
        max = Math.max(max, high[i - j]);
        min = Math.min(min, low[i - j]);
      }
      kijunSen.push((max + min) / 2);
    }
  }

  // Senkou Span A (Leading Span A)
  const senkouSpanA = [];
  for (let i = 0; i < data.length; i++) {
    if (tenkanSen[i] === null || kijunSen[i] === null) {
      senkouSpanA.push(null);
    } else {
      senkouSpanA.push((tenkanSen[i] + kijunSen[i]) / 2);
    }
  }

  // Senkou Span B (Leading Span B)
  const senkouSpanB = [];
  for (let i = 0; i < data.length; i++) {
    if (i < spanPeriod - 1) {
      senkouSpanB.push(null);
    } else {
      let max = high[i - spanPeriod + 1];
      let min = low[i - spanPeriod + 1];
      for (let j = 1; j < spanPeriod; j++) {
        max = Math.max(max, high[i - j]);
        min = Math.min(min, low[i - j]);
      }
      senkouSpanB.push((max + min) / 2);
    }
  }

  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB };
}

// Fibonacci Retracements
export function calculateFibonacci(data) {
  if (data.length < 2) return null;

  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);

  const max = Math.max(...highs);
  const min = Math.min(...lows);
  const diff = max - min;

  return {
    level0: max,
    level236: max - diff * 0.236,
    level382: max - diff * 0.382,
    level500: max - diff * 0.5,
    level618: max - diff * 0.618,
    level786: max - diff * 0.786,
    level100: min
  };
}

// On-Balance Volume (OBV)
export function calculateOBV(data) {
  const result = [0];

  for (let i = 1; i < data.length; i++) {
    if (data[i].close > data[i - 1].close) {
      result.push(result[i - 1] + data[i].volume);
    } else if (data[i].close < data[i - 1].close) {
      result.push(result[i - 1] - data[i].volume);
    } else {
      result.push(result[i - 1]);
    }
  }

  return result;
}

// Volume Weighted Average Price (VWAP)
export function calculateVWAP(data) {
  const result = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < data.length; i++) {
    const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
    cumulativeTPV += typicalPrice * data[i].volume;
    cumulativeVolume += data[i].volume;

    if (cumulativeVolume === 0) {
      result.push(typicalPrice);
    } else {
      result.push(cumulativeTPV / cumulativeVolume);
    }
  }

  return result;
}

// Rate of Change (ROC)
export function calculateROC(data, period = 12) {
  const result = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
    } else {
      const roc = ((data[i].close - data[i - period].close) / data[i - period].close) * 100;
      result.push(roc);
    }
  }

  return result;
}

// Calculate all indicators at once
export function calculateAllIndicators(historicalData) {
  if (!historicalData || historicalData.length === 0) {
    return null;
  }

  // Ensure we have enough data
  const data = historicalData.length < 200
    ? historicalData
    : historicalData.slice(-200);

  return {
    sma20: calculateSMA(data, 20),
    sma50: calculateSMA(data, 50),
    sma200: calculateSMA(data, 200),
    ema12: calculateEMA(data, 12),
    ema26: calculateEMA(data, 26),
    ema50: calculateEMA(data, 50),
    ema200: calculateEMA(data, 200),
    rsi: calculateRSI(data, 14),
    macd: calculateMACD(data),
    bollingerBands: calculateBollingerBands(data),
    stochastic: calculateStochastic(data),
    atr: calculateATR(data),
    adx: calculateADX(data),
    cci: calculateCCI(data),
    ichimoku: calculateIchimoku(data),
    fibonacci: calculateFibonacci(data),
    obv: calculateOBV(data),
    vwap: calculateVWAP(data),
    roc: calculateROC(data),
    timestamps: data.map(d => d.date)
  };
}