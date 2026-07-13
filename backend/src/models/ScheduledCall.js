const mongoose = require('mongoose');

// type 'callback'  = no listener was free, call the user back as soon as possible
// type 'scheduled' = user picked a specific date/time
const scheduledCallSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    listener: { type: mongoose.Schema.Types.ObjectId, ref: 'Listener' },
    type: { type: String, enum: ['callback', 'scheduled'], required: true },
    scheduledAt: { type: Date }, // required only for type 'scheduled'
    status: {
      type: String,
      enum: ['pending', 'assigned', 'completed', 'cancelled'],
      default: 'pending',
    },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ScheduledCall', scheduledCallSchema);
