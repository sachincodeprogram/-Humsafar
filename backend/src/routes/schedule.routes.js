const router = require('express').Router();
const auth = require('../middleware/auth');
const ScheduledCall = require('../models/ScheduledCall');

// POST /api/schedule — user creates callback or scheduled call
// body: { type: 'callback' | 'scheduled', scheduledAt?, note? }
router.post('/', auth('user'), async (req, res) => {
  try {
    const { type, scheduledAt, note } = req.body;
    if (!['callback', 'scheduled'].includes(type)) {
      return res.status(400).json({ message: 'type must be callback or scheduled' });
    }
    if (type === 'scheduled' && !scheduledAt) {
      return res.status(400).json({ message: 'scheduledAt required for scheduled call' });
    }

    const doc = await ScheduledCall.create({
      user: req.auth.id,
      type,
      scheduledAt: type === 'scheduled' ? new Date(scheduledAt) : undefined,
      note,
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/schedule/mine — user's own requests
router.get('/mine', auth('user'), async (req, res) => {
  const docs = await ScheduledCall.find({ user: req.auth.id }).sort({ createdAt: -1 }).limit(50);
  res.json(docs);
});

// GET /api/schedule/pending — listeners see the queue (callbacks first, then by time)
router.get('/pending', auth('listener'), async (req, res) => {
  const docs = await ScheduledCall.find({ status: { $in: ['pending', 'assigned'] } })
    .sort({ type: 1, scheduledAt: 1, createdAt: 1 }) // 'callback' < 'scheduled' alphabetically
    .limit(100)
    .populate('user', 'name');
  res.json(docs);
});

// POST /api/schedule/:id/take — listener assigns it to themselves
router.post('/:id/take', auth('listener'), async (req, res) => {
  const doc = await ScheduledCall.findOneAndUpdate(
    { _id: req.params.id, status: 'pending' },
    { status: 'assigned', listener: req.auth.id },
    { new: true }
  );
  if (!doc) return res.status(409).json({ message: 'Already taken or not found' });
  res.json(doc);
});

// POST /api/schedule/:id/complete — listener marks done
router.post('/:id/complete', auth('listener'), async (req, res) => {
  const doc = await ScheduledCall.findOneAndUpdate(
    { _id: req.params.id, listener: req.auth.id },
    { status: 'completed' },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: 'Not found' });
  res.json(doc);
});

// POST /api/schedule/:id/cancel — user cancels their own request
router.post('/:id/cancel', auth('user'), async (req, res) => {
  const doc = await ScheduledCall.findOneAndUpdate(
    { _id: req.params.id, user: req.auth.id, status: { $in: ['pending', 'assigned'] } },
    { status: 'cancelled' },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: 'Not found or already done' });
  res.json(doc);
});

module.exports = router;
