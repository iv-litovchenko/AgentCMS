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
export {
  registerLandingHubHost,
  renderAppLandingHub,
  renderAppLandingList
} from "./landing-hub.js";

import { registerLandingFlowHost } from "./landing-flow.js";
import { registerLandingHubHost } from "./landing-hub.js";

/** @param {Record<string, unknown>} host */
export function registerLandingChunkHost(host) {
  registerLandingFlowHost(host);
  registerLandingHubHost(host);
}
