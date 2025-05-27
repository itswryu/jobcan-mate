const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    displayName: { // Renamed from 'name' for clarity, often what Google profile returns
      type: DataTypes.STRING,
      allowNull: true,
    },
    firstName: { // Renamed from givenName
      type: DataTypes.STRING,
      allowNull: true,
    },
    familyName: { // Kept as familyName
      type: DataTypes.STRING,
      allowNull: true,
    },
    profilePictureUrl: { // Renamed from picture
      type: DataTypes.STRING,
      allowNull: true,
    },
    locale: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // IMPORTANT: These tokens are stored PLAINTEXT for this task. Mark for future encryption.
    encryptedGoogleAccessToken: {
      type: DataTypes.TEXT, // Changed to TEXT for potentially longer tokens
      allowNull: true,
    },
    encryptedGoogleRefreshToken: {
      type: DataTypes.TEXT, // Changed to TEXT for potentially longer tokens
      allowNull: true,
    },
    lastLoginAt: { // New field
      type: DataTypes.DATE,
      allowNull: true,
    },
    salt: { // New field for user-specific salt
      type: DataTypes.STRING(32), // 16-byte salt hex-encoded (32 characters)
      allowNull: true, // Will be set on user creation or first login post-update
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
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
    timestamps: true, // Sequelize will automatically manage createdAt and updatedAt
    tableName: 'users', // Optional: Define table name
  });

  return User;
};
