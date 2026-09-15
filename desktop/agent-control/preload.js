const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agentControl", {
  getBootstrap: () => ipcRenderer.invoke("control:get-bootstrap"),
  runAction: (actionId) => ipcRenderer.invoke("control:run-action", actionId),
  refreshStatus: () => ipcRenderer.invoke("control:refresh-status"),
  openExternal: (url) => ipcRenderer.invoke("control:open-external", url),
  revealPath: (targetPath) => ipcRenderer.invoke("control:reveal-path", targetPath),
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
