const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { sqlite, DB_PATH } = require('./sqlite-db');
const { pool, testConnection, initMySQLSchema } = require('./db');

const app = express();
const PORT = process.env.BACKEND_PORT || 5000;
const DB_TYPE = (process.env.DB_TYPE || 'sqlite').toLowerCase(); // 'sqlite' or 'mysql'

app.use(cors());
app.use(express.json());

console.log(`\n🚀 Initializing Login Backend with database: [${DB_TYPE.toUpperCase()}]`);

// -------------------------------------------------------------
// Database Helper Abstraction (Supports SQLite & MySQL)
// -------------------------------------------------------------
const dbService = {
  async findUserByEmail(email) {
    if (DB_TYPE === 'mysql') {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      return rows[0] || null;
    } else {
      const stmt = sqlite.prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
      return stmt.get(email) || null;
    }
  },

  async createUser(email, hashedPassword) {
    if (DB_TYPE === 'mysql') {
      const [result] = await pool.query('INSERT INTO users (email, password) VALUES (?, ?)', [
        email,
        hashedPassword,
      ]);
      return { id: result.insertId, email };
    } else {
      const stmt = sqlite.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
      const info = stmt.run(email, hashedPassword);
      return { id: Number(info.lastInsertRowid), email };
    }
  },

  async getAllUsers() {
    if (DB_TYPE === 'mysql') {
      const [rows] = await pool.query('SELECT id, email, created_at FROM users ORDER BY id DESC');
      return rows;
    } else {
      const stmt = sqlite.prepare('SELECT id, email, created_at FROM users ORDER BY id DESC');
      return stmt.all();
    }
  },
};

// -------------------------------------------------------------
// API Routes
// -------------------------------------------------------------

// Root / Health check
app.get(['/', '/api/health'], (req, res) => {
  res.json({
    status: 'online',
    database: DB_TYPE,
    databaseFile: DB_TYPE === 'sqlite' ? DB_PATH : 'MySQL (login_db)',
    endpoints: {
      register: 'POST /api/register or POST /register',
      login: 'POST /api/login or POST /login',
      users: 'GET /api/users or GET /users',
    },
    timestamp: new Date().toISOString(),
  });
});

// Register User
app.post(['/register', '/api/register'], async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const emailClean = String(email).trim().toLowerCase();
    if (!emailClean.includes('@') || emailClean.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address.',
      });
    }

    if (String(password).length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 4 characters long.',
      });
    }

    // Check if user already exists
    const existing = await dbService.findUserByEmail(emailClean);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.',
      });
    }

    // Hash password securely with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save to active database
    const newUser = await dbService.createUser(emailClean, hashedPassword);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        email: newUser.email,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during registration.',
      details: err.message,
    });
  }
});

// Login User
app.post(['/login', '/api/login'], async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
      });
    }

    const emailClean = String(email).trim().toLowerCase();
    const user = await dbService.findUserByEmail(emailClean);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: 'Internal server error during login.',
      details: err.message,
    });
  }
});

// List Users
app.get(['/users', '/api/users'], async (req, res) => {
  try {
    const users = await dbService.getAllUsers();
    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch users.',
    });
  }
});

// Start Server
if (require.main === module) {
  if (DB_TYPE === 'mysql') {
    testConnection().then((connected) => {
      if (!connected) {
        console.warn('⚠️ Starting server, but MySQL connection failed. Check your MySQL credentials in .env.');
      }
    });
  }

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`✅ Login Backend Server running at: http://localhost:${PORT}`);
    console.log(`📦 Database: ${DB_TYPE.toUpperCase()} (${DB_TYPE === 'sqlite' ? DB_PATH : 'login_db'})`);
    console.log(`🔌 Endpoints:`);
    console.log(`   - POST http://localhost:${PORT}/api/register`);
    console.log(`   - POST http://localhost:${PORT}/api/login`);
    console.log(`   - GET  http://localhost:${PORT}/api/users`);
    console.log(`   - GET  http://localhost:${PORT}/api/health`);
    console.log(`======================================================\n`);
  });
}

module.exports = { app, dbService };
