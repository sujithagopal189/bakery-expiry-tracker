const mongoose = require('mongoose');

const expiryTrackingSchema = new mongoose.Schema({
  product_id:    { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  expiry_status: { type: String, required: true },
  alert_date:    { type: String, required: true }
});

module.exports = mongoose.model('ExpiryTracking', expiryTrackingSchema);
