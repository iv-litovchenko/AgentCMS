const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shellApp", {
  isShellDesktop: true,
  platform: process.platform,
  applyWindowSettings: (settings) => ipcRenderer.invoke("shell:apply-window-settings", settings)
});
