const { dialog } = require("electron");

function initAutoUpdater({ app, getMainWindow }) {
  if (!app.isPackaged) {
    console.info("Auto-update skipped in development mode");
    return;
  }

  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (error) {
    console.warn("electron-updater is not available:", error.message);
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = console;

  autoUpdater.on("update-available", () => {
    console.info("Update available, downloading...");
  });

  autoUpdater.on("update-downloaded", () => {
    const win = getMainWindow();
    const response = dialog.showMessageBoxSync(win || undefined, {
      type: "info",
      title: "Обновление Agent CMS",
      message: "Доступна новая версия. Перезапустить сейчас?",
      buttons: ["Перезапустить", "Позже"],
      defaultId: 0,
      cancelId: 1
    });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (error) => {
    console.error("Auto-update error:", error.message);
  });

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((error) => {
      console.warn("Update check failed:", error.message);
    });
  }, 5000);
}

module.exports = {
  initAutoUpdater
};
