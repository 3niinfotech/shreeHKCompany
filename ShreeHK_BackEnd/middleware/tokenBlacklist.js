/**
 * In-memory JWT blacklist (jti → expiry ms). Tokens are removed after exp.
 */
const blacklist = new Map();

const addToBlacklist = (jti, expUnixSeconds) => {
  if (!jti || !expUnixSeconds) return;
  blacklist.set(String(jti), Number(expUnixSeconds) * 1000);
};

const isBlacklisted = (jti) => {
  if (!jti) return false;
  const expMs = blacklist.get(String(jti));
  if (!expMs) return false;
  if (Date.now() > expMs) {
    blacklist.delete(String(jti));
    return false;
  }
  return true;
};

const cleanupBlacklist = () => {
  const now = Date.now();
  for (const [jti, expMs] of blacklist.entries()) {
    if (now >= expMs) blacklist.delete(jti);
  }
};

setInterval(cleanupBlacklist, 60 * 60 * 1000).unref?.();

module.exports = {
  addToBlacklist,
  isBlacklisted,
  cleanupBlacklist,
};
