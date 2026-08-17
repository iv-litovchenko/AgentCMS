import {
  getShellHttpsUrl,
  isShellSecureContext,
  shellPermissionIssue,
  renderShellPermissionBanner,
  warmUpMicrophone,
  runShellPermissionCheck,
  initShellPermissions
} from "/shell/shell-permissions.js?v=1";

const MOBILE_SHELL_PATH = "/shell/mobile/";

export function getMobileHttpsUrl(hostname = window.location.hostname) {
  return getShellHttpsUrl(hostname, MOBILE_SHELL_PATH);
}

export function isMobileSecureContext() {
  return isShellSecureContext();
}

export function mobilePermissionIssue() {
  return shellPermissionIssue({ shellPath: MOBILE_SHELL_PATH });
}

export function renderMobilePermissionBanner(bannerEl) {
  renderShellPermissionBanner(bannerEl, { shellPath: MOBILE_SHELL_PATH });
}

export { warmUpMicrophone };

export async function runMobilePermissionCheck({ micDialog } = {}) {
  return runShellPermissionCheck({ micDialog, shellPath: MOBILE_SHELL_PATH });
}

export function initMobilePermissions({ bannerEl, micDialog } = {}) {
  return initShellPermissions({ bannerEl, micDialog, shellPath: MOBILE_SHELL_PATH });
}
