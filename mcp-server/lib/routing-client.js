import { getActiveInstanceIdFromContext, getActiveWorkspaceIdFromContext } from "./agent-scope.js";
import { parseWorkspaceRef } from "./workspace-ref.js";

export class CmsRoutingClient {
  /** @param {import("./instance-registry.js").InstanceRegistry} registry */
  constructor(registry) {
    this.registry = registry;
  }

  resolveScope(opts = {}) {
    const explicitInstance = String(opts.instanceId || "").trim();
    const rawAgent =
      String(opts.agentId || "").trim() || getActiveWorkspaceIdFromContext() || "";
    const ref = parseWorkspaceRef(rawAgent);
    const instanceId = explicitInstance || getActiveInstanceIdFromContext() || ref.instanceId;
    const workspaceId =
      String(opts.agentId || "").includes(":") || getActiveInstanceIdFromContext()
        ? ref.workspaceId
        : ref.workspaceId || rawAgent;
    return { instanceId, workspaceId: workspaceId || ref.workspaceId };
  }

  async clientFor(opts = {}) {
    const { instanceId } = this.resolveScope(opts);
    return this.registry.getClient(instanceId);
  }

  async request(method, path, opts = {}) {
    const { instanceId, workspaceId } = this.resolveScope(opts);
    const client = await this.registry.getClient(instanceId);
    const agentScope = opts.agentScope !== false;
    return client.request(method, path, {
      ...opts,
      agentScope,
      agentId: agentScope ? workspaceId : opts.agentId
    });
  }

  get(path, query, opts) {
    return this.request("GET", path, { query, ...opts });
  }

  post(path, body, opts) {
    return this.request("POST", path, { body, ...opts });
  }

  put(path, body, opts) {
    return this.request("PUT", path, { body, ...opts });
  }

  patch(path, body, opts) {
    return this.request("PATCH", path, { body, ...opts });
  }

  delete(path, query, opts) {
    return this.request("DELETE", path, { query, ...opts });
  }

  /** @deprecated compat */
  get baseUrl() {
    return "";
  }
}
