const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product_id:         { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity_available: { type: Number, default: 0 },
  last_updated:       { type: Date,   default: Date.now }
});

module.exports = mongoose.model('Inventory', inventorySchema);
