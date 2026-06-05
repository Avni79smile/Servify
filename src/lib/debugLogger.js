/**
 * Debug Logger Utility
 * Comprehensive logging for tracking application flow and errors
 */

const LOG_LEVELS = {
  DEBUG: { label: "🔍 DEBUG", color: "#7B68EE" },
  INFO: { label: "ℹ️ INFO", color: "#0066FF" },
  SUCCESS: { label: "✅ SUCCESS", color: "#00AA00" },
  WARN: { label: "⚠️ WARN", color: "#FF9900" },
  ERROR: { label: "❌ ERROR", color: "#FF0000" },
};

const createLogger = (module) => {
  const log = (level, message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const config = LOG_LEVELS[level];
    
    console.group(
      `%c${config.label} [${module}] ${message}`,
      `color: ${config.color}; font-weight: bold; font-size: 12px;`
    );
    console.log(`%cTime: ${timestamp}`, "color: #666; font-size: 11px;");
    
    if (data) {
      console.log("%cData:", "color: #333; font-weight: bold;");
      console.table(data);
    }
    
    console.groupEnd();
  };

  return {
    debug: (msg, data) => log("DEBUG", msg, data),
    info: (msg, data) => log("INFO", msg, data),
    success: (msg, data) => log("SUCCESS", msg, data),
    warn: (msg, data) => log("WARN", msg, data),
    error: (msg, data) => log("ERROR", msg, data),
  };
};

export const logger = {
  auth: createLogger("AUTH"),
  career: createLogger("CAREER"),
  booking: createLogger("BOOKING"),
  supabase: createLogger("SUPABASE"),
  validation: createLogger("VALIDATION"),
  form: createLogger("FORM"),
  sync: createLogger("SYNC"),
  storage: createLogger("STORAGE"),
};

export default logger;
