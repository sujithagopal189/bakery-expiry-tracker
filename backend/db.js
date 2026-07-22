const fs = require('fs');
const path = require('path');
let mysql;

try {
  mysql = require('mysql2/promise');
} catch (error) {
  mysql = null;
}

require('dotenv').config();

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const productsFile = path.join(dataDir, 'products.json');

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(usersFile)) {
    fs.writeFileSync(usersFile, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(productsFile)) {
    fs.writeFileSync(productsFile, JSON.stringify([], null, 2));
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function normalizeUser(user, index) {
  return {
    user_id: user.user_id || user.id || index + 1,
    user_name: user.user_name || user.name || user.storeName || user.email || 'User',
    email: user.email,
    password: user.password,
    role: user.role || 'user',
    created_at: user.created_at || new Date().toISOString()
  };
}

function normalizeUsers(users) {
  return (Array.isArray(users) ? users : []).map((user, index) => normalizeUser(user, index));
}

function normalizeProduct(product, index) {
  return {
    product_id: product.product_id || product.id || index + 1,
    product_name: product.product_name || product.name || 'Product',
    category: product.category || 'General',
    manufacturing_date: product.manufacturing_date || product.manufacturingDate || new Date().toISOString().slice(0, 10),
    expiry_date: product.expiry_date || product.expiryDate || new Date().toISOString().slice(0, 10),
    quantity: Number(product.quantity || 0),
    status: product.status || 'fresh',
    created_at: product.created_at || product.createdAt || new Date().toISOString(),
    updated_at: product.updated_at || product.updatedAt || new Date().toISOString()
  };
}

function normalizeProducts(products) {
  return (Array.isArray(products) ? products : []).map((product, index) => normalizeProduct(product, index));
}

function createFallbackState() {
  ensureDataFiles();
  const users = normalizeUsers(readJson(usersFile));
  const products = normalizeProducts(readJson(productsFile));

  if (!users.some((user) => user.email === 'sujithagopal158@gmail.com')) {
    users.push({
      user_id: Date.now(),
      user_name: 'Velan Admin',
      email: 'sujithagopal158@gmail.com',
      password: '$2a$10$0oslFiJoquF0xGK/nGdhMuHS9BF1iDIZuTjBrlO7K94fSBpT9QT9.',
      role: 'admin',
      created_at: new Date().toISOString()
    });
  }

  writeJson(usersFile, users);
  writeJson(productsFile, products);

  return { users, products, inventory: [], expiryTracking: [] };
}

const fallbackState = createFallbackState();

function createFallbackPool() {
  return {
    async execute(query, params = []) {
      const normalizedQuery = String(query).trim().toLowerCase();

      if (normalizedQuery.includes('select * from users where email')) {
        const email = params[0];
        const matches = fallbackState.users.filter((user) => user.email === email);
        return [matches, []];
      }

      if (normalizedQuery.includes('insert into users')) {
        const [userName, email, password, role] = params;
        const newUser = {
          user_id: Date.now(),
          user_name: userName,
          email,
          password,
          role: role || 'user',
          created_at: new Date().toISOString()
        };
        fallbackState.users.push(newUser);
        writeJson(usersFile, fallbackState.users);
        return [{ insertId: newUser.user_id }, []];
      }

      if (normalizedQuery.includes('select * from products order by created_at desc')) {
        return [fallbackState.products.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)), []];
      }

      if (normalizedQuery.includes('select * from products where product_id')) {
        const productId = Number(params[0]);
        const match = fallbackState.products.find((product) => product.product_id === productId);
        return [[match].filter(Boolean), []];
      }

      if (normalizedQuery.includes('insert into products')) {
        const [productName, category, manufacturingDate, expiryDate, quantity, status] = params;
        const newProduct = {
          product_id: Date.now(),
          product_name: productName,
          category,
          manufacturing_date: manufacturingDate,
          expiry_date: expiryDate,
          quantity: Number(quantity || 0),
          status: status || 'fresh',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        fallbackState.products.push(newProduct);
        writeJson(productsFile, fallbackState.products);
        return [{ insertId: newProduct.product_id }, []];
      }

      if (normalizedQuery.includes('update products set')) {
        const [name, category, manufacturingDate, expiryDate, quantity, status, id] = params;
        const productId = Number(id);
        fallbackState.products = fallbackState.products.map((product) => {
          if (product.product_id === productId) {
            return {
              ...product,
              product_name: name,
              category,
              manufacturing_date: manufacturingDate,
              expiry_date: expiryDate,
              quantity: Number(quantity || 0),
              status,
              updated_at: new Date().toISOString()
            };
          }
          return product;
        });
        writeJson(productsFile, fallbackState.products);
        return [{ affectedRows: 1 }, []];
      }

      if (normalizedQuery.includes('delete from products')) {
        const productId = Number(params[0]);
        fallbackState.products = fallbackState.products.filter((product) => product.product_id !== productId);
        writeJson(productsFile, fallbackState.products);
        return [{ affectedRows: 1 }, []];
      }

      if (normalizedQuery.includes('insert into inventory')) {
        return [{ insertId: Date.now() }, []];
      }

      if (normalizedQuery.includes('insert into expiry_tracking')) {
        return [{ insertId: Date.now() }, []];
      }

      return [[], []];
    },
    async getConnection() {
      return {
        async execute(query, params) {
          return this._pool.execute(query, params);
        },
        release() {}
      };
    }
  };
}

let useFallback = false;

const mysqlPool = mysql
  ? mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bakery_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      timezone: '+00:00'
    })
  : null;

const fallbackPool = createFallbackPool();

const pool = {
  async execute(query, params = []) {
    const active = (useFallback || !mysqlPool) ? fallbackPool : mysqlPool;
    return active.execute(query, params);
  },
  async getConnection() {
    if (useFallback || !mysqlPool) {
      return fallbackPool.getConnection();
    }
    try {
      return await mysqlPool.getConnection();
    } catch (err) {
      console.warn('MySQL connection failed, falling back to local JSON database:', err.message);
      useFallback = true;
      return fallbackPool.getConnection();
    }
  }
};

async function initializeDatabase() {
  if (!mysql || useFallback) {
    createFallbackState();
    return pool;
  }

  try {
    const connection = await mysqlPool.getConnection();
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        user_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        product_id INT AUTO_INCREMENT PRIMARY KEY,
        product_name VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        manufacturing_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'fresh',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_products_expiry (expiry_date),
        INDEX idx_products_category (category)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS inventory (
        inventory_id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        quantity_available INT NOT NULL DEFAULT 0,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS expiry_tracking (
        expiry_id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        expiry_status VARCHAR(20) NOT NULL,
        alert_date DATE NOT NULL,
        FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
      )
    `);

    await connection.execute(`
      INSERT INTO users (user_name, email, password, role)
      SELECT * FROM (SELECT 'Velan Admin', 'sujithagopal158@gmail.com', '$2a$10$0oslFiJoquF0xGK/nGdhMuHS9BF1iDIZuTjBrlO7K94fSBpT9QT9.', 'admin') AS tmp
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sujithagopal158@gmail.com')
      LIMIT 1
    `);

    connection.release();
    return pool;
  } catch (error) {
    console.warn('Database connection error. Falling back to local JSON database:', error.message);
    useFallback = true;
    createFallbackState();
    return pool;
  }
}

module.exports = { pool, initializeDatabase };
