const { contextBridge, ipcRenderer } = require("electron");

const isPetOverlay = process.argv.includes("--shell-pet-overlay");

contextBridge.exposeInMainWorld("shellApp", {
  isShellDesktop: true,
  isPetOverlay,
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
  showMainWindow: () => ipcRenderer.invoke("shell:show-main-window"),
  setPetOverlay: (enabled) => ipcRenderer.invoke("shell:set-pet-overlay", enabled),
  movePetWindowBy: (dx, dy) => ipcRenderer.invoke("shell:move-pet-window-by", dx, dy),
  setKeepAwake: (enabled) => ipcRenderer.invoke("shell:set-keep-awake", Boolean(enabled)),
  broadcastPetPhase: (payload) => ipcRenderer.invoke("shell:broadcast-pet-phase", payload),
  onPetPhase: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("shell:pet-phase", handler);
    return () => ipcRenderer.removeListener("shell:pet-phase", handler);
  },
  onPetOverlayChanged: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("shell:pet-overlay-changed", handler);
    return () => ipcRenderer.removeListener("shell:pet-overlay-changed", handler);
  },
  onPttKey: (callback) => {
    if (typeof callback !== "function") return () => {};
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("shell:ptt-key", handler);
    return () => ipcRenderer.removeListener("shell:ptt-key", handler);
  }
});
