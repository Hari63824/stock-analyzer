import { createAlert, getUserAlerts, deleteAlert, getActiveAlerts, triggerAlert } from './database.js';
import { getQuote } from './yahooFinance.js';

// Create a new price alert
export function createPriceAlert(userId, symbol, targetPrice, condition = 'above') {
  if (!symbol || !targetPrice) {
    throw new Error('Symbol and target price are required');
  }

  if (condition !== 'above' && condition !== 'below') {
    throw new Error('Condition must be "above" or "below"');
  }

  const alertId = createAlert(userId, symbol, parseFloat(targetPrice), condition);
  return {
    id: alertId,
    symbol,
    targetPrice: parseFloat(targetPrice),
    condition,
    isActive: true
  };
}

// Get user's alerts
export function getAlerts(userId) {
  const alerts = getUserAlerts(userId);
  return alerts.map(alert => ({
    id: alert.id,
    symbol: alert.symbol,
    targetPrice: alert.target_price,
    condition: alert.condition,
    isActive: alert.is_active === 1,
    triggeredAt: alert.triggered_at,
    createdAt: alert.created_at
  }));
}

// Delete an alert
export function removeAlert(alertId, userId) {
  deleteAlert(alertId, userId);
  return { success: true, message: 'Alert deleted' };
}

// Check alerts against current prices
export async function checkAlerts() {
  const activeAlerts = getActiveAlerts();
  const triggered = [];

  // Group alerts by symbol to minimize API calls
  const symbols = [...new Set(activeAlerts.map(a => a.symbol))];

  const prices = {};
  for (const symbol of symbols) {
    try {
      const quote = await getQuote(symbol);
      prices[symbol] = quote.regularMarketPrice || quote.currentPrice;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error.message);
    }
  }

  // Check each alert
  for (const alert of activeAlerts) {
    const currentPrice = prices[alert.symbol];
    if (!currentPrice) continue;

    let shouldTrigger = false;
    if (alert.condition === 'above' && currentPrice >= alert.target_price) {
      shouldTrigger = true;
    } else if (alert.condition === 'below' && currentPrice <= alert.target_price) {
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      triggerAlert(alert.id);
      triggered.push({
        alertId: alert.id,
        userId: alert.user_id,
        symbol: alert.symbol,
        targetPrice: alert.target_price,
        currentPrice,
        condition: alert.condition
      });
    }
  }

  return triggered;
}

export default {
  createPriceAlert,
  getAlerts,
  removeAlert,
  checkAlerts
};