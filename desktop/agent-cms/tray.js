const { Tray, Menu } = require("electron");
const { getAppIcon } = require("./icon");

let tray = null;

function createTrayIcon() {
  const image = getAppIcon();
  if (process.platform === "darwin") {
    image.setTemplateImage(false);
  }
  return image.resize({ width: 18, height: 18 });
}

function createTray({ onShow, onShell, onQuit }) {
  if (tray) return tray;

  tray = new Tray(createTrayIcon());
  tray.setToolTip("Agent CMS");

  const contextMenu = Menu.buildFromTemplate([
    { label: "Показать Agent CMS", click: onShow },
    { label: "Agent Shell", click: onShell },
    { type: "separator" },
    { label: "Выход", click: onQuit }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("click", onShow);

  return tray;
}

function destroyTray() {
  if (!tray) return;
  tray.destroy();
  tray = null;
}

module.exports = {
  createTray,
  destroyTray
};
