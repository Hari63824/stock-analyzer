import axios from 'axios';

// ============ IN-MEMORY CACHE ============
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache for quotes
const HISTORICAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for historical data

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttl = CACHE_TTL) {
  cache.set(key, {
    data,
    expires: Date.now() + ttl
  });
}

// Generate demo data for stocks
const generateDemoData = (symbol, days = 365) => {
  const data = [];
  let basePrice = symbol.includes('RELIANCE') ? 2850 :
    symbol.includes('TCS') ? 3850 :
      symbol.includes('INFY') ? 1450 :
        symbol.includes('HDFC') ? 1650 :
          symbol === 'AAPL' ? 185 :
            symbol === 'GOOGL' ? 142 :
              symbol === 'MSFT' ? 378 :
                symbol === 'AMZN' ? 178 :
                  symbol === 'TSLA' ? 248 :
                    symbol === 'NVDA' ? 495 : 100;

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.48) * (basePrice * 0.03);
    basePrice = Math.max(basePrice * 0.5, basePrice + change);

    data.push({
      date: date.toISOString(),
      open: basePrice - Math.random() * 5,
      high: basePrice + Math.random() * 10,
      low: basePrice - Math.random() * 10,
      close: basePrice,
      volume: Math.floor(Math.random() * 50000000) + 1000000,
      adjClose: basePrice
    });
  }
  return data;
};

// Get real-time quote for a symbol (with caching)
export async function getQuote(symbol) {
  const cacheKey = `quote_${symbol}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`Cache hit for ${symbol}`);
    return cached;
  }

  try {
    // Try to fetch from a free API (query1.finance.yahoo.com)
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const result = response.data.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const meta = result.meta;
    const quote = result.indicators?.quote?.[0];

    const quoteData = {
      symbol: meta.symbol,
      name: meta.shortName || meta.longName || symbol,
      price: meta.regularMarketPrice || meta.previousClose || 0,
      change: meta.regularMarketPrice - meta.chartPreviousClose || 0,
      changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100) || 0,
      open: quote?.open?.[quote.open.length - 1] || meta.regularMarketOpen || 0,
      high: quote?.high?.[quote.high.length - 1] || meta.regularMarketDayHigh || 0,
      low: quote?.low?.[quote.low.length - 1] || meta.regularMarketDayLow || 0,
      volume: meta.regularMarketVolume || 0,
      marketCap: 0,
      pe: 0,
      dividend: 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || 0,
      timestamp: new Date().toISOString()
    };
    setCache(cacheKey, quoteData);
    return quoteData;
  } catch (error) {
    console.log(`Using demo data for ${symbol}:`, error.message);
    // Return demo data as fallback
    const demoData = generateDemoData(symbol, 30);
    const latest = demoData[demoData.length - 1];
    const first = demoData[0];

    const demoQuote = {
      symbol,
      name: symbol,
      price: latest.close,
      change: latest.close - first.close,
      changePercent: ((latest.close - first.close) / first.close) * 100,
      open: latest.open,
      high: latest.high,
      low: latest.low,
      volume: latest.volume,
      marketCap: symbol.includes('AAPL') ? 2800000000000 :
        symbol.includes('MSFT') ? 2800000000000 :
          symbol.includes('RELIANCE') ? 19000000000000 : 1000000000000,
      pe: Math.random() * 30 + 10,
      dividend: Math.random() * 3,
      fiftyTwoWeekHigh: latest.close * 1.2,
      fiftyTwoWeekLow: latest.close * 0.7,
      timestamp: new Date().toISOString()
    };
    // Cache demo data too but for shorter time
    setCache(cacheKey, demoQuote, 30 * 1000);
    return demoQuote;
  }
}

// Get historical data (with caching)
export async function getHistoricalData(symbol, period = '1y', interval = '1d') {
  const cacheKey = `historical_${symbol}_${period}_${interval}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const periodDays = {
      '1d': 7,
      '5d': 14,
      '1mo': 35,
      '3mo': 100,
      '6mo': 180,
      '1y': 365,
      '2y': 730,
      '5y': 1825
    };

    const days = periodDays[period] || 365;

    // Try Yahoo Finance API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
    const endTime = Math.floor(Date.now() / 1000);
    const startTime = endTime - (days * 24 * 60 * 60);

    const response = await axios.get(url, {
      timeout: 5000,
      params: {
        period1: startTime,
        period2: endTime,
        interval: interval
      },
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    const result = response.data.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const adjClose = result.indicators?.adjclose?.[0]?.adjclose || quotes.close || [];

    const historicalData = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString(),
      open: quotes.open?.[i] || 0,
      high: quotes.high?.[i] || 0,
      low: quotes.low?.[i] || 0,
      close: quotes.close?.[i] || 0,
      volume: quotes.volume?.[i] || 0,
      adjClose: adjClose[i] || quotes.close?.[i] || 0
    }));
    setCache(cacheKey, historicalData, HISTORICAL_CACHE_TTL);
    return historicalData;
  } catch (error) {
    console.log(`Using demo data for historical ${symbol}:`, error.message);
    // Return demo data
    const demoData = generateDemoData(symbol, periodDays[period] || 365);
    setCache(cacheKey, demoData, HISTORICAL_CACHE_TTL);
    return demoData;
  }
}

