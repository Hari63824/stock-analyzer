import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db = null;

// Initialize the database
export async function initDatabase() {
  const SQL = await initSqlJs();

  const dbPath = path.join(__dirname, '..', 'data', 'stockanalizer.db');

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_premium INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0,
      subscription_start DATETIME,
      subscription_end DATETIME,
      stripe_customer_id TEXT,
      razorpay_customer_id TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      target_price REAL NOT NULL,
      condition TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      triggered_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS portfolio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      avg_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symbol TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  saveDatabase();
  console.log('Database initialized');
}

// Save database to file
function saveDatabase() {
  if (!db) return;
  const dbPath = path.join(__dirname, '..', 'data', 'stockanalizer.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// User operations
export function createUser(email, password, name) {
  // Check if this is the first user - make them super admin
  const countResult = db.exec('SELECT COUNT(*) as count FROM users');
  const userCount = countResult[0]?.values[0][0] || 0;
  const isFirstUser = userCount === 0;

  const stmt = db.prepare('INSERT INTO users (email, password, name, is_admin) VALUES (?, ?, ?, ?)');
  stmt.run([email, password, name, isFirstUser ? 1 : 0]);
  stmt.free();
  saveDatabase();
  return getUserByEmail(email);
}

export function getUserByEmail(email) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  stmt.bind([email]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function getUserById(id) {
  const stmt = db.prepare('SELECT id, email, name, is_premium, is_admin, subscription_start, subscription_end, created_at FROM users WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

// Admin functions
export function getAllUsers() {
  const results = [];
  const stmt = db.prepare('SELECT id, email, name, is_premium, is_admin, subscription_start, subscription_end, created_at FROM users ORDER BY created_at DESC');
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function updateUserAdmin(userId, isAdmin) {
  const stmt = db.prepare('UPDATE users SET is_admin = ? WHERE id = ?');
  stmt.run(isAdmin ? 1 : 0, userId);
  stmt.free();
  saveDatabase();
}

export function deleteUser(userId) {
  // Delete user's alerts, portfolio, transactions first
  db.run('DELETE FROM alerts WHERE user_id = ?', [userId]);
  db.run('DELETE FROM portfolio WHERE user_id = ?', [userId]);
  db.run('DELETE FROM transactions WHERE user_id = ?', [userId]);
  db.run('DELETE FROM users WHERE id = ?', [userId]);
  saveDatabase();
}

export function updateUserPremium(userId, isPremium, startDate, endDate) {
  const stmt = db.prepare('UPDATE users SET is_premium = ?, subscription_start = ?, subscription_end = ? WHERE id = ?');
  stmt.run([isPremium ? 1 : 0, startDate, endDate, userId]);
  stmt.free();
  saveDatabase();
}

export function setStripeCustomerId(userId, customerId) {
  const stmt = db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?');
  stmt.run([customerId, userId]);
  stmt.free();
  saveDatabase();
}

// Alert operations
export function createAlert(userId, symbol, targetPrice, condition) {
  const stmt = db.prepare('INSERT INTO alerts (user_id, symbol, target_price, condition) VALUES (?, ?, ?, ?)');
  stmt.run([userId, symbol, targetPrice, condition]);
  stmt.free();
  saveDatabase();
  return db.exec('SELECT last_insert_rowid() as id')[0].values[0][0];
}

export function getUserAlerts(userId) {
  const results = [];
  const stmt = db.prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC');
  stmt.bind([userId]);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function deleteAlert(alertId, userId) {
  const stmt = db.prepare('DELETE FROM alerts WHERE id = ? AND user_id = ?');
  stmt.run([alertId, userId]);
  stmt.free();
  saveDatabase();
}

export function getActiveAlerts() {
  const results = [];
  const stmt = db.prepare('SELECT * FROM alerts WHERE is_active = 1');
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function triggerAlert(alertId) {
  const stmt = db.prepare('UPDATE alerts SET is_active = 0, triggered_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run([alertId]);
  stmt.free();
  saveDatabase();
}

// Portfolio operations
export function getUserPortfolio(userId) {
  const results = [];
  const stmt = db.prepare('SELECT * FROM portfolio WHERE user_id = ?');
  stmt.bind([userId]);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function addToPortfolio(userId, symbol, quantity, avgPrice) {
  // Check if position exists
  const stmt = db.prepare('SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?');
  stmt.bind([userId, symbol]);
  if (stmt.step()) {
    const existing = stmt.getAsObject();
    stmt.free();

    // Calculate new average price
    const totalQty = existing.quantity + quantity;
    const newAvgPrice = ((existing.avg_price * existing.quantity) + (avgPrice * quantity)) / totalQty;

    const updateStmt = db.prepare('UPDATE portfolio SET quantity = ?, avg_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    updateStmt.run([totalQty, newAvgPrice, existing.id]);
    updateStmt.free();
  } else {
    stmt.free();
    const insertStmt = db.prepare('INSERT INTO portfolio (user_id, symbol, quantity, avg_price) VALUES (?, ?, ?, ?)');
    insertStmt.run([userId, symbol, quantity, avgPrice]);
    insertStmt.free();
  }
  saveDatabase();
}

export function removeFromPortfolio(userId, symbol, quantity) {
  const stmt = db.prepare('SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?');
  stmt.bind([userId, symbol]);
  if (stmt.step()) {
    const existing = stmt.getAsObject();
    stmt.free();

    if (existing.quantity <= quantity) {
      const deleteStmt = db.prepare('DELETE FROM portfolio WHERE id = ?');
      deleteStmt.run([existing.id]);
      deleteStmt.free();
    } else {
      const updateStmt = db.prepare('UPDATE portfolio SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      updateStmt.run([quantity, existing.id]);
      updateStmt.free();
    }
  } else {
    stmt.free();
  }
  saveDatabase();
}

// Transaction operations
export function addTransaction(userId, symbol, type, quantity, price) {
  const total = quantity * price;
  const stmt = db.prepare('INSERT INTO transactions (user_id, symbol, type, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run([userId, symbol, type, quantity, price, total]);
  stmt.free();
  saveDatabase();
}

export function getUserTransactions(userId, limit = 50) {
  const results = [];
  const stmt = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?');
  stmt.bind([userId, limit]);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export default {
  initDatabase,
  createUser,
  getUserByEmail,
  getUserById,
  updateUserPremium,
  setStripeCustomerId,
  // Admin functions
  getAllUsers,
  updateUserAdmin,
  deleteUser,
  // Alert functions
  createAlert,
  getUserAlerts,
  deleteAlert,
  getActiveAlerts,
  triggerAlert,
  // Portfolio functions
  getUserPortfolio,
  addToPortfolio,
  removeFromPortfolio,
  // Transaction functions
  addTransaction,
  getUserTransactions
};