const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  product_name:       { type: String, required: true },
  category:           { type: String, required: true },
  manufacturing_date: { type: String, required: true },
  expiry_date:        { type: String, required: true },
  quantity:           { type: Number, required: true, default: 0 },
  status:             { type: String, default: 'fresh' },
  created_at:         { type: Date,   default: Date.now },
  updated_at:         { type: Date,   default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);