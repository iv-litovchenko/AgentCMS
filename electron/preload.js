const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  isDesktop: true,
  platform: process.platform,
  version: process.env.npm_package_version || "0.1.0",
  revealFolder: (relPath, agentId) => ipcRenderer.invoke("desktop:reveal-folder", { relPath, agentId })
});
