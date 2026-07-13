const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Listener = require('../models/Listener');
const auth = require('../middleware/auth');

function signToken(id, role) {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

function modelFor(role) {
  return role === 'listener' ? Listener : User;
}

// POST /api/auth/:role/register   role = user | listener
router.post('/:role(user|listener)/register', async (req, res) => {
  try {
    const { role } = req.params;
    const { name, phone, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ message: 'name, phone, password required' });
    }

    const Model = modelFor(role);
    const exists = await Model.findOne({ phone });
    if (exists) return res.status(409).json({ message: 'Phone already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const doc = await Model.create({ name, phone, password: hashed });
    const token = signToken(doc._id, role);
    res.status(201).json({ token, role, profile: { id: doc._id, name: doc.name, phone: doc.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/:role/login
router.post('/:role(user|listener)/login', async (req, res) => {
  try {
    const { role } = req.params;
    const { phone, password } = req.body;

    const Model = modelFor(role);
    const doc = await Model.findOne({ phone });
    if (!doc) return res.status(404).json({ message: 'Account not found' });

    const ok = await bcrypt.compare(password, doc.password);
    if (!ok) return res.status(401).json({ message: 'Wrong password' });

    const token = signToken(doc._id, role);
    res.json({ token, role, profile: { id: doc._id, name: doc.name, phone: doc.phone } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/fcm-token — app apna push token save karati hai (dono roles)
router.post('/fcm-token', auth(), async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'token required' });
    const Model = modelFor(req.auth.role);
    await Model.findByIdAndUpdate(req.auth.id, { fcmToken: token });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
