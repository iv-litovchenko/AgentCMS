import AVFoundation
import Speech

enum SpeechServiceError: LocalizedError {
    case notAuthorized
    case unavailable
    case emptyTranscript

    var errorDescription: String? {
        switch self {
        case .notAuthorized: return "Нет доступа к микрофону или распознаванию речи"
        case .unavailable: return "Распознавание речи недоступно"
        case .emptyTranscript: return "Ничего не распознано"
        }
    }
}

@MainActor
final class SpeechRecognitionService: ObservableObject {
    @Published private(set) var isRecording = false
    @Published private(set) var partialTranscript = ""

    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "ru-RU"))
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()

    func requestAuthorization() async -> Bool {
        let speechOK = await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
        let micOK = await withCheckedContinuation { continuation in
            AVAudioApplication.requestRecordPermission { granted in
                continuation.resume(returning: granted)
            }
        }
        return speechOK && micOK
    }

    func startRecording() throws {
        guard recognizer?.isAvailable == true else { throw SpeechServiceError.unavailable }
        cancelRecording()

        partialTranscript = ""
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .measurement, options: .duckOthers)
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        recognitionRequest = request

        recognitionTask = recognizer?.recognitionTask(with: request) { [weak self] result, error in
            Task { @MainActor in
                guard let self else { return }
                if let result {
                    self.partialTranscript = result.bestTranscription.formattedString
                }
                if error != nil {
                    self.cleanupRecording()
                }
            }
        }

        let inputNode = audioEngine.inputNode
        let format = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: format) { buffer, _ in
            request.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()
        isRecording = true
    }

    func finishRecording() async throws -> String {
        guard isRecording else { throw SpeechServiceError.emptyTranscript }

        recognitionRequest?.endAudio()

        for _ in 0..<30 {
            try await Task.sleep(nanoseconds: 100_000_000)
            let text = partialTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
            if !text.isEmpty {
                cleanupRecording()
                return text
            }
        }

        cleanupRecording()
        throw SpeechServiceError.emptyTranscript
    }

    func cancelRecording() {
        cleanupRecording()
        partialTranscript = ""
    }

    private func cleanupRecording() {
        isRecording = false
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
