const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for GCM

/**
 * Derives a 32-byte encryption key from process.env.LAB_ENCRYPTION_KEY or JWT_SECRET.
 * Master key is strictly in environment, never persisted to database.
 */
function getMasterKey() {
  const envKey = process.env.LAB_ENCRYPTION_KEY;
  if (envKey && typeof envKey === "string" && envKey.trim().length >= 32) {
    return crypto.createHash("sha256").update(envKey.trim()).digest();
  }

  // Fallback to JWT_SECRET to prevent server crash if not yet configured in .env
  const fallback = process.env.JWT_SECRET || "shreehk_erp_lab_secure_fallback_key_2026";
  return crypto.createHash("sha256").update(fallback).digest();
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param {string} text Plaintext to encrypt
 * @returns {string|null} Serialized IV:Tag:EncryptedHex
 */
function encryptSecret(text) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(trimmed, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt serialized ciphertext using AES-256-GCM
 * @param {string} cipherPayload Serialized IV:Tag:EncryptedHex
 * @returns {string|null} Decrypted plaintext
 */
function decryptSecret(cipherPayload) {
  if (!cipherPayload || typeof cipherPayload !== "string") return null;
  const parts = cipherPayload.split(":");
  if (parts.length !== 3) return null;

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    // Return null without logging the actual cipher text or key details
    return null;
  }
}

/**
 * Mask secret string for safe API responses (never expose raw keys to UI)
 * @param {string} secret 
 * @returns {string} e.g. "••••••••" or empty string
 */
function maskSecret(secret) {
  if (!secret) return "";
  return "••••••••";
}

module.exports = {
  encryptSecret,
  decryptSecret,
  maskSecret,
};
