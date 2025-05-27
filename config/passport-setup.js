const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, UserSettings } = require('../database/setup'); // Import Sequelize models
const config = require('./config'); // To get Google credentials
const logger = require('../utils/logger'); // Import Winston logger
const { generateSalt, encrypt } = require('../services/cryptoService'); // Import crypto functions

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.clientId,
      clientSecret: config.google.clientSecret,
      callbackURL: config.google.callbackUrl,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        logger.debug('GoogleStrategy callback triggered.', { googleId: profile.id, displayName: profile.displayName });

        let user = await User.findOne({ where: { googleId: profile.id } });
        let userSalt;

        if (user) {
          // User exists, update information
          logger.info(`Found existing user: ${user.email} with googleId: ${profile.id}`);
          
          if (!user.salt) {
            logger.warn(`User ${user.id} (${user.email}) is missing a salt. Generating a new one.`);
            user.salt = generateSalt();
          }
          userSalt = user.salt;

          user.displayName = profile.displayName;
          user.firstName = profile.name?.givenName;
          user.familyName = profile.name?.familyName;
          user.profilePictureUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;
          user.lastLoginAt = new Date();
          
          if (accessToken) {
            user.encryptedGoogleAccessToken = encrypt(accessToken, userSalt);
            logger.debug(`Access token encrypted for user ${user.email}.`);
          } else {
            user.encryptedGoogleAccessToken = null;
          }

          if (refreshToken) {
            user.encryptedGoogleRefreshToken = encrypt(refreshToken, userSalt);
            logger.debug(`Refresh token encrypted for user ${user.email}.`);
          } else {
            user.encryptedGoogleRefreshToken = null;
          }

          await user.save();
          logger.info(`User ${user.email} updated successfully.`);
          return done(null, user);
        } else {
          // User does not exist, create a new one
          logger.info(`User not found with googleId: ${profile.id}. Creating new user.`);
          userSalt = generateSalt();
          
          const encryptedAccessToken = accessToken ? encrypt(accessToken, userSalt) : null;
          const encryptedRefreshToken = refreshToken ? encrypt(refreshToken, userSalt) : null;

          if (accessToken && !encryptedAccessToken) {
            logger.error(`Failed to encrypt access token for new user ${profile.id}.`);
            // Potentially throw an error or handle as a critical failure
          }
          if (refreshToken && !encryptedRefreshToken) {
            logger.error(`Failed to encrypt refresh token for new user ${profile.id}.`);
             // Potentially throw an error or handle as a critical failure
          }
          logger.debug(`Tokens encrypted for new user ${profile.id}.`);

          const newUser = await User.create({
            googleId: profile.id,
            email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : 'N/A',
            displayName: profile.displayName,
            firstName: profile.name?.givenName,
            familyName: profile.name?.familyName,
            profilePictureUrl: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
            locale: profile._json?.locale,
            lastLoginAt: new Date(),
            isVerified: profile.emails && profile.emails.length > 0 ? profile.emails[0].verified : false,
            salt: userSalt,
            encryptedGoogleAccessToken: encryptedAccessToken,
            encryptedGoogleRefreshToken: encryptedRefreshToken,
          });
          logger.info(`New user ${newUser.email} created successfully with googleId: ${profile.id}.`);

          // Create associated UserSettings
          await UserSettings.create({ userId: newUser.id });
          logger.info(`UserSettings created for new user ${newUser.email}.`);

          return done(null, newUser);
        }
      } catch (error) {
        logger.error('Error in GoogleStrategy callback:', { message: error.message, stack: error.stack, googleId: profile.id });
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  logger.debug(`Serializing user with ID: ${user.id}`);
  done(null, user.id); // User.id is UUID from Sequelize model
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    if (user) {
      logger.debug(`Deserialized user: ${user.email} with ID: ${id}`);
      done(null, user);
    } else {
      logger.warn(`DeserializeUser: User not found with ID: ${id}`);
      done(null, false);
    }
  } catch (err) {
    logger.error('Error in deserializeUser:', { message: err.message, stack: err.stack, userId: id });
    done(err, null);
  }
});
