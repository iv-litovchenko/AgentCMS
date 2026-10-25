const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronBridge", {
  retryLoad: () => ipcRenderer.invoke("url-shell:retry")
});
