const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // subscription comes later; everyone starts free
    plan: { type: String, enum: ['free', 'subscribed'], default: 'free' },
    isBlocked: { type: Boolean, default: false },
    fcmToken: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
