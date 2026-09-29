const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const DEV_CA_PATHS = new Set(["/dev/mkcert-root-ca.pem", "/dev/ios-trust-ca.pem"]);

function getDevCaPath(projectRoot) {
  return path.join(projectRoot, ".dev-certs", "mkcert-root-ca.pem");
}

function readDevCertProvider(projectRoot) {
  try {
    return String(
      fs.readFileSync(path.join(projectRoot, ".dev-certs", "provider.txt"), "utf8")
    ).trim();
  } catch {
    return "";
  }
}

function isMkcertDev(projectRoot) {
  return readDevCertProvider(projectRoot) === "mkcert";
}

function exportMkcertRootCa(projectRoot) {
  if (!isMkcertDev(projectRoot)) return { ok: false, reason: "not-mkcert" };

  let caroot = "";
  try {
    caroot = String(execFileSync("mkcert", ["-CAROOT"], { encoding: "utf8" })).trim();
  } catch {
    return { ok: false, reason: "mkcert-missing" };
  }

  const source = path.join(caroot, "rootCA.pem");
  if (!fs.existsSync(source)) return { ok: false, reason: "root-ca-missing" };

  const target = getDevCaPath(projectRoot);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return { ok: true, path: target };
}

function tryServeDevCa(req, res, projectRoot) {
  const pathname = String(new URL(req.url || "/", "http://localhost").pathname);
  if (!DEV_CA_PATHS.has(pathname)) return false;

  if (!isMkcertDev(projectRoot)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("mkcert is not configured for this project.");
    return true;
  }

  exportMkcertRootCa(projectRoot);
  const caPath = getDevCaPath(projectRoot);
  if (!fs.existsSync(caPath)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("mkcert root CA missing. Run: npm run setup:certs");
    return true;
  }

  res.writeHead(200, {
    "Content-Type": "application/x-x509-ca-cert",
    "Content-Disposition": 'attachment; filename="mkcert-root-ca.pem"',
    "Cache-Control": "no-store"
  });
  fs.createReadStream(caPath).pipe(res);
  return true;
}

function wrapHttpHandler({ handler, redirectHandler, projectRoot }) {
  return (req, res) => {
    if (tryServeDevCa(req, res, projectRoot)) return;
    if (redirectHandler) return redirectHandler(req, res);
    return handler(req, res);
  };
}

module.exports = {
  DEV_CA_PATHS,
  getDevCaPath,
  isMkcertDev,
  exportMkcertRootCa,
  tryServeDevCa,
  wrapHttpHandler
};
