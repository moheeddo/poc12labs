// 서버/클라이언트 공용 로거
// 환경변수 LOG_LEVEL로 레벨 조정 (debug | info | warn | error), 기본: info

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function getMinLevel(): LogLevel {
  if (typeof process !== "undefined" && process.env?.LOG_LEVEL) {
    return process.env.LOG_LEVEL as LogLevel;
  }
  return "debug";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[getMinLevel()];
}

function timestamp(): string {
  return new Date().toISOString();
}

function formatMeta(meta?: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return "";
  return " " + JSON.stringify(meta);
}

// 서버 로거 (ANSI 컬러 + 타임스탬프)
function serverLog(level: LogLevel, tag: string, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const color = LEVEL_COLORS[level];
  const line = `${color}[${level.toUpperCase()}]${RESET} ${timestamp()} [${tag}] ${message}${formatMeta(meta)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// 클라이언트 로거 (console.group 활용)
function clientLog(level: LogLevel, tag: string, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const prefix = `[${tag}]`;
  if (level === "error") console.error(prefix, message, meta ?? "");
  else if (level === "warn") console.warn(prefix, message, meta ?? "");
  else if (level === "debug") console.debug(prefix, message, meta ?? "");
  else console.log(prefix, message, meta ?? "");
}

const isServer = typeof window === "undefined";

// 태그별 로거 인스턴스 생성
export function createLogger(tag: string) {
  const log = isServer ? serverLog : clientLog;
  return {
    debug: (msg: string, meta?: Record<string, unknown>) => log("debug", tag, msg, meta),
    info: (msg: string, meta?: Record<string, unknown>) => log("info", tag, msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", tag, msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => log("error", tag, msg, meta),
  };
}
