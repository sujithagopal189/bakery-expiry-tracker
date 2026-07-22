const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true, enum: ['Bread', 'Biscuit', 'Cake'] },
  quantity: { type: Number, required: true },
  manufacturingDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true }
});

module.exports = mongoose.model('Product', productSchema);