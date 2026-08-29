const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shellApp", {
  isShellDesktop: true,
  platform: process.platform,
  applyWindowSettings: (settings) => ipcRenderer.invoke("shell:apply-window-settings", settings),
  positionWindowBottomCenter: () => ipcRenderer.invoke("shell:position-window-bottom-center"),
  windowControl: (action) => ipcRenderer.invoke("shell:window-control", action),
  getWindowState: () => ipcRenderer.invoke("shell:window-state"),
  onWindowState: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("shell:window-state", handler);
    return () => ipcRenderer.removeListener("shell:window-state", handler);
  },
  onPttKey: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("shell:ptt-key", handler);
    return () => ipcRenderer.removeListener("shell:ptt-key", handler);
  }
});
