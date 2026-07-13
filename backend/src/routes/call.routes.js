const router = require('express').Router();
const auth = require('../middleware/auth');
const Call = require('../models/Call');
const { requestCall } = require('../sockets');

// POST /api/calls/request — user taps "Talk Now"
// If no listener is free the app offers callback / scheduled call.
router.post('/request', auth('user'), async (req, res) => {
  try {
    const result = await requestCall(req.auth.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/calls/history — works for both roles
router.get('/history', auth(), async (req, res) => {
  try {
    const filter = req.auth.role === 'listener' ? { listener: req.auth.id } : { user: req.auth.id };
    const calls = await Call.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('user', 'name')
      .populate('listener', 'name');
    res.json(calls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
