const bcrypt = require("bcryptjs");
const md5 = require("md5");

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

/**
 * Checks if a hash is a bcrypt hash ($2a$, $2b$, or $2y$)
 */
function isBcryptHash(hash) {
  return typeof hash === "string" && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash);
}

/**
 * Validates password strength policy (minimum 8 characters)
 */
function validatePasswordPolicy(password) {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  return null;
}

/**
 * Hashes a plaintext password using bcrypt
 */
function hashPassword(password) {
  const policyError = validatePasswordPolicy(password);
  if (policyError) {
    throw new Error(policyError);
  }
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

/**
 * Verifies a plaintext password against a stored hash (bcrypt or legacy MD5)
 */
function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  if (isBcryptHash(storedHash)) {
    return bcrypt.compareSync(password, storedHash);
  }
  // Legacy MD5 fallback
  return md5(password) === storedHash;
}

/**
 * Verifies password and triggers migration to bcrypt if legacy MD5 was used
 */
function verifyAndMigratePassword(password, storedHash, onMigrate) {
  if (!password || !storedHash) return false;

  if (isBcryptHash(storedHash)) {
    return bcrypt.compareSync(password, storedHash);
  }

  // Check legacy MD5
  if (md5(password) === storedHash) {
    if (typeof onMigrate === "function") {
      try {
        const newHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
        onMigrate(newHash);
      } catch (err) {
        console.error("Password auto-migration failed:", err);
      }
    }
    return true;
  }

  return false;
}

module.exports = {
  isBcryptHash,
  validatePasswordPolicy,
  hashPassword,
  verifyPassword,
  verifyAndMigratePassword,
  MIN_PASSWORD_LENGTH,
};
