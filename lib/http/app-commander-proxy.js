"use strict";

const { resolveCommanderInternalBase } = require("../platform/platform-apps");
const { createAppPathProxy } = require("./create-app-proxy");

const proxyAppCommanderRequest = createAppPathProxy({
  resolveInternalBase: resolveCommanderInternalBase,
  publicPrefix: "/app-commander",
  upstreamPrefix: "",
  unreachableError: "commander_unreachable"
});

module.exports = { proxyAppCommanderRequest };
