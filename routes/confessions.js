const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Confession = require('../models/Confession');

function ensureAuth(req, res, next) {
  if (req.user) return next();
  return res.status(401).json({ error: 'Authentication required' });
}

// Create confession
router.post('/', ensureAuth, async (req, res) => {
  try {
    const { text, secretCode } = req.body;
    if (!text || !secretCode || secretCode.length < 4) {
      return res.status(400).json({ error: 'Text and secretCode (min 4 chars) required' });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(secretCode, salt);
    const doc = await Confession.create({ text, secretCodeHash: hash, userId: req.user.id });
    res.json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Read all
router.get('/', async (req, res) => {
  const list = await Confession.find().sort({ createdAt: -1 }).lean();
  // Normalize reactions to ensure all fields exist
  list.forEach(conf => {
    if (!conf.reactions) conf.reactions = {};
    conf.reactions.like = conf.reactions.like || 0;
    conf.reactions.sad = conf.reactions.sad || 0;
    conf.reactions.laugh = conf.reactions.laugh || 0;
  });
  res.json(list);
});

// Read mine (requires auth)
router.get('/mine', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  Confession.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
    .then(list => {
      // Normalize reactions to ensure all fields exist
      list.forEach(conf => {
        if (!conf.reactions) conf.reactions = {};
        conf.reactions.like = conf.reactions.like || 0;
        conf.reactions.sad = conf.reactions.sad || 0;
        conf.reactions.laugh = conf.reactions.laugh || 0;
      });
      res.json(list);
    })
    .catch(err => res.status(500).json({ error: 'Server error' }));
});

// Update with secret code
router.put('/:id', async (req, res) => {
  try {
    const { secretCode, text } = req.body;
    // allow update if the requester is the original poster (session user) OR provides correct secret code
    const conf = await Confession.findById(req.params.id);
    if (!conf) return res.status(404).json({ error: 'Not found' });
    let ok = false;
    if (req.user && req.user.id && conf.userId && req.user.id === conf.userId) {
      ok = true; // owner by session
    } else {
      if (!secretCode || secretCode.length < 4) return res.status(400).json({ error: 'Invalid secret code' });
      ok = await bcrypt.compare(secretCode, conf.secretCodeHash);
    }
    if (!ok) return res.status(403).json({ error: 'Wrong secret code or not authorized' });
    if (text) conf.text = text;
    await conf.save();
    res.json(conf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete with secret code
router.delete('/:id', async (req, res) => {
  try {
    const { secretCode } = req.body;
    const conf = await Confession.findById(req.params.id);
    if (!conf) return res.status(404).json({ error: 'Not found' });
    // allow delete if session user is owner OR correct secret code provided
    let ok = false;
    if (req.user && req.user.id && conf.userId && req.user.id === conf.userId) {
      ok = true;
    } else {
      if (!secretCode || secretCode.length < 4) return res.status(400).json({ error: 'Invalid secret code' });
      ok = await bcrypt.compare(secretCode, conf.secretCodeHash);
    }
    if (!ok) return res.status(403).json({ error: 'Wrong secret code or not authorized' });
    await Confession.deleteOne({ _id: conf._id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add reaction
router.post('/:id/react', async (req, res) => {
  try {
    const { type } = req.body; // like | sad | laugh
    if (!['like', 'sad', 'laugh'].includes(type)) return res.status(400).json({ error: 'Invalid reaction' });
    const conf = await Confession.findById(req.params.id);
    if (!conf) return res.status(404).json({ error: 'Not found' });
    // Initialize reactions object with all fields if they don't exist
    if (!conf.reactions) conf.reactions = {};
    if (conf.reactions.like === undefined) conf.reactions.like = 0;
    if (conf.reactions.sad === undefined) conf.reactions.sad = 0;
    if (conf.reactions.laugh === undefined) conf.reactions.laugh = 0;
    // Increment the reaction
    conf.reactions[type] = (conf.reactions[type] || 0) + 1;
    await conf.save();
    res.json(conf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
