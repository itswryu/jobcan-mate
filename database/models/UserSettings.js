const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSettings = sequelize.define('UserSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    // Foreign key for User will be added via association
    // userId: {
    //   type: DataTypes.UUID,
    //   allowNull: false,
    //   references: {
    //     model: 'users', // Name of the table
    //     key: 'id',
    //   },
    // },
    jobcanUsername: {
      type: DataTypes.STRING,
      allowNull: true, // User might not set it up immediately
    },
    jobcanPasswordSalt: { // New salt field for Jobcan password
      type: DataTypes.STRING(32), // 16-byte salt hex-encoded (32 characters)
      allowNull: true,
    },
    encryptedJobcanPassword: {
      type: DataTypes.TEXT, // Changed to TEXT for potentially longer encrypted strings
      allowNull: true,
    },
    workStartTime: {
      type: DataTypes.TIME, // e.g., '09:00:00'
      allowNull: true,
    },
    workEndTime: {
      type: DataTypes.TIME, // e.g., '18:00:00'
      allowNull: true,
    },
    breakTime: {
      type: DataTypes.INTEGER, // In minutes, e.g., 60
      allowNull: true,
    },
    autoClockIn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    autoClockOut: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    notifyOnAutoAction: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    jobcanClerkCode: { // Adit code for Jobcan
      type: DataTypes.STRING,
      allowNull: true,
    },
    annualLeaveCalendarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isUrl: true,
        },
    },
    telegramBotTokenSalt: { // New salt field for Telegram bot token
        type: DataTypes.STRING(32),
        allowNull: true,
    },
    encryptedTelegramBotToken: { // Placeholder for encrypted token
        type: DataTypes.TEXT, // Changed to TEXT for potentially longer encrypted strings
        allowNull: true,
    },
    // Timestamps
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    timestamps: true,
    tableName: 'user_settings',
  });

  return UserSettings;
};
