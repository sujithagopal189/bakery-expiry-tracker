const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const ExpiryTracking = require('../models/ExpiryTracking');

function getStatus(daysLeft) {
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 3) return 'expiring';
  return 'fresh';
}

function formatProduct(p) {
  return {
    id: p._id || p.id,
    name: p.product_name,
    category: p.category,
    manufacturingDate: p.manufacturing_date,
    expiryDate: p.expiry_date,
    quantity: p.quantity,
    status: p.status,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}

async function listProducts(req, res) {
  try {
    const products = await Product.find().sort({ created_at: -1 });
    return res.json(products.map(formatProduct));
  } catch (error) {
    console.error('List products error:', error);
    return res.status(500).json({ success: false, error: 'Unable to load products.' });
  }
}

async function createProduct(req, res) {
  try {
    const { name, category, manufacturingDate, expiryDate, quantity } = req.body;
    const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    const status = getStatus(daysLeft);
    const now = new Date().toISOString();

    const product = await Product.create({
      product_name: name,
      category,
      manufacturing_date: manufacturingDate,
      expiry_date: expiryDate,
      quantity: Number(quantity),
      status,
      created_at: now,
      updated_at: now
    });

    const productId = String(product.id || product._id);
    await Inventory.create({ product_id: productId, quantity_available: product.quantity, last_updated: now });
    await ExpiryTracking.create({ product_id: productId, expiry_status: status, alert_date: product.expiry_date });

    return res.status(201).json({ success: true, product: formatProduct(product) });
  } catch (error) {
    console.error('Create product error:', error);
    return res.status(500).json({ success: false, error: 'Unable to create product.' });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, category, manufacturingDate, expiryDate, quantity } = req.body;
    const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
    const status = getStatus(daysLeft);
    const now = new Date().toISOString();

    const product = await Product.findByIdAndUpdate(
      id,
      {
        product_name: name,
        category,
        manufacturing_date: manufacturingDate,
        expiry_date: expiryDate,
        quantity: Number(quantity),
        status,
        updated_at: now
      },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    // Keep inventory and expiry tracking in sync
    await Inventory.findOneAndUpdate(
      { product_id: id },
      { quantity_available: Number(quantity), last_updated: now }
    );
    await ExpiryTracking.findOneAndUpdate(
      { product_id: id },
      { expiry_status: status, alert_date: expiryDate }
    );

    return res.json({ success: true, product: formatProduct(product) });
  } catch (error) {
    console.error('Update product error:', error);
    return res.status(500).json({ success: false, error: 'Unable to update product.' });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    await Inventory.deleteMany({ product_id: id });
    await ExpiryTracking.deleteMany({ product_id: id });
    return res.json({ success: true, message: 'Product deleted.' });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({ success: false, error: 'Unable to delete product.' });
  }
}

module.exports = { listProducts, createProduct, updateProduct, deleteProduct };
