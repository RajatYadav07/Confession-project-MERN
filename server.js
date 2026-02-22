require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
const cors = require('cors');

const authPassport = require('./auth/passport');
const confRoutes = require('./routes/confessions');
const bcrypt = require('bcryptjs');
const Confession = require('./models/Confession');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error', err));

// DEV: seed sample confessions when DB empty (only when DEV_SEED=true or not in production)
mongoose.connection.once('open', async () => {
  try {
    const count = await Confession.countDocuments();
    const shouldSeed = (process.env.DEV_SEED === 'true') || (process.env.NODE_ENV !== 'production');
    if (count === 0 && shouldSeed) {
      console.log('Seeding sample confessions...');
      const samples = [
        { text: "I have my finals tomorrow and I haven't started studying. I'm just sitting here eating cereal and watching the ceiling fans spin.", tag: 'Study Stress', anonId: 'Anon #8F3' },
        { text: "To the guy in the blue hoodie at the library: I dropped my pen on purpose just so you'd look at me. It worked, but then I tripped.", tag: 'Crush', anonId: 'Anon #X92' },
        { text: "I accidentally called my professor 'mom' during the presentation. She answered 'Yes honey?'. I'm transferring schools.", tag: 'Funny', anonId: 'Anon #294' }
      ];
      for (const s of samples) {
        const hash = await bcrypt.hash('seedcode', 10);
        await Confession.create({ text: s.text, secretCodeHash: hash, reactions: { like: Math.floor(Math.random()*300), love: Math.floor(Math.random()*300), laugh: Math.floor(Math.random()*300) }, tag: s.tag, anonId: s.anonId, userId: 'seed' });
      }
      console.log('Seeding complete');
    }
  } catch (e) { console.error('Seeding error', e) }
});

app.use(cors());
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}));

app.use(passport.initialize());
app.use(passport.session());

// Auth routes
if (process.env.GOOGLE_CLIENT_ID) {
  app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => { res.redirect('/'); }
  );
} else {
  // Dev helper to simulate login without Google
  app.get('/auth/dev-login', (req, res) => {
    const user = { id: 'dev-user-1', displayName: 'Student #294', photos: [] };
    req.login(user, (err) => {
      if (err) return res.status(500).send('Login failed');
      return res.redirect('/');
    });
  });
}

app.get('/auth/logout', (req, res) => {
  req.logout(() => {});
  res.redirect('/');
});

app.get('/auth/me', (req, res) => {
  if (!req.user) return res.json({ authenticated: false });
  res.json({ authenticated: true, user: req.user });
});

// Expose whether Google OAuth is configured so frontend can adjust login link
app.get('/auth/config', (req, res) => {
  res.json({ googleConfigured: !!process.env.GOOGLE_CLIENT_ID });
});

// API
app.use('/api/confessions', confRoutes);

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`Server started on ${PORT}`));
