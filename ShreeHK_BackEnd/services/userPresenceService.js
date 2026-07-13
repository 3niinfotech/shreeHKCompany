/** In-memory presence: user is online if seen within ONLINE_THRESHOLD_MS */
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

const lastSeenByUserId = new Map();

const touchUserPresence = (userId) => {
  const id = Number(userId);
  if (!id) return;
  lastSeenByUserId.set(id, Date.now());
};

const clearUserPresence = (userId) => {
  const id = Number(userId);
  if (!id) return;
  lastSeenByUserId.delete(id);
};

const isUserOnline = (userId) => {
  const id = Number(userId);
  if (!id) return false;
  const ts = lastSeenByUserId.get(id);
  if (!ts) return false;
  return Date.now() - ts < ONLINE_THRESHOLD_MS;
};

module.exports = {
  touchUserPresence,
  clearUserPresence,
  isUserOnline,
  ONLINE_THRESHOLD_MS,
};
