const { Sequelize } = require('sequelize');
const config = require('../config/config'); // Adjust path as necessary
const logger = require('../utils/logger'); // Import Winston logger

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: config.database.dialect || 'sqlite',
  storage: config.database.storage,
  logging: (msg) => logger.debug(msg), // Use Winston's debug level for Sequelize logs
});

// Import models
const User = require('./models/User')(sequelize);
const UserSettings = require('./models/UserSettings')(sequelize);
const AdminUser = require('./models/AdminUser')(sequelize);

// Define associations
// User has one UserSettings
User.hasOne(UserSettings, {
  foreignKey: {
    name: 'userId', // Explicitly name the foreign key
    allowNull: false,
  },
  onDelete: 'CASCADE', // If a User is deleted, their UserSettings should also be deleted
});
UserSettings.belongsTo(User, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
});

// Async function to initialize the database
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Sync all models
    // { force: true } will drop the table if it already exists - use with caution in development
    // { alter: true } checks the current state of the table in the database (which columns it has, what are their data types, etc), and then performs the necessary changes in the table to make it match the model.
    await sequelize.sync({ force: process.env.NODE_ENV === 'development' ? false : false }); // Using force: false to avoid data loss. Consider 'alter:true' for dev with caution.
    logger.info('All models were synchronized successfully. Tables created/updated as necessary.');

    // Initial Admin User Seeding
    try {
      const adminCount = await AdminUser.count();
      if (adminCount === 0) {
        const defaultAdminUsername = process.env.DEFAULT_ADMIN_USERNAME;
        const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

        if (defaultAdminUsername && defaultAdminPassword && defaultAdminUsername.trim() !== '' && defaultAdminPassword.trim() !== '') {
          // The AdminUser model already hashes the password in a hook
          await AdminUser.create({ username: defaultAdminUsername, hashedPassword: defaultAdminPassword });
          logger.info(`Default admin user '${defaultAdminUsername}' created. IMPORTANT: Change this password after first login and remove/update DEFAULT_ADMIN_PASSWORD from your environment.`);
        } else {
          logger.warn('DEFAULT_ADMIN_USERNAME and/or DEFAULT_ADMIN_PASSWORD environment variables are not set or are empty. No default admin user created.');
        }
      }
    } catch (seedError) {
      logger.error('Failed to seed initial admin user:', { message: seedError.message, stack: seedError.stack });
    }

  } catch (error) {
    logger.error('Unable to connect to the database or synchronize models:', { message: error.message, stack: error.stack });
    // Exit the process if the database connection fails, as it's critical
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  initializeDatabase,
  User,
  UserSettings,
  AdminUser,
};
