/**
 * Structured Logger Utility for AI Operations
 * Isolated logging module supporting levels, context tags, and metadata formatting.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LEVEL = process.env.NODE_ENV === "production" ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

function formatMessage(level, moduleName, message, meta = null) {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | Meta: ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [AI-${level}] [${moduleName}] ${message}${metaStr}`;
}

const aiLogger = {
  debug(moduleName, message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.DEBUG) {
      console.log(formatMessage("DEBUG", moduleName, message, meta));
    }
  },
  info(moduleName, message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.INFO) {
      console.log(formatMessage("INFO", moduleName, message, meta));
    }
  },
  warn(moduleName, message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(formatMessage("WARN", moduleName, message, meta));
    }
  },
  error(moduleName, message, meta) {
    if (CURRENT_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(formatMessage("ERROR", moduleName, message, meta));
    }
  },
};

module.exports = aiLogger;
