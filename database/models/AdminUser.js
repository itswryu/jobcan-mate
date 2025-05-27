const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt'); // For password hashing

module.exports = (sequelize) => {
  const AdminUser = sequelize.define('AdminUser', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    hashedPassword: {
      type: DataTypes.STRING,
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
    timestamps: true,
    tableName: 'admin_users',
    hooks: {
      beforeCreate: async (adminUser) => {
        if (adminUser.hashedPassword) {
          const salt = await bcrypt.genSalt(10);
          adminUser.hashedPassword = await bcrypt.hash(adminUser.hashedPassword, salt);
        }
      },
      beforeUpdate: async (adminUser) => {
        if (adminUser.changed('hashedPassword')) {
          const salt = await bcrypt.genSalt(10);
          adminUser.hashedPassword = await bcrypt.hash(adminUser.hashedPassword, salt);
        }
      },
    },
  });

  // Instance method to compare passwords
  AdminUser.prototype.isValidPassword = async function (password) {
    return await bcrypt.compare(password, this.hashedPassword);
  };

  return AdminUser;
};
