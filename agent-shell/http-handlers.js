const shellService = require("./shell-service");
const shellPresence = require("./shell-presence");
const windowSettings = require("./window-settings");
const { loadShellPromptTemplates } = require("./shell-prompt-presets");

const ttsService = require("./tts-service");
const sttService = require("./stt-service");

function createShellHandlers(deps) {
  async function tryHandleShellApi(req, res, url, { agentId, agentRoot, projectRoot }) {
    if (!url.pathname.startsWith("/api/shell")) return false;

    if (req.method === "GET" && url.pathname === "/api/shell/status") {
      try {
        const includeRuntimeProbe = url.searchParams.get("probe") === "1";
        const includeQwenSync = url.searchParams.get("sync") === "1";
        const payload = await shellService.buildStatusPayload(deps, agentRoot, agentId, {
          includeRuntimeProbe,
          includeQwenSync
        });
        deps.sendJson(res, 200, payload);
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read shell status",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/window") {
      try {
        const agentSettings = await shellService.readSettings(agentRoot);
        const settings = await windowSettings.migrateWindowSettingsFromAgent(projectRoot, agentSettings);
        deps.sendJson(res, 200, {
          agentId,
          projectRoot,
          settingsFile: windowSettings.AWN_SHELL_FILE,
          settings
        });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read shell window settings",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/window") {
      try {
        const payload = await deps.readJsonBody(req);
        const settings = await windowSettings.writeWindowSettings(projectRoot, payload?.settings || payload);
        shellService.emitShellEvent(agentId, "window_settings", settings);
        deps.sendJson(res, 200, {
          agentId,
          projectRoot,
          settingsFile: windowSettings.AWN_SHELL_FILE,
          settings
        });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to save shell window settings",
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

    if (req.method === "GET" && url.pathname === "/api/shell/dialogs/history") {
      try {
        const settings = await shellService.readSettings(agentRoot);
        const runtime =
          url.searchParams.get("runtime") || shellService.getMessageRuntime(settings);
        const limit = Number(url.searchParams.get("limit") || 25);
        const days = Number(url.searchParams.get("days") || 14);
        const messages = await shellService.fetchShellDialogHistory(agentRoot, agentId, {
          runtime,
          limit,
          days
        });
        const source = messages[0]?.source || (runtime === "qwenpaw" ? "qwenpaw" : "awn-dialogs");
        deps.sendJson(res, 200, { agentId, runtime, source, messages });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read shell dialog history",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/prompt-templates") {
      try {
        const templates = loadShellPromptTemplates(projectRoot, agentRoot);
        deps.sendJson(res, 200, { agentId, ...templates });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to load shell prompt templates",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/settings") {
      try {
        const payload = await deps.readJsonBody(req);
        const settings = await shellService.writeSettings(agentRoot, payload?.settings || payload, agentId);
        deps.sendJson(res, 200, {
          agentId,
          agentRoot,
          settingsFile: shellService.settingsAbsolute(agentRoot),
          settings
        });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to save shell settings",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/compose-draft") {
      try {
        const draft = await shellService.readComposeDraft(agentRoot);
        deps.sendJson(res, 200, { agentId, ...draft });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read compose draft",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/compose-draft") {
      try {
        const payload = await deps.readJsonBody(req);
        const draft = await shellService.writeComposeDraft(agentRoot, payload?.body ?? "", agentId);
        deps.sendJson(res, 200, { agentId, ...draft });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to save compose draft",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/voice-compose") {
      try {
        const payload = await deps.readJsonBody(req);
        const text = String(payload?.text || "").trim();
        if (!text) {
          deps.sendJson(res, 400, { error: "Text is required" });
          return true;
        }
        const draft = await shellService.appendVoiceToComposeDraft(agentRoot, agentId, text);
        await shellService.patchState(agentRoot, agentId, {
          phase: shellService.PHASE_WAITING,
          phrase: "Текст в поле ввода — отправьте вручную"
        });
        deps.sendJson(res, 200, { agentId, ...draft, appended: text });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to append voice text to compose draft",
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

    if (req.method === "GET" && url.pathname === "/api/shell/presence") {
      try {
        const state = await shellService.getState(agentRoot);
        deps.sendJson(res, 200, shellPresence.buildPresencePayload(agentId, state));
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read shell presence",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/presence") {
      try {
        const payload = await deps.readJsonBody(req);
        const record = shellPresence.upsertPresence(agentId, payload);
        let state;
        // Heartbeat держит presence в памяти (shell-presence.js). На диск — только при interact
        // (фокус вкладки, отправка сообщения), чтобы не перезаписывать state.json каждые 8 с.
        if (payload?.interact) {
          state = await shellService.patchState(agentRoot, agentId, {
            primaryClientId: record.clientId,
            shellSurfaceHost: record.surfaceHost || undefined,
            shellSurfaceHint: record.surfaceHint || undefined,
            shellSurfaceBackend: record.surfaceBackend || undefined
          });
        } else {
          state = await shellService.getState(agentRoot);
        }
        const presencePayload = shellPresence.buildPresencePayload(agentId, state);
        shellService.emitShellEvent(agentId, "presence", presencePayload);
        deps.sendJson(res, 200, presencePayload);
      } catch (error) {
        const message = String(error?.message || error);
        const status = /required/i.test(message) ? 400 : 500;
        deps.sendJson(res, status, {
          error: status === 400 ? "Invalid shell presence payload" : "Failed to update shell presence",
          details: message
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/message") {
      try {
        const payload = await deps.readJsonBody(req);
        const rawBody = String(payload?.body || "").trim();
        if (!rawBody) {
          deps.sendJson(res, 400, { error: "Message body is required" });
          return true;
        }
        const settings = await shellService.readSettings(agentRoot);
        const outboundSettings = shellService.applyOutboundSettings(settings, {
          ttsEnabled: payload?.ttsEnabled,
          ttsPrompt: payload?.ttsPrompt
        });
        const voiceInput = Boolean(payload?.voice) || String(payload?.author || "") === "sidecar";
        const deviceContext =
          payload?.deviceContext && typeof payload.deviceContext === "object" ? payload.deviceContext : null;
        let body = rawBody;
        let sttRefine = null;

        if (voiceInput && shellService.shouldRefineStt(settings)) {
          if (!shellService.usesQwenPaw(settings)) {
            deps.sendJson(res, 400, {
              error: "STT post-processing requires QwenPaw",
              details: "Задайте messageTarget qwenpaw или очистите sttPrompt"
            });
            return true;
          }
          await shellService.patchState(agentRoot, agentId, {
            phase: shellService.PHASE_THINKING,
            phrase: "Чищу расшифровку…"
          });
          try {
            sttRefine = await shellService.refineSttTranscript({
              settings,
              agentId,
              rawText: rawBody
            });
            body = String(sttRefine?.refined || rawBody).trim();
          } catch (error) {
            body = rawBody;
            sttRefine = {
              raw: rawBody,
              refined: rawBody,
              applied: false,
              error: String(error?.message || error)
            };
          }
          if (!body) {
            deps.sendJson(res, 400, { error: "STT post-processing returned empty text" });
            return true;
          }
        }

        body = shellService.applyDeviceContextToBody(body, deviceContext);

        const runtime = shellService.getMessageRuntime(settings);
        const ttsClientId = String(payload?.shellClientId || payload?.clientId || "").trim();
        const author = String(payload?.author || "shell").trim() || "shell";
        void shellService.logShellDialogUser(agentRoot, body, runtime);

        await shellService.patchState(agentRoot, agentId, {
          phase: shellService.PHASE_THINKING,
          phrase: String(payload?.displayPhrase || body).slice(0, 240),
          lastTtsClientId: ttsClientId || undefined,
          primaryClientId: ttsClientId || undefined,
          shellSurfaceHost: String(payload?.surfaceHost || "").trim() || undefined,
          shellSurfaceHint: String(payload?.surfaceHint || "").trim() || undefined,
          shellSurfaceBackend: String(payload?.surfaceBackend || "").trim() || undefined
        });
        if (ttsClientId) {
          shellPresence.upsertPresence(agentId, {
            shellClientId: ttsClientId,
            surfaceHost: payload?.surfaceHost,
            surfaceHint: payload?.surfaceHint,
            surfaceEmbedded: payload?.surfaceEmbedded,
            surfaceBackend: payload?.surfaceBackend,
            hostUrl: payload?.hostUrl,
            interact: true
          });
        }

        if (shellService.isShellShowDemoRequest(body)) {
          const result = shellService.buildShellShowDemoResult(body);
          shellService.emitShellEvent(agentId, "assistant_message", result.message);
          await shellService.patchState(agentRoot, agentId, {
            phase: shellService.PHASE_WAITING,
            phrase: "",
            lastAgentMessageId: result.message.id,
            lastShellReply: result.reply
          });
          void shellService.logShellDialogAgent(
            agentRoot,
            result.reply || result.message?.body || "",
            runtime
          );
          deps.sendJson(res, 200, { agentId, ...result });
          return true;
        }

        if (!shellService.isRuntimeImplemented(runtime)) {
          deps.sendJson(res, 501, {
            error: "Runtime not implemented",
            details: `${runtime} не поддерживается.`
          });
          return true;
        }

        deps.sendJson(res, 202, {
          agentId,
          accepted: true,
          runtime,
          sttRaw: sttRefine?.raw || undefined,
          sttRefined: sttRefine?.refined || undefined,
          sttRefineApplied: sttRefine?.applied || undefined,
          sttRefineError: sttRefine?.error || undefined,
          sttSessionId: sttRefine?.sessionId || undefined
        });

        void (async () => {
          try {
            await shellService.sendToRuntime(deps, {
              agentRoot,
              agentId,
              settings: outboundSettings,
              body,
              ttsClientId,
              author
            });
          } catch (error) {
            await shellService.patchState(agentRoot, agentId, {
              phase: shellService.PHASE_WAITING,
              phrase: String(error?.message || error).slice(0, 200)
            });
            shellService.emitShellEvent(agentId, "message_error", {
              message: String(error?.message || error)
            });
          }
        })();
        return true;
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

    if (req.method === "POST" && url.pathname === "/api/shell/meeting") {
      try {
        const payload = await deps.readJsonBody(req);
        const state = await shellService.setMeetingRecording(agentRoot, agentId, payload?.recording);
        deps.sendJson(res, 200, {
          agentId,
          state,
          recording: Boolean(state.meetingRecording)
        });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to update meeting recording state",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/voice-record") {
      try {
        const payload = await deps.readJsonBody(req);
        const saved = await shellService.storeShellVoiceRecord(agentRoot, payload || {});
        deps.sendJson(res, 200, { agentId, saved });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to store voice record",
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

    if (req.method === "GET" && url.pathname === "/api/shell/stt/capabilities") {
      try {
        const settings = await shellService.readSettings(agentRoot);
        const capabilities = await sttService.getCapabilities(settings);
        deps.sendJson(res, 200, { agentId, ...capabilities });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read STT capabilities",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/tts/capabilities") {
      try {
        const settings = await shellService.readSettings(agentRoot);
        const capabilities = await ttsService.getCapabilities(settings);
        deps.sendJson(res, 200, { agentId, ...capabilities });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read TTS capabilities",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/tts/voices") {
      try {
        const settings = await shellService.readSettings(agentRoot);
        const engine = url.searchParams.get("engine") || settings.ttsEngine || "browser";
        const lang = url.searchParams.get("lang") || "";
        const payload = await ttsService.listVoices(engine, settings, { lang: lang || undefined });
        deps.sendJson(res, 200, { agentId, ...payload });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to list TTS voices",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/tts/synthesize") {
      try {
        const payload = await deps.readJsonBody(req);
        const text = String(payload?.text || "").trim();
        if (!text) {
          deps.sendJson(res, 400, { error: "Text is required" });
          return true;
        }
        const stored = await shellService.readSettings(agentRoot);
        const client =
          payload?.settings && typeof payload.settings === "object" ? payload.settings : {};
        const synthSettings = shellService.mergeTtsSynthSettings(stored, client);
        const engineOverride = String(payload?.engine || "").trim();
        if (engineOverride && engineOverride !== "browser") {
          synthSettings.ttsEngine = engineOverride;
        }
        const result = await ttsService.synthesize(text, synthSettings);
        deps.sendJson(res, 200, { agentId, ok: true, ...result });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "TTS synthesis failed",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/camera/snapshot") {
      try {
        const payload = await deps.readJsonBody(req);
        const result = await shellService.requestCameraSnapshot(agentId, agentRoot, {
          waitMs: payload?.waitMs,
          reason: payload?.reason
        });
        deps.sendJson(res, 200, { agentId, ...result });
      } catch (error) {
        deps.sendJson(res, 504, {
          error: "Camera snapshot failed",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/camera/snapshot/complete") {
      try {
        const payload = await deps.readJsonBody(req);
        const requestId = String(payload?.requestId || "").trim();
        const dataUrl = String(payload?.dataUrl || payload?.image || "").trim();
        if (!requestId || !dataUrl) {
          deps.sendJson(res, 400, { error: "requestId and dataUrl are required" });
          return true;
        }
        const ok = shellService.completeCameraSnapshotRequest(agentId, requestId, {
          dataUrl,
          width: Number(payload?.width) || 0,
          height: Number(payload?.height) || 0
        });
        if (!ok) {
          deps.sendJson(res, 404, { error: "Unknown or expired snapshot request" });
          return true;
        }
        deps.sendJson(res, 200, { agentId, ok: true, requestId });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to complete camera snapshot",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/camera/speech-snapshot") {
      try {
        const payload = await deps.readJsonBody(req);
        const dataUrl = String(payload?.dataUrl || "").trim();
        if (!dataUrl) {
          deps.sendJson(res, 400, { error: "dataUrl is required" });
          return true;
        }
        const kind = String(payload?.kind || "speech").trim() === "manual" ? "manual" : "speech";
        const meta = await shellService.saveSpeechCameraSnapshot(agentRoot, {
          dataUrl,
          width: Number(payload?.width) || 0,
          height: Number(payload?.height) || 0,
          kind
        });
        deps.sendJson(res, 200, { agentId, ok: true, ...meta });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to save speech snapshot",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/camera/latest") {
      try {
        const kind = String(url.searchParams.get("kind") || "manual").trim();
        const snapshot = await shellService.getLatestCameraSnapshot(agentRoot, kind);
        if (!snapshot) {
          deps.sendJson(res, 404, { error: "No camera snapshot yet" });
          return true;
        }
        deps.sendJson(res, 200, { agentId, ok: true, snapshot });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read camera snapshot",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/screen/snapshot") {
      try {
        const payload = await deps.readJsonBody(req);
        const result = await shellService.requestScreenSnapshot(agentId, agentRoot, {
          waitMs: payload?.waitMs,
          reason: payload?.reason
        });
        deps.sendJson(res, 200, { agentId, ...result });
      } catch (error) {
        deps.sendJson(res, 504, {
          error: "Screen snapshot failed",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/screen/snapshot/complete") {
      try {
        const payload = await deps.readJsonBody(req);
        const requestId = String(payload?.requestId || "").trim();
        const dataUrl = String(payload?.dataUrl || payload?.image || "").trim();
        if (!requestId || !dataUrl) {
          deps.sendJson(res, 400, { error: "requestId and dataUrl are required" });
          return true;
        }
        const ok = shellService.completeScreenSnapshotRequest(agentId, requestId, {
          dataUrl,
          width: Number(payload?.width) || 0,
          height: Number(payload?.height) || 0
        });
        if (!ok) {
          deps.sendJson(res, 404, { error: "Unknown or expired snapshot request" });
          return true;
        }
        deps.sendJson(res, 200, { agentId, ok: true, requestId });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to complete screen snapshot",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/screen/speech-snapshot") {
      try {
        const payload = await deps.readJsonBody(req);
        const dataUrl = String(payload?.dataUrl || "").trim();
        if (!dataUrl) {
          deps.sendJson(res, 400, { error: "dataUrl is required" });
          return true;
        }
        const kind = String(payload?.kind || "speech").trim() === "manual" ? "manual" : "speech";
        const meta = await shellService.saveSpeechScreenSnapshot(agentRoot, {
          dataUrl,
          width: Number(payload?.width) || 0,
          height: Number(payload?.height) || 0,
          kind
        });
        deps.sendJson(res, 200, { agentId, ok: true, ...meta });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to save screen snapshot",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/screen/latest") {
      try {
        const kind = String(url.searchParams.get("kind") || "manual").trim();
        const snapshot = await shellService.getLatestScreenSnapshot(agentRoot, kind);
        if (!snapshot) {
          deps.sendJson(res, 404, { error: "No screen snapshot yet" });
          return true;
        }
        deps.sendJson(res, 200, { agentId, ok: true, snapshot });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read screen snapshot",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "GET" && url.pathname === "/api/shell/qwenpaw/agents") {
      try {
        const settings = await shellService.readSettings(agentRoot);
        if (!shellService.usesQwenPaw(settings)) {
          deps.sendJson(res, 400, { error: "QwenPaw mode is not enabled" });
          return true;
        }
        const agents = await shellService.fetchQwenPawAgents(settings);
        deps.sendJson(res, 200, {
          agentId,
          selectedAgentId: settings.qwenpawAgentId,
          agents
        });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to list QwenPaw agents",
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

    if (req.method === "POST" && url.pathname === "/api/shell/qwenpaw/rename-chat") {
      try {
        const payload = await deps.readJsonBody(req);
        const settings = await shellService.readSettings(agentRoot);
        const result = await shellService.renameQwenPawChat(agentRoot, agentId, settings, {
          name: payload?.name,
          sessionId: payload?.sessionId
        });
        deps.sendJson(res, 200, { agentId, ...result });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to rename QwenPaw chat",
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
