const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("shellApp", {
  isShellDesktop: true,
  platform: process.platform
});
