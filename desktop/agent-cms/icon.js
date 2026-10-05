const path = require("path");
const { nativeImage } = require("electron");

const iconPath = path.join(__dirname, "assets", "icon.png");

function getAppIcon() {
  return nativeImage.createFromPath(iconPath);
}

function getAppIconPath() {
  return iconPath;
}

module.exports = {
  getAppIcon,
  getAppIconPath
};
