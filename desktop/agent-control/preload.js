const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agentControl", {
  getBootstrap: () => ipcRenderer.invoke("control:get-bootstrap"),
  runAction: (actionId) => ipcRenderer.invoke("control:run-action", actionId),
  refreshStatus: () => ipcRenderer.invoke("control:refresh-status"),
  refreshBootstrap: () => ipcRenderer.invoke("control:refresh-bootstrap"),
  reloadUi: () => ipcRenderer.invoke("control:reload-ui"),
  openExternal: (url) => ipcRenderer.invoke("control:open-external", url),
  revealPath: (targetPath) => ipcRenderer.invoke("control:reveal-path", targetPath),
  testUrl: (url) => ipcRenderer.invoke("control:test-url", url),
  notify: (title, body) => ipcRenderer.invoke("control:notify", { title, body }),
  renderQr: (text) => ipcRenderer.invoke("control:render-qr", text),
  getMaintenanceMode: () => ipcRenderer.invoke("control:get-maintenance-mode"),
  setMaintenanceMode: (enabled) => ipcRenderer.invoke("control:set-maintenance-mode", enabled),
  onLog: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("control:log", handler);
    return () => ipcRenderer.removeListener("control:log", handler);
  },
  onActionState: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("control:action-state", handler);
    return () => ipcRenderer.removeListener("control:action-state", handler);
  }
});
