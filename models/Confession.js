const mongoose = require('mongoose');

const ConfessionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  secretCodeHash: { type: String, required: true },
  reactions: {
    like: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    laugh: { type: Number, default: 0 }
  },
  tag: { type: String },
  anonId: { type: String },
  createdAt: { type: Date, default: Date.now },
  userId: { type: String, required: true }
});

module.exports = mongoose.model('Confession', ConfessionSchema);
