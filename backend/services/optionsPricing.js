// Options Pricing Service
// Implements Black-Scholes model and Greeks calculation

import { normalCDF, normalPDF } from './mathUtils.js';

// Black-Scholes Option Pricing Model
export function calculateBlackScholes(S, K, T, r, sigma, type = 'call') {
  // S: Current stock price
  // K: Strike price
  // T: Time to expiration (in years)
  // r: Risk-free interest rate
  // sigma: Volatility
  // type: 'call' or 'put'

  if (T <= 0) {
    // Option expired
    return type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
  }

  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (type === 'call') {
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
  } else {
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
  }
}

// Calculate all Greeks
export function calculateGreeks(S, K, T, r, sigma, type = 'call') {
  if (T <= 0) {
    return {
      delta: 0,
      gamma: 0,
      theta: 0,
      vega: 0,
      rho: 0
    };
  }

  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  const sqrtT = Math.sqrt(T);
  const expRT = Math.exp(-r * T);
  const sqrt2PI = Math.sqrt(2 * Math.PI);

  // Delta
  let delta;
  if (type === 'call') {
    delta = normalCDF(d1);
  } else {
    delta = normalCDF(d1) - 1;
  }

  // Gamma (same for calls and puts)
  const gamma = normalPDF(d1) / (S * sigma * sqrtT);

  // Theta (annual)
  let theta;
  const thetaCommon = -S * normalPDF(d1) * sigma / (2 * sqrtT);

  if (type === 'call') {
    theta = thetaCommon - r * K * expRT * normalCDF(d2);
  } else {
    theta = thetaCommon + r * K * expRT * normalCDF(-d2);
  }

  // Convert to daily theta (divide by 365)
  theta = theta / 365;

  // Vega (same for calls and puts)
  const vega = S * sqrtT * normalPDF(d1) / 100; // Divide by 100 for 1% change

  // Rho
  let rho;
  if (type === 'call') {
    rho = K * T * expRT * normalCDF(d2) / 100; // Divide by 100 for 1% change
  } else {
    rho = -K * T * expRT * normalCDF(-d2) / 100;
  }

  return {
    delta: Math.round(delta * 10000) / 10000,
    gamma: Math.round(gamma * 1000000) / 1000000,
    theta: Math.round(theta * 10000) / 10000,
    vega: Math.round(vega * 10000) / 10000,
    rho: Math.round(rho * 10000) / 10000
  };
}

// Calculate Implied Volatility using Newton-Raphson method
export function calculateImpliedVolatility(S, K, T, r, marketPrice, type = 'call') {
  if (T <= 0) return null;

  // Initial guess: 30% volatility
  let sigma = 0.3;
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    const theoreticalPrice = calculateBlackScholes(S, K, T, r, sigma, type);
    const diff = marketPrice - theoreticalPrice;

    // Vega
    const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
    const vega = S * Math.sqrt(T) * normalPDF(d1);

    if (Math.abs(diff) < tolerance) {
      return sigma;
    }

    if (vega === 0) {
      // Try different approach
      sigma += 0.01;
      continue;
    }

    sigma = sigma + diff / vega;

    // Clamp sigma to reasonable range
    sigma = Math.max(0.01, Math.min(3.0, sigma));
  }

  return sigma;
}

// Calculate Put-Call Parity
export function calculatePutCallParity(callPrice, putPrice, S, K, T, r) {
  const syntheticCall = putPrice + S - K * Math.exp(-r * T);
  const syntheticPut = callPrice - S + K * Math.exp(-r * T);

  return {
    syntheticCall,
    syntheticPut,
    parity: Math.abs(callPrice - syntheticCall) < 0.01
  };
}

// Calculate Option Greeks for a range of strikes
export function calculateOptionsChainGreeks(spotPrice, strikes, T, r, sigma, type = 'call') {
  return strikes.map(K => {
    const price = calculateBlackScholes(spotPrice, K, T, r, sigma, type);
    const greeks = calculateGreeks(spotPrice, K, T, r, sigma, type);
    return {
      strike: K,
      price,
      ...greeks
    };
  });
}

// Breakeven calculation
export function calculateBreakeven(K, T, r, sigma, type = 'call') {
  // Approximate breakeven using Black-Scholes
  if (type === 'call') {
    return K * Math.exp(r * T);
  } else {
    return K * Math.exp(-r * T);
  }
}

// Maximum Loss calculation
export function calculateMaxLoss(premium, type = 'call') {
  return type === 'call' ? premium : premium;
}

// Calculate profit/loss for different scenarios
export function calculatePayoff(strike, premium, spotAtExpiry, type = 'call') {
  let intrinsic;
  if (type === 'call') {
    intrinsic = Math.max(0, spotAtExpiry - strike);
  } else {
    intrinsic = Math.max(0, strike - spotAtExpiry);
  }

  const pnl = type === 'call'
    ? intrinsic - premium
    : premium - intrinsic;

  return {
    intrinsic,
    pnl,
    roi: (pnl / premium) * 100
  };
}