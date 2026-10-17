/**
 * Landing lazy chunk entry (refactor 14).
 */
export { createAppLandingSystemMapDiagram } from "./landing-system-map.js";
export {
  registerLandingFlowHost,
  renderAppLandingFlow,
  renderAppLandingFlowLoading,
  setAppLandingFlowLoadingUi
} from "./landing-flow.js";

import { registerLandingFlowHost } from "./landing-flow.js";

/** @param {Record<string, unknown>} host */
export function registerLandingChunkHost(host) {
  registerLandingFlowHost(host);
}
