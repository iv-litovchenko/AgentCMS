const os = require("os");
const fs = require("fs");
const path = require("path");

function readCachedLanIp(projectRoot) {
  if (!projectRoot) return "";
  try {
    const ip = String(
      fs.readFileSync(path.join(projectRoot, ".dev-certs", "last-ip.txt"), "utf8")
    ).trim();
    return ip && ip !== "127.0.0.1" ? ip : "";
  } catch {
    return "";
  }
}

function getLanIPv4(projectRoot) {
  try {
    for (const nets of Object.values(os.networkInterfaces())) {
      for (const net of nets || []) {
        if (net && net.family === "IPv4" && !net.internal) return net.address;
      }
    }
  } catch {
    // macOS / sandbox can throw ERR_SYSTEM_ERROR on uv_interface_addresses
  }
  return readCachedLanIp(projectRoot);
}

module.exports = {
  getLanIPv4,
  readCachedLanIp
};
