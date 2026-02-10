type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const minLevel: LogLevel =
	process.env.NODE_ENV === "production" ? "info" : "debug";

function shouldLog(level: LogLevel): boolean {
	return LEVELS[level] >= LEVELS[minLevel];
}

export const logger = {
	debug: (...args: unknown[]) => {
		if (shouldLog("debug")) console.log(...args);
	},
	info: (...args: unknown[]) => {
		if (shouldLog("info")) console.log(...args);
	},
	warn: (...args: unknown[]) => {
		if (shouldLog("warn")) console.warn(...args);
	},
	error: (...args: unknown[]) => {
		if (shouldLog("error")) console.error(...args);
	},
};
