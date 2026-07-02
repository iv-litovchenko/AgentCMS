const { Menu, shell } = require("electron");

function buildApplicationMenu({ app, mainWindow, onOpenWorkspace, onShowWindow, onShowShell, onQuit }) {
  const isMac = process.platform === "darwin";

  const fileSubmenu = [
    {
      label: "Open Workspace...",
      accelerator: "CmdOrCtrl+O",
      click: onOpenWorkspace
    },
    { type: "separator" },
    isMac ? { role: "close", label: "Close Window" } : { role: "quit", label: "Quit" }
  ];

  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about", label: "About Agent CMS" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide", label: "Hide Agent CMS" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit", label: "Quit Agent CMS" }
            ]
          }
        ]
      : []),
    {
      label: "File",
      submenu: fileSubmenu
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [
        { label: "Show Agent CMS", click: onShowWindow },
        { label: "Agent Shell", accelerator: "CmdOrCtrl+Shift+S", click: onShowShell },
        { type: "separator" },
        { role: "minimize" },
        ...(isMac ? [{ role: "zoom" }, { type: "separator" }, { role: "front" }] : [{ role: "close" }])
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open Logs Folder",
          click: () => {
            shell.openPath(require("./logger").getLogDirectory());
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

module.exports = {
  buildApplicationMenu
};
