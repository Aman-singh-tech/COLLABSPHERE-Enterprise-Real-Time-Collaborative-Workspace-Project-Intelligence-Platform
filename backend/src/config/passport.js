const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const env = require('../config/env');
const { User } = require('../models');

passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) {
          return done(new Error('Google account has no email associated.'), null);
        }

        // 1. Try to find by googleId first
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // 2. Account linking: check if a local account with same email exists
          user = await User.findOne({ email });

          if (user) {
            user.googleId = profile.id;
            user.authProvider = 'google';
            user.isEmailVerified = true;
            if (!user.avatar && profile.photos?.[0]?.value) {
              user.avatar = profile.photos[0].value;
            }
            await user.save();
          } else {
            // 3. Create a brand new user
            user = await User.create({
              googleId: profile.id,
              email,
              firstName: profile.name?.givenName || profile.displayName || 'User',
              lastName: profile.name?.familyName || '',
              avatar: profile.photos?.[0]?.value || '',
              authProvider: 'google',
              isEmailVerified: true,
            });
          }
        } else {
          // Automatic profile synchronization
          user.firstName = profile.name?.givenName || user.firstName;
          user.lastName = profile.name?.familyName || user.lastName;
          if (profile.photos?.[0]?.value) user.avatar = profile.photos[0].value;
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Not using sessions (JWT-based), but passport requires these to be defined
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
