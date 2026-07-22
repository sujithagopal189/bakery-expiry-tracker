const { pool } = require('../db');

function getStatus(daysLeft) {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 3) return 'expiring';
  return 'fresh';
}

async function listProducts(req, res) {
  try {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY created_at DESC');
    const products = rows.map((row) => ({
      id: row.product_id,
      name: row.product_name,
      category: row.category,
      manufacturingDate: row.manufacturing_date,
      expiryDate: row.expiry_date,
      quantity: row.quantity,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    return res.json(products);
  } catch (error) {
    console.error('List products error:', error);
    return res.status(500).json({ success: false, error: 'Unable to load products.' });
  }
}

async function createProduct(req, res) {
  try {
    const { name, category, manufacturingDate, expiryDate, quantity } = req.body;
    const status = getStatus(Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)));
    const [result] = await pool.execute(
      'INSERT INTO products (product_name, category, manufacturing_date, expiry_date, quantity, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, category, manufacturingDate, expiryDate, quantity, status]
    );

    const [rows] = await pool.execute('SELECT * FROM products WHERE product_id = ?', [result.insertId]);
    const product = rows[0];
    await pool.execute('INSERT INTO inventory (product_id, quantity_available) VALUES (?, ?)', [product.product_id, product.quantity]);
    await pool.execute('INSERT INTO expiry_tracking (product_id, expiry_status, alert_date) VALUES (?, ?, ?)', [product.product_id, status, product.expiry_date]);

    return res.status(201).json({ success: true, product: { id: product.product_id, name: product.product_name, category: product.category, manufacturingDate: product.manufacturing_date, expiryDate: product.expiry_date, quantity: product.quantity, status: product.status } });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ success: false, error: 'Unable to create product.' });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, category, manufacturingDate, expiryDate, quantity } = req.body;
    const status = getStatus(Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24)));
    await pool.execute('UPDATE products SET product_name = ?, category = ?, manufacturing_date = ?, expiry_date = ?, quantity = ?, status = ? WHERE product_id = ?', [name, category, manufacturingDate, expiryDate, quantity, status, id]);
    const [rows] = await pool.execute('SELECT * FROM products WHERE product_id = ?', [id]);
    return res.json({ success: true, product: rows[0] });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ success: false, error: 'Unable to update product.' });
  }
}

async function deleteProduct(req, res) {
  try {
    await pool.execute('DELETE FROM products WHERE product_id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Product deleted.' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ success: false, error: 'Unable to delete product.' });
  }
}

module.exports = { listProducts, createProduct, updateProduct, deleteProduct };
