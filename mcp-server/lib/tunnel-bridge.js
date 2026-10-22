import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tunnel = require("../../lib/tunnel/registry.js");

export function createMcpTunnelRegistry() {
  return {
    createClient(deviceId) {
      return tunnel.createTunnelApiClient(deviceId);
    },
    listOnlineDeviceIds() {
      return tunnel.listOnlineDeviceIds();
    }
  };
}
