const mongoose = require('mongoose');

// User aur Listener dono ek dusre ko report kar sakte hain — call ke dauran ya baad me.
const reportSchema = new mongoose.Schema(
  {
    reporterRole: { type: String, enum: ['user', 'listener'], required: true },
    reporterId: { type: mongoose.Schema.Types.ObjectId, required: true },
    targetRole: { type: String, enum: ['user', 'listener'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    call: { type: mongoose.Schema.Types.ObjectId, ref: 'Call' },
    reason: {
      type: String,
      enum: ['inappropriate_behavior', 'harassment', 'spam_or_fake', 'other'],
      required: true,
    },
    details: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['open', 'reviewed'], default: 'open' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
