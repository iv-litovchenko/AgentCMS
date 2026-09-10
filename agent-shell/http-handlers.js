const shellService = require("./shell-service");
const shellPresence = require("./shell-presence");
const windowSettings = require("./window-settings");
const { loadShellPromptTemplates } = require("./shell-prompt-presets");

const ttsService = require("./tts-service");
const sttService = require("./stt-service");
const sttTranscribe = require("./stt-transcribe");

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
        await windowSettings.migrateWindowSettingsFromAgent(projectRoot, agentSettings);
        const settings = await windowSettings.readMergedWindowSettings(projectRoot, agentSettings);
        deps.sendJson(res, 200, {
          agentId,
          projectRoot,
          settingsFile: ".agent-shell/settings.json",
          globalSettingsFile: windowSettings.AWN_SHELL_FILE,
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
        const settings = await windowSettings.writeMergedWindowSettings(
          projectRoot,
          agentRoot,
          shellService,
          payload?.settings || payload
        );
        shellService.emitShellEvent(agentId, "window_settings", settings);
        deps.sendJson(res, 200, {
          agentId,
          projectRoot,
          settingsFile: ".agent-shell/settings.json",
          globalSettingsFile: windowSettings.AWN_SHELL_FILE,
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

    if (req.method === "GET" && url.pathname === "/api/shell/queue") {
      try {
        const settings = await shellService.readSettings(agentRoot);
        const queue = await shellService.getShellMessageQueue(agentRoot, settings);
        if (!queue.processing && Array.isArray(queue.items) && queue.items.length > 0) {
          shellService.scheduleShellMessageQueueDrain(deps, agentRoot, agentId);
        }
        deps.sendJson(res, 200, { agentId, queue });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to read shell queue",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "DELETE" && url.pathname === "/api/shell/queue") {
      try {
        const settings = await shellService.readSettings(agentRoot);
        const payload = await deps.readJsonBody(req).catch(() => ({}));
        const result = await shellService.resetShellMessageQueue(agentRoot, agentId, {
          pendingOnly: payload?.pendingOnly !== false
        }, settings);
        deps.sendJson(res, 200, { agentId, ...result });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to clear shell queue",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "PATCH" && url.pathname.startsWith("/api/shell/queue/")) {
      try {
        const settings = await shellService.readSettings(agentRoot);
        const id = decodeURIComponent(url.pathname.slice("/api/shell/queue/".length)).trim();
        const payload = await deps.readJsonBody(req);
        const result = await shellService.patchShellQueueItem(agentRoot, agentId, id, payload || {}, settings);
        deps.sendJson(res, 200, { agentId, ...result });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to update shell queue item",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "DELETE" && url.pathname.startsWith("/api/shell/queue/")) {
      try {
        const settings = await shellService.readSettings(agentRoot);
        const id = decodeURIComponent(url.pathname.slice("/api/shell/queue/".length)).trim();
        const result = await shellService.deleteShellQueueItem(agentRoot, agentId, id, settings);
        deps.sendJson(res, 200, { agentId, ...result });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to delete shell queue item",
          details: String(error?.message || error)
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

        const submitted = await shellService.submitShellMessage(deps, agentRoot, agentId, {
          body,
          author,
          voice: voiceInput,
          displayPhrase: String(payload?.displayPhrase || "").trim(),
          shellClientId: ttsClientId,
          surfaceHost: String(payload?.surfaceHost || "").trim(),
          surfaceHint: String(payload?.surfaceHint || "").trim(),
          surfaceBackend: String(payload?.surfaceBackend || "").trim(),
          hostUrl: String(payload?.hostUrl || "").trim(),
          ttsEnabled: payload?.ttsEnabled,
          ttsPrompt: payload?.ttsPrompt,
          deviceContext,
          sttRaw: sttRefine?.raw,
          sttRefined: sttRefine?.refined,
          sttRefineApplied: sttRefine?.applied,
          sttRefineError: sttRefine?.error
        });

        deps.sendJson(res, 202, {
          agentId,
          accepted: true,
          queued: true,
          queueId: submitted.item.id,
          runtime,
          queue: submitted.queue,
          sttRaw: sttRefine?.raw || undefined,
          sttRefined: sttRefine?.refined || undefined,
          sttRefineApplied: sttRefine?.applied || undefined,
          sttRefineError: sttRefine?.error || undefined,
          sttSessionId: sttRefine?.sessionId || undefined
        });
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

    if (req.method === "POST" && url.pathname === "/api/shell/stt/transcribe") {
      try {
        const payload = await deps.readJsonBody(req);
        const settings = await shellService.readSettings(agentRoot);
        const result = await sttTranscribe.transcribeFromRequest(payload, settings);
        deps.sendJson(res, 200, {
          agentId,
          text: String(result?.text || "").trim(),
          engine: String(result?.engine || settings.sttEngine || "").trim(),
          durationSec: Number(result?.durationSec) || 0,
          peakRms: Number(result?.peakRms) || 0
        });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to transcribe audio",
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
        const saved = await shellService.storeShellTtsRecord(agentRoot, {
          text,
          audioBase64: result.audio,
          mimeType: result.mimeType,
          engine: result.engine,
          voice: result.voice
        });
        deps.sendJson(res, 200, { agentId, ok: true, saved, ...result });
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

    if (req.method === "POST" && url.pathname === "/api/shell/interactive/cancel-pending") {
      try {
        const payload = await deps.readJsonBody(req);
        const targetAgentId = String(payload?.agentId || agentId || "").trim();
        if (!targetAgentId) {
          deps.sendJson(res, 400, { error: "agentId is required" });
          return true;
        }
        const reason = String(payload?.reason || "Agent switched").trim() || "Agent switched";
        const result = shellService.cancelPendingInteractiveRequests(targetAgentId, reason);
        deps.sendJson(res, 200, result);
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to cancel pending interactive requests",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/user-question/complete") {
      try {
        const payload = await deps.readJsonBody(req);
        const requestId = String(payload?.requestId || "").trim();
        if (!requestId) {
          deps.sendJson(res, 400, { error: "requestId is required" });
          return true;
        }
        const targetAgentId = String(payload?.agentId || agentId || "").trim();
        const cancelled = Boolean(payload?.cancelled);
        const answers =
          payload?.answers && typeof payload.answers === "object" && !Array.isArray(payload.answers)
            ? payload.answers
            : {};
        const ok = shellService.completeClaudeUserQuestionRequest(targetAgentId, requestId, {
          cancelled,
          answers
        });
        if (!ok) {
          deps.sendJson(res, 404, { error: "Unknown or expired question request" });
          return true;
        }
        deps.sendJson(res, 200, { agentId: targetAgentId, ok: true, requestId, cancelled });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to complete user question",
          details: String(error?.message || error)
        });
      }
      return true;
    }

    if (req.method === "POST" && url.pathname === "/api/shell/tool-permission/complete") {
      try {
        const payload = await deps.readJsonBody(req);
        const requestId = String(payload?.requestId || "").trim();
        if (!requestId) {
          deps.sendJson(res, 400, { error: "requestId is required" });
          return true;
        }
        const targetAgentId = String(payload?.agentId || agentId || "").trim();
        const allow = Boolean(payload?.allow);
        const scope = String(payload?.scope || "once").trim() === "session" ? "session" : "once";
        const ok = shellService.completeClaudeToolPermissionRequest(targetAgentId, requestId, {
          allow,
          scope
        });
        if (!ok) {
          deps.sendJson(res, 404, { error: "Unknown or expired permission request" });
          return true;
        }
        deps.sendJson(res, 200, { agentId: targetAgentId, ok: true, requestId, allow, scope });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to complete tool permission",
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
        const lookupAgentId =
          String(url.searchParams.get("agentId") || settings.qwenpawAgentId || "default").trim() || "default";
        let selectedAgentApproval = null;
        try {
          const profile = await shellService.fetchQwenPawAgentProfile(settings, lookupAgentId);
          selectedAgentApproval = profile.approvalLevel;
        } catch {
          selectedAgentApproval = null;
        }
        deps.sendJson(res, 200, {
          agentId,
          selectedAgentId: settings.qwenpawAgentId,
          lookupAgentId,
          selectedAgentApproval,
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

    if (req.method === "POST" && url.pathname === "/api/shell/qwenpaw/agent-approval") {
      try {
        const payload = await deps.readJsonBody(req);
        const settings = await shellService.readSettings(agentRoot);
        if (!shellService.usesQwenPaw(settings)) {
          deps.sendJson(res, 400, { error: "QwenPaw mode is not enabled" });
          return true;
        }
        const agentId = String(payload?.agentId || settings.qwenpawAgentId || "default").trim() || "default";
        const bypass = Boolean(payload?.bypass);
        const approvalLevel = bypass ? "OFF" : "AUTO";
        const result = await shellService.setQwenPawAgentApprovalLevel(settings, agentId, approvalLevel);
        deps.sendJson(res, 200, { agentId, approvalLevel: result.approvalLevel, bypass });
      } catch (error) {
        deps.sendJson(res, 500, {
          error: "Failed to update QwenPaw agent approval",
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
