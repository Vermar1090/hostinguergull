const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI + '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Buscar usuario por google_id
        let user = await User.findByGoogleId(profile.id);

        if (!user) {
          // Buscar por email
          user = await User.findByEmail(profile.emails[0].value);

          if (user) {
            // Actualizar usuario existente con google_id
            await User.update(user.id, { google_id: profile.id });
            user.google_id = profile.id;
          } else {
            // Crear nuevo usuario
            const userId = await User.create({
              nombre: profile.displayName,
              email: profile.emails[0].value,
              google_id: profile.id,
              rol: 'Cliente',
              codigo_referido: 'GOOGLE' + Date.now(),
              activo: 1
            });
            user = await User.findById(userId);
          }
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