// Search for symbols
export async function searchSymbols(query) {
  // Return predefined list based on query
  const allSymbols = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd', exchange: 'NSE', type: 'EQUITY' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services', exchange: 'NSE', type: 'EQUITY' },
    { symbol: 'INFY.NS', name: 'Infosys Ltd', exchange: 'NSE', type: 'EQUITY' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', exchange: 'NSE', type: 'EQUITY' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd', exchange: 'NSE', type: 'EQUITY' },
    { symbol: 'SBIN.NS', name: 'State Bank of India', exchange: 'NSE', type: 'EQUITY' },
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', type: 'EQUITY' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
    { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', type: 'EQUITY' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'EQUITY' }
  ];

  const q = query.toLowerCase();
  return allSymbols.filter(s =>
    s.symbol.toLowerCase().includes(q) ||
    s.name.toLowerCase().includes(q)
  );
}

// Get options chain - returns simulated data
export async function getOptionsChain(symbol) {
  try {
    // Try Yahoo Finance options
    const url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
    const response = await axios.get(url, {
      timeout: 5000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const result = response.data.optionChain?.result?.[0];
    if (!result) throw new Error('No options data');

    return {
      symbol: result.symbol,
      expirationDates: result.expirationDates || [],
      strikes: result.strikes || [],
      calls: (result.calls || []).slice(0, 20).map(c => ({
        contractName: c.contractSymbol,
        strike: c.strike,
        lastPrice: c.lastPrice,
        bid: c.bid,
        ask: c.ask,
        volume: c.volume,
        openInterest: c.openInterest,
        impliedVolatility: c.impliedVolatility,
        inTheMoney: c.inTheMoney
      })),
      puts: (result.puts || []).slice(0, 20).map(p => ({
        contractName: p.contractSymbol,
        strike: p.strike,
        lastPrice: p.lastPrice,
        bid: p.bid,
        ask: p.ask,
        volume: p.volume,
        openInterest: p.openInterest,
        impliedVolatility: p.impliedVolatility,
        inTheMoney: p.inTheMoney
      }))
    };
  } catch (error) {
    console.log(`Using demo options for ${symbol}:`, error.message);
    // Return simulated options chain
    const quote = await getQuote(symbol);
    const currentPrice = quote.price;
    const strikes = [];
    for (let i = -5; i <= 5; i++) {
      strikes.push(Math.round(currentPrice / 50) * 50 + i * 50);
    }

    return {
      symbol,
      expirationDates: [
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      ],
      strikes,
      calls: strikes.map(s => ({
        contractName: `${symbol}${new Date().getFullYear()}${String(s).padStart(5, '0')}C`,
        strike: s,
        lastPrice: Math.abs(currentPrice - s) * 0.6 + 10,
        bid: Math.abs(currentPrice - s) * 0.55 + 8,
        ask: Math.abs(currentPrice - s) * 0.65 + 12,
        volume: Math.floor(Math.random() * 100000),
        openInterest: Math.floor(Math.random() * 500000),
        impliedVolatility: 0.25 + Math.random() * 0.1,
        inTheMoney: s < currentPrice
      })),
      puts: strikes.map(s => ({
        contractName: `${symbol}${new Date().getFullYear()}${String(s).padStart(5, '0')}P`,
        strike: s,
        lastPrice: Math.abs(currentPrice - s) * 0.6 + 10,
        bid: Math.abs(currentPrice - s) * 0.55 + 8,
        ask: Math.abs(currentPrice - s) * 0.65 + 12,
        volume: Math.floor(Math.random() * 100000),
        openInterest: Math.floor(Math.random() * 500000),
        impliedVolatility: 0.25 + Math.random() * 0.1,
        inTheMoney: s > currentPrice
      }))
    };
  }
}

// Get futures data for Indian market
export async function getFuturesData(symbol) {
  // Return demo futures data
  const quote = await getQuote(symbol);
  return {
    ...quote,
    symbol: `${symbol}-FUT`,
    price: quote.price * 1.02
  };
}