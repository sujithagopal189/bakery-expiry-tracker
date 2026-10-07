const activeSessions = new Map();
const revokedTokens = new Set();

function normalizeUserId(userId) {
  return String(userId);
}

function replaceSession(userId, token) {
  const normalizedUserId = normalizeUserId(userId);
  const previousToken = activeSessions.get(normalizedUserId);

  if (previousToken && previousToken !== token) {
    revokedTokens.add(previousToken);
  }
  
  activeSessions.set(normalizedUserId, token);
  return token;
}

function clearSession(userId) {
  activeSessions.delete(normalizeUserId(userId));
}

function revokeToken(token) {
  if (token) {
    revokedTokens.add(token);
  }
}

function isTokenRevoked(token) {
  return Boolean(token && revokedTokens.has(token));
}

module.exports = {
  activeSessions,
  revokedTokens,
  replaceSession,
  clearSession,
  revokeToken,
  isTokenRevoked
};
