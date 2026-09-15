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

function scoreLanAddress(name, address) {
  let score = 0;
  if (/^172\.20\.10\./.test(address)) score = 100;
  else if (/^192\.168\./.test(address)) score = 90;
  else if (/^10\./.test(address)) score = 70;
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) score = 60;
  else score = 10;

  if (/^(en\d+|wlan\d+|wi-?fi|eth\d+|bridge\d+)$/i.test(name)) score += 8;
  if (/^(lo|gif|stf|awdl|llw|utun|vmnet|veth|docker|br-|tap|tun)/i.test(name)) score -= 40;

  return score;
}

function getLanIPv4(projectRoot) {
  const candidates = [];

  try {
    for (const [name, nets] of Object.entries(os.networkInterfaces())) {
      for (const net of nets || []) {
        if (!net || net.family !== "IPv4" || net.internal) continue;
        const address = String(net.address || "").trim();
        if (!address || address === "127.0.0.1") continue;
        candidates.push({
          name,
          address,
          score: scoreLanAddress(name, address)
        });
      }
    }
  } catch {
    // macOS / sandbox can throw ERR_SYSTEM_ERROR on uv_interface_addresses
  }

  if (candidates.length) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].address;
  }

  return readCachedLanIp(projectRoot);
}

module.exports = {
  getLanIPv4,
  readCachedLanIp
};
