const fs = require("fs");
const path = require("path");
const { app } = require("electron");

let logStream = null;

function getLogDirectory() {
  if (process.platform === "darwin") {
    return path.join(app.getPath("home"), "Library", "Logs", "Agent CMS");
  }
  return path.join(app.getPath("userData"), "logs");
}

function getLogFilePath() {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(getLogDirectory(), `app-${date}.log`);
}

function formatArgs(args) {
  return args
    .map((item) => {
      if (item instanceof Error) {
        return item.stack || item.message;
      }
      if (typeof item === "object") {
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      }
      return String(item);
    })
    .join(" ");
}

function writeLine(level, args) {
  if (!logStream) return;
  const line = `[${new Date().toISOString()}] [${level}] ${formatArgs(args)}\n`;
  logStream.write(line);
}

function initLogger() {
  const logDir = getLogDirectory();
  fs.mkdirSync(logDir, { recursive: true });
  logStream = fs.createWriteStream(getLogFilePath(), { flags: "a" });
  writeLine("INFO", [`Log directory: ${logDir}`]);

  for (const level of ["log", "info", "warn", "error"]) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      writeLine(level.toUpperCase(), args);
      original(...args);
    };
  }

  process.on("uncaughtException", (error) => {
    writeLine("FATAL", [error]);
  });

  process.on("unhandledRejection", (reason) => {
    writeLine("FATAL", [reason]);
  });

  return { logDir, logFile: getLogFilePath() };
}

module.exports = {
  initLogger,
  getLogDirectory,
  getLogFilePath
};
