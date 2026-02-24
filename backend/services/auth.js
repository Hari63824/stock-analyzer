import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createUser, getUserByEmail, getUserById } from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'stockanalizer-secret-key-2024';
const JWT_EXPIRES_IN = '30d';

// Register a new user
export async function register(email, password, name) {
  // Check if user already exists
  const existingUser = getUserByEmail(email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = createUser(email, hashedPassword, name);

  // Generate token
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.is_premium === 1,
      isAdmin: user.is_admin === 1
    },
    token
  };
}

// Login user
export async function login(email, password) {
  const user = getUserByEmail(email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      isPremium: user.is_premium === 1,
      isAdmin: user.is_admin === 1,
      subscriptionStart: user.subscription_start,
      subscriptionEnd: user.subscription_end
    },
    token
  };
}

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, isAdmin: user.is_admin === 1 },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Verify token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Auth middleware
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Get user from database
  const user = getUserById(decoded.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
}

// Premium middleware
export function premiumMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.is_premium !== 1) {
    return res.status(403).json({ error: 'Premium subscription required' });
  }

  next();
}

// Admin middleware
export function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.is_admin !== 1) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

export default {
  register,
  login,
  verifyToken,
  authMiddleware,
  premiumMiddleware,
  adminMiddleware
};