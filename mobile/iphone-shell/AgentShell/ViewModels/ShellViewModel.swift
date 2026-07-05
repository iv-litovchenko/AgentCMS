import Foundation

@MainActor
final class ShellViewModel: ObservableObject {
    @Published var phase: ShellPhase = .waiting
    @Published var phrase = ""
    @Published var replyText = ""
    @Published var streamReplyText = ""
    @Published var connectionLabel = "Отключено"
    @Published var routeLabel = "—"
    @Published var serverLabel = ""
    @Published var errorMessage: String?
    @Published var isSending = false
    @Published var permissionsGranted = false

    let configStore = ShellConfigStore.shared
    let speech = SpeechRecognitionService()
    let tts = TextToSpeechService()

    private let api = ShellAPIClient()
    private var eventStream: ShellEventStream?
    private var lastSpokenBody = ""
    private var lastHandledMessageId = ""

    func onAppear() {
        Task {
            permissionsGranted = await speech.requestAuthorization()
            reconnect()
        }
    }

    func onDisappear() {
        disconnect()
    }

    func reconnect() {
        disconnect()
        serverLabel = configStore.cmsBaseURL.host ?? configStore.normalizedBaseURLString()
        connectionLabel = "Подключение… · \(serverLabel)"
        errorMessage = nil

        Task {
            do {
                let status = try await api.fetchStatus()
                applyStatus(status)
                openStream()
            } catch {
                connectionLabel = "Нет связи · \(serverLabel)"
                errorMessage = error.localizedDescription
            }
        }
    }

    func disconnect() {
        eventStream?.stop()
        eventStream = nil
        connectionLabel = "Отключено"
    }

    private func openStream() {
        do {
            let stream = try api.openEventStream()
            eventStream = stream
            stream.start { [weak self] event in
                Task { @MainActor in
                    self?.handleStreamEvent(event)
                }
            }
        } catch {
            connectionLabel = "Ошибка SSE"
            errorMessage = error.localizedDescription
        }
    }

    private func handleStreamEvent(_ event: ShellStreamEvent) {
        switch event {
        case .connected:
            connectionLabel = "Live · \(serverLabel)"
        case .status(let status):
            applyStatus(status)
        case .state(let state):
            applyRuntimeState(state)
        case .assistantMessage(let message):
            handleAssistantMessage(message)
        case .assistantDelta(let delta):
            if let chunk = delta.delta ?? delta.body, !chunk.isEmpty {
                streamReplyText += chunk
            }
        case .error(let message):
            connectionLabel = "Обрыв SSE · \(serverLabel)"
            errorMessage = message
            scheduleStreamReconnect()
        }
    }

    private func scheduleStreamReconnect() {
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            guard eventStream != nil else { return }
            openStream()
        }
    }

    private func applyStatus(_ status: ShellStatusPayload) {
        if let state = status.state {
            applyRuntimeState(state)
        }
        let reply = ShellStatusPayload.pickReply(from: status)
        if !reply.isEmpty {
            replyText = reply
        }
        updateRoute(from: status)
    }

    private func updateRoute(from status: ShellStatusPayload) {
        let target = status.settings?.messageTarget ?? ""
        var label = ShellRoute.label(for: target)
        if target.hasPrefix("qwenpaw"), status.qwenpaw?.ok == false {
            label += " · offline"
        }
        routeLabel = label
    }

    private func applyRuntimeState(_ state: ShellRuntimeState) {
        phase = state.phase
        phrase = state.phrase
        if let shellReply = state.lastShellReply?.trimmingCharacters(in: .whitespacesAndNewlines),
           !shellReply.isEmpty {
            replyText = shellReply
        }
    }

    private func handleAssistantMessage(_ message: AssistantMessage) {
        let id = message.id ?? message.text.hashValue.description
        guard id != lastHandledMessageId else { return }
        lastHandledMessageId = id

        let body = message.text
        guard !body.isEmpty else { return }

        streamReplyText = ""
        replyText = body
        isSending = false

        guard configStore.ttsEnabled else {
            phase = .waiting
            return
        }

        let spoken = TextToSpeechService.prepareSpeechText(body)
        guard spoken != lastSpokenBody else { return }
        lastSpokenBody = spoken
        phase = .speaking
        tts.speak(body)
    }

    func beginHoldToTalk() {
        guard !isSending else { return }
        errorMessage = nil
        tts.stop()
        Task {
            if !permissionsGranted {
                permissionsGranted = await speech.requestAuthorization()
                guard permissionsGranted else {
                    errorMessage = SpeechServiceError.notAuthorized.localizedDescription
                    return
                }
            }
            do {
                phase = .listening
                phrase = "Слушаю…"
                try speech.startRecording()
            } catch {
                phase = .waiting
                phrase = ""
                errorMessage = error.localizedDescription
            }
        }
    }

    func endHoldToTalk() {
        guard speech.isRecording else { return }
        Task {
            do {
                let transcript = try await speech.finishRecording()
                phrase = transcript
                await sendMessage(transcript, voice: true)
            } catch {
                phase = .waiting
                phrase = ""
                if !(error is SpeechServiceError) {
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    func cancelHoldToTalk() {
        speech.cancelRecording()
        phase = .waiting
        phrase = ""
    }

    func sendTypedMessage(_ text: String) {
        Task {
            await sendMessage(text, voice: false)
        }
    }

    private func sendMessage(_ body: String, voice: Bool) async {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        isSending = true
        phase = .thinking
        phrase = trimmed
        streamReplyText = ""
        errorMessage = nil
        tts.stop()

        do {
            _ = try await api.sendMessage(body: trimmed, voice: voice)
        } catch {
            isSending = false
            phase = .waiting
            errorMessage = error.localizedDescription
        }
    }

    func stopSpeaking() {
        tts.stop()
        Task {
            try? await api.stopTTS()
            if phase == .speaking {
                phase = .waiting
                phrase = ""
            }
        }
    }

    var displayReply: String {
        if !streamReplyText.isEmpty { return streamReplyText }
        return replyText
    }
}
