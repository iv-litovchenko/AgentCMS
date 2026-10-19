/**
 * Eager landing chunk boot — must load before main.js (refactor 14).
 * Classic main.js dynamic import() is unreliable in some embedded webviews;
 * this module graph is loaded via <script type="module"> from index.html.
 */
import * as landingChunk from "./landing-runtime.js?v=29";

const g = globalThis;
g.__agentCmsLandingChunkModule = landingChunk;
g.__agentCmsLandingChunkModulePromise = Promise.resolve(landingChunk);
