const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shellApp", {
  isShellDesktop: true,
  platform: process.platform,
  applyWindowSettings: (settings) => ipcRenderer.invoke("shell:apply-window-settings", settings),
  positionWindowBottomCenter: () => ipcRenderer.invoke("shell:position-window-bottom-center"),
  onPttKey: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("shell:ptt-key", handler);
    return () => ipcRenderer.removeListener("shell:ptt-key", handler);
  }
});
