const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shellApp", {
  isShellDesktop: true,
  platform: process.platform,
  applyWindowSettings: (settings) => ipcRenderer.invoke("shell:apply-window-settings", settings),
  positionWindowBottomCenter: () => ipcRenderer.invoke("shell:position-window-bottom-center")
});
