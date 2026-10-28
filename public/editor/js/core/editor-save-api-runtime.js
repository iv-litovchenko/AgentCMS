/**
 * Save / file API helpers (REFACTOR-14 slice from main.js).
 */
(function initEditorSaveApiRuntime(global) {
  async function readSaveApiError(response) {
    const errorData = await response.json().catch(() => ({}));
    const reason = errorData.error || `Request failed with ${response.status}`;
    const details = errorData.details ? `: ${errorData.details}` : "";
    return `${reason}${details}`;
  }

  async function postSaveApiJson(apiPath, body, workspaceId) {
    const buildApiUrl = global.buildApiUrl;
    if (typeof buildApiUrl !== "function") {
      throw new Error("buildApiUrl missing");
    }
    const response = await fetch(buildApiUrl(apiPath, {}, workspaceId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {})
    });
    if (!response.ok) {
      throw new Error(await readSaveApiError(response));
    }
    return response.json().catch(() => ({}));
  }

  async function fetchLiveFileRevisions(paths, workspaceId) {
    const buildApiUrl = global.buildApiUrl;
    if (typeof buildApiUrl !== "function") {
      throw new Error("buildApiUrl missing");
    }
    const response = await fetch(buildApiUrl("/api/file/revisions", {}, workspaceId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paths: [...paths] })
    });
    if (!response.ok) throw new Error(`revisions:${response.status}`);
    const payload = await response.json();
    return payload?.revisions || {};
  }

  global.EditorSaveApi = {
    readSaveApiError,
    postSaveApiJson,
    fetchLiveFileRevisions
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
