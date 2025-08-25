const crypto = require('crypto');

class IdGenerator {
  static generateId() {
    // Generate a 24-character hex string similar to MongoDB ObjectId
    return crypto.randomBytes(12).toString('hex');
  }

  static generateIdWithTimestamp() {
    // Generate ObjectId with timestamp prefix for better sorting
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const randomBytes = crypto.randomBytes(8).toString('hex');
    return timestamp + randomBytes;
  }

  static isValidId(id) {
    // Validate if the ID is a valid 24-character hex string
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}

module.exports = IdGenerator;
