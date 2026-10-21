const { createVizMapsService } = require("../viz/viz-maps-service");

function atlasFiltersFromUrl(url) {
  return {
    about: url.searchParams.get("recordPath") || url.searchParams.get("about") || "",
    kind: url.searchParams.get("kind") || "",
    section: url.searchParams.get("section") || ""
  };
}

async function resolveMapPathFromQuery(service, url) {
  const mapPath = url.searchParams.get("path") || url.searchParams.get("mapPath") || "";
  const about =
    url.searchParams.get("recordPath") || url.searchParams.get("about") || "";
  const kind = String(url.searchParams.get("kind") || "").trim().toLowerCase();
  if (!mapPath && !about) return "";
  return service.resolveMapPathForQuery(about, kind, mapPath);
}

function createVizMapsApi(deps) {
  const { sendJson, ...serviceDeps } = deps;
  const service = createVizMapsService(serviceDeps);

  async function sendAtlas(res, url) {
    const payload = await service.readAtlas(atlasFiltersFromUrl(url));
    sendJson(res, 200, payload);
  }

  async function sendMapsForRecord(res, url) {
    const about =
      url.searchParams.get("recordPath") || url.searchParams.get("about") || "";
    if (!about) {
      sendJson(res, 400, { error: "Missing recordPath (or about) query parameter" });
      return;
    }
    const payload = await service.mapsForAbout(about);
    sendJson(res, 200, payload);
  }

  async function handle(req, res, url) {
    if (url.pathname === "/api/viz/kinds" && req.method === "GET") {
      try {
        const payload = await service.listKinds();
        sendJson(res, 200, payload);
        return true;
      } catch (error) {
        sendJson(res, 500, { error: "Failed to list viz kinds", details: String(error.message || error) });
        return true;
      }
    }

    const listPaths = new Set(["/api/viz/atlas", "/api/viz/maps"]);
    if (listPaths.has(url.pathname) && req.method === "GET") {
      try {
        await sendAtlas(res, url);
        return true;
      } catch (error) {
        sendJson(res, 500, { error: "Failed to list viz maps", details: String(error.message || error) });
        return true;
      }
    }

    const mapsForRecordPaths = new Set(["/api/viz/maps-for-about", "/api/viz/maps-for-record"]);
    if (mapsForRecordPaths.has(url.pathname) && req.method === "GET") {
      try {
        await sendMapsForRecord(res, url);
        return true;
      } catch (error) {
        sendJson(res, 500, { error: "Failed to list maps for record", details: String(error.message || error) });
        return true;
      }
    }

    if (url.pathname === "/api/viz/map" && req.method === "GET") {
      const mapPath = await resolveMapPathFromQuery(service, url);
      if (!mapPath) {
        sendJson(res, 400, { error: "Missing path or (recordPath + kind) query parameters" });
        return true;
      }
      try {
        const payload = await service.readMap(mapPath);
        if (payload.error) {
          sendJson(res, payload.status || 500, payload);
          return true;
        }
        sendJson(res, 200, payload);
        return true;
      } catch (error) {
        sendJson(res, 500, { error: "Failed to read viz map", details: String(error.message || error) });
        return true;
      }
    }

    if (url.pathname === "/api/viz/map" && req.method === "POST") {
      try {
        const payload = await readJsonBody(req);
        const result = await service.writeMap(payload);
        if (result.error) {
          sendJson(res, result.status || 500, result);
          return true;
        }
        sendJson(res, 200, result);
        return true;
      } catch (error) {
        sendJson(res, 500, { error: "Failed to write viz map", details: String(error.message || error) });
        return true;
      }
    }

    if (url.pathname === "/api/viz/map" && req.method === "DELETE") {
      try {
        const query = Object.fromEntries(url.searchParams.entries());
        const result = await service.deleteMap(query);
        if (result.error) {
          sendJson(res, result.status || 500, result);
          return true;
        }
        sendJson(res, 200, result);
        return true;
      } catch (error) {
        sendJson(res, 500, { error: "Failed to delete viz map", details: String(error.message || error) });
        return true;
      }
    }

    return false;
  }

  return { handle, service };
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

module.exports = { createVizMapsApi };
