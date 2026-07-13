const mongoose = require('mongoose');

const listenerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isOnline: { type: Boolean, default: false },
    // busy = currently on a call
    isBusy: { type: Boolean, default: false },
    totalCalls: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    fcmToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listener', listenerSchema);
