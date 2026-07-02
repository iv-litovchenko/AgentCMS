const shellService = require("./shell-service");

function createShellHandlers(deps) {
  async function tryHandleShellApi(req, res, url, { agentId, agentRoot }) {
    if (!url.pathname.startsWith("/api/shell")) return false;

    if (req.method === "GET" && url.pathname === "/api/shell/status") {
      try {
        const payload = await shellService.buildStatusPayload(deps, agentRoot, agentId);
        deps.sendJson(res, 200, payload);
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read shell status",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/settings") {
      try {
        const settings = await shellService.readSettings(agentRoot);
        deps.sendJson(res, 200, { agentId, settings });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read shell settings",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/settings") {
      try {
        const payload = await deps.readJsonBody(req);
        const settings = await shellService.writeSettings(agentRoot, payload?.settings || payload, agentId);
        deps.sendJson(res, 200, { agentId, settings });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to save shell settings",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/state") {
      try {
        const payload = await deps.readJsonBody(req);
        const state = await shellService.patchState(agentRoot, agentId, payload?.state || payload);
        deps.sendJson(res, 200, { agentId, state });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to update shell state",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/message") {
      try {
        const payload = await deps.readJsonBody(req);
        const body = String(payload?.body || "").trim();
        if (!body) {
          deps.sendJson(res, 400, { error: "Message body is required" });
          return true;
        }
        const settings = await shellService.readSettings(agentRoot);
        await shellService.patchState(agentRoot, agentId, {
          phase: shellService.PHASE_THINKING,
          phrase: body.slice(0, 240)
        });

        let result;
        if (shellService.usesQwenPaw(settings)) {
          result = await shellService.sendToQwenPaw(deps, {
            agentRoot,
            agentId,
            settings,
            body,
            onProgress: (progress) => {
              void shellService.patchState(agentRoot, agentId, {
                phase: shellService.PHASE_THINKING,
                phrase: progress?.status === "created" ? "QwenPaw думает…" : body.slice(0, 240)
              });
            }
          });
          shellService.emitShellEvent(agentId, "assistant_message", result.message);
          await shellService.patchState(agentRoot, agentId, {
            phase: shellService.PHASE_WAITING,
            phrase: result.reply.slice(0, 240),
            lastAgentMessageId: result.message.id,
            lastShellReply: result.reply
          });
        } else {
          result = await shellService.sendUserMessage(deps, {
            agentRoot,
            settings,
            body,
            author: payload?.author || "shell"
          });
          await shellService.patchState(agentRoot, agentId, {
            phase: shellService.PHASE_WAITING,
            phrase: body.slice(0, 240)
          });
        }

        deps.sendJson(res, 200, { agentId, ...result });
      } catch (error) {
        await shellService.patchState(agentRoot, agentId, {
          phase: shellService.PHASE_WAITING,
          phrase: String(error?.message || error).slice(0, 200)
        });
        deps.sendJson(res, 500, {
          error: "Failed to send shell message",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/ptt") {
      try {
        const payload = await deps.readJsonBody(req);
        const state = await shellService.setPttHeld(agentRoot, agentId, payload?.held);
        deps.sendJson(res, 200, { agentId, state, held: Boolean(state.pttHeld) });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to update PTT state",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/stop-tts") {
      try {
        const payload = await shellService.stopTts(agentRoot, agentId);
        deps.sendJson(res, 200, { agentId, ...payload });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to stop TTS",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/qwenpaw/chats") {
      try {
        const settings = await shellService.readSettings(agentRoot);
        if (!shellService.usesQwenPaw(settings)) {
          deps.sendJson(res, 400, { error: "QwenPaw mode is not enabled" });
          return true;
        }
        const sessionId = shellService.buildQwenPawSessionId(settings, agentId);
        const chats = await shellService.fetchQwenPawChats(settings);
        deps.sendJson(res, 200, { agentId, sessionId, chats });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to list QwenPaw chats",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/qwenpaw/new-chat") {
      try {
        const payload = await deps.readJsonBody(req);
        const settings = await shellService.readSettings(agentRoot);
        const result = await shellService.startNewQwenPawChat(agentRoot, agentId, settings, {
          name: payload?.name
        });
        deps.sendJson(res, 200, { agentId, ...result });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to start new QwenPaw chat",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/qwenpaw/select-chat") {
      try {
        const payload = await deps.readJsonBody(req);
        const settings = await shellService.readSettings(agentRoot);
        const result = await shellService.selectQwenPawChat(agentRoot, agentId, settings, {
          sessionId: payload?.sessionId,
          chatName: payload?.chatName || payload?.name
        });
        deps.sendJson(res, 200, { agentId, ...result });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to select QwenPaw chat",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/stream") {
      try {
        await shellService.streamShellEvents(req, res, { agentId, agentRoot, deps });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to open shell stream",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    deps.sendJson(res, 404, { error: "Unknown shell API route", path: url.pathname });
    return true;
  }

  return { tryHandleShellApi };
}

module.exports = { createShellHandlers };
