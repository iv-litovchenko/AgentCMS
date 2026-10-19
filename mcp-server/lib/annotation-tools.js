import { registerCommentTools } from "./comment-tools.js";
import { registerSidecarTools } from "./sidecar-tools.js";

/** Domain annotations: awn.annotation.comment (slot comments/) + awn.annotation.sidecar (.sidecar.md). */
export function registerAnnotationTools(reg, client, { pagePath }) {
  registerCommentTools(reg, client, { pagePath });
  registerSidecarTools(reg, client);
}
