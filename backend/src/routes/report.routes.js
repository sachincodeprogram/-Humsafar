const router = require('express').Router();
const auth = require('../middleware/auth');
const Report = require('../models/Report');
const User = require('../models/User');
const Listener = require('../models/Listener');

const REASONS = ['inappropriate_behavior', 'harassment', 'spam_or_fake', 'other'];

async function blockTarget(reporterRole, reporterId, targetId) {
  if (reporterRole === 'user') {
    await User.findByIdAndUpdate(reporterId, { $addToSet: { blockedListeners: targetId } });
  } else {
    await Listener.findByIdAndUpdate(reporterId, { $addToSet: { blockedUsers: targetId } });
  }
}

// POST /api/report — kisi user/listener ko report karo (chahe to block bhi kar do)
// body: { targetId, reason, details?, callId?, alsoBlock? }
router.post('/', auth(), async (req, res) => {
  try {
    const { targetId, reason, details, callId, alsoBlock } = req.body;
    if (!targetId || !REASONS.includes(reason)) {
      return res.status(400).json({ message: 'targetId aur valid reason zaroori hai' });
    }

    const reporterRole = req.auth.role;
    const targetRole = reporterRole === 'user' ? 'listener' : 'user';

    await Report.create({
      reporterRole,
      reporterId: req.auth.id,
      targetRole,
      targetId,
      call: callId || undefined,
      reason,
      details: details || '',
    });

    if (alsoBlock) await blockTarget(reporterRole, req.auth.id, targetId);

    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/report/block — report ke bina, sirf block karna hai
router.post('/block', auth(), async (req, res) => {
  try {
    const { targetId } = req.body;
    if (!targetId) return res.status(400).json({ message: 'targetId zaroori hai' });
    await blockTarget(req.auth.role, req.auth.id, targetId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/report/block/:targetId — unblock
router.delete('/block/:targetId', auth(), async (req, res) => {
  try {
    const { targetId } = req.params;
    if (req.auth.role === 'user') {
      await User.findByIdAndUpdate(req.auth.id, { $pull: { blockedListeners: targetId } });
    } else {
      await Listener.findByIdAndUpdate(req.auth.id, { $pull: { blockedUsers: targetId } });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/report/blocked — apni blocked list dekho
router.get('/blocked', auth(), async (req, res) => {
  try {
    if (req.auth.role === 'user') {
      const doc = await User.findById(req.auth.id).populate('blockedListeners', 'name');
      res.json(doc?.blockedListeners || []);
    } else {
      const doc = await Listener.findById(req.auth.id).populate('blockedUsers', 'name');
      res.json(doc?.blockedUsers || []);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
