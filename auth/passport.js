const passport = require('passport');
let GoogleStrategy;
try { GoogleStrategy = require('passport-google-oauth20').Strategy; } catch(e) { GoogleStrategy = null }

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

if (process.env.GOOGLE_CLIENT_ID && GoogleStrategy) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, (accessToken, refreshToken, profile, done) => {
    const user = { id: profile.id, displayName: profile.displayName, photos: profile.photos };
    return done(null, user);
  }));
} else {
  console.warn('Google OAuth not configured. DEV mode: use /auth/dev-login to simulate login.');
}

module.exports = passport;
