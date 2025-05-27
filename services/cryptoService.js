const crypto = require('crypto');
const logger = require('../utils/logger'); // Assuming logger is available

// 1. Define and validate MASTER_KEY
const MASTER_KEY_HEX = process.env.AES_ENCRYPTION_KEY;

if (!MASTER_KEY_HEX) {
  logger.error('AES_ENCRYPTION_KEY environment variable is missing.');
  throw new Error('AES_ENCRYPTION_KEY environment variable is missing. It must be a 64-character hex string.');
}

if (typeof MASTER_KEY_HEX !== 'string' || MASTER_KEY_HEX.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(MASTER_KEY_HEX)) {
  logger.error('AES_ENCRYPTION_KEY environment variable is invalid. It must be a 64-character hex string.');
  throw new Error('AES_ENCRYPTION_KEY environment variable is invalid. It must be a 64-character hex string.');
}

let MASTER_KEY;
try {
  MASTER_KEY = Buffer.from(MASTER_KEY_HEX, 'hex');
  if (MASTER_KEY.length !== 32) {
    throw new Error('MASTER_KEY length is not 32 bytes after hex conversion.'); // Specific error for length check
  }
} catch (error) {
  logger.error('Failed to convert AES_ENCRYPTION_KEY to Buffer or key length is invalid:', error);
  throw new Error('AES_ENCRYPTION_KEY is invalid. Failed to convert to Buffer or key length is not 32 bytes.');
}

// 2. Implement generateSalt() function
function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// 3. Implement encrypt(plaintextString, saltHex) function
function encrypt(plaintextString, saltHex) {
  try {
    const saltBuffer = Buffer.from(saltHex, 'hex');
    if (saltBuffer.length !== 16) {
        logger.error('Invalid saltHex length for encryption. Must be 32 hex characters (16 bytes).');
        throw new Error('Invalid saltHex length. Salt must be 16 bytes (32 hex characters).');
    }
    const derivedKey = crypto.scryptSync(MASTER_KEY, saltBuffer, 32); // 32 bytes = 256 bits
    const iv = crypto.randomBytes(12); // 12 bytes for GCM is recommended
    const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);

    const encrypted = Buffer.concat([cipher.update(Buffer.from(plaintextString, 'utf8')), cipher.final()]);
    const authTag = cipher.getAuthTag(); // GCM includes an authentication tag

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    logger.error('Encryption failed:', { message: error.message, stack: error.stack });
    return null; // Or throw error, depending on desired error handling strategy
  }
}

// 4. Implement decrypt(encryptedString, saltHex) function
function decrypt(encryptedString, saltHex) {
  try {
    const saltBuffer = Buffer.from(saltHex, 'hex');
     if (saltBuffer.length !== 16) {
        logger.error('Invalid saltHex length for decryption. Must be 32 hex characters (16 bytes).');
        return null; // Or throw error
    }
    const derivedKey = crypto.scryptSync(MASTER_KEY, saltBuffer, 32);

    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      logger.error('Invalid encrypted string format. Expected "iv:authTag:ciphertext".');
      return null;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');

    // IV length check for GCM (commonly 12 bytes)
    if (iv.length !== 12) {
        logger.error(`Invalid IV length during decryption: ${iv.length} bytes. Expected 12 bytes.`);
        return null;
    }
    // AuthTag length check for GCM (commonly 16 bytes)
    if (authTag.length !== 16) {
        logger.error(`Invalid AuthTag length during decryption: ${authTag.length} bytes. Expected 16 bytes.`);
        return null;
    }


    const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    // Log specific GCM authentication failure or other decryption errors
    if (error.message.toLowerCase().includes('unsupported state or bad tag')) {
      logger.error('Decryption failed: Authentication tag mismatch or unsupported state (potential tampering or wrong key/salt).', { encryptedStringPreview: encryptedString.substring(0, 20) });
    } else {
      logger.error('Decryption failed:', { message: error.message, stack: error.stack, encryptedStringPreview: encryptedString.substring(0, 20) });
    }
    return null;
  }
}

// 5. Export Functions
module.exports = {
  generateSalt,
  encrypt,
  decrypt,
};
