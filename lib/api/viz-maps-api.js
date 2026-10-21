const { createVizMapsService } = require("../viz/viz-maps-service");

function createVizMapsApi(deps) {
  const { sendJson, ...serviceDeps } = deps;
  const service = createVizMapsService(serviceDeps);

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

    if (url.pathname === "/api/viz/atlas" && req.method === "GET") {
      try {
        const filters = {
          about: url.searchParams.get("about") || "",
          kind: url.searchParams.get("kind") || "",
          section: url.searchParams.get("section") || ""
        };
        const payload = await service.readAtlas(filters);
        sendJson(res, 200, payload);
        return true;
      } catch (error) {
        sendJson(res, 500, { error: "Failed to read viz atlas", details: String(error.message || error) });
        return true;
      }
    }

    if (url.pathname === "/api/viz/maps-for-about" && req.method === "GET") {
      const about = url.searchParams.get("about") || "";
      if (!about) {
        sendJson(res, 400, { error: "Missing about query parameter" });
        return true;
      }
      try {
        const payload = await service.mapsForAbout(about);
        sendJson(res, 200, payload);
        return true;
      } catch (error) {
        sendJson(res, 500, { error: "Failed to list maps for about", details: String(error.message || error) });
        return true;
      }
    }

    if (url.pathname === "/api/viz/map" && req.method === "GET") {
      const mapPath = url.searchParams.get("path") || "";
      if (!mapPath) {
        sendJson(res, 400, { error: "Missing path query parameter" });
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
