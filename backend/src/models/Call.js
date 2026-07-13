const mongoose = require('mongoose');

// Only metadata is stored. Calls are NEVER recorded (like GPay/PhonePe policy).
const callSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listener: { type: mongoose.Schema.Types.ObjectId, ref: 'Listener', required: true },
    channelName: { type: String, required: true },
    status: {
      type: String,
      enum: ['ongoing', 'completed', 'missed', 'rejected'],
      default: 'ongoing',
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    durationSec: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Call', callSchema);
