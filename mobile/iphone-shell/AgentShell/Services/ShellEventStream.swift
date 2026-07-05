import Foundation

enum ShellStreamEvent {
    case status(ShellStatusPayload)
    case state(ShellRuntimeState)
    case assistantMessage(AssistantMessage)
    case assistantDelta(AssistantDeltaPayload)
    case connected
    case error(String)
}

final class ShellEventStream {
    typealias Handler = (ShellStreamEvent) -> Void

    private let url: URL
    private let session: URLSession
    private var streamTask: Task<Void, Never>?
    private var onEvent: Handler?
    private var isRunning = false

    init(url: URL, session: URLSession = .shared) {
        self.url = url
        self.session = session
    }

    func start(onEvent: @escaping Handler) {
        stop()
        self.onEvent = onEvent
        isRunning = true

        streamTask = Task { [weak self] in
            await self?.readStream()
        }
    }

    func stop() {
        isRunning = false
        streamTask?.cancel()
        streamTask = nil
    }

    private func readStream() async {
        do {
            var request = URLRequest(url: url)
            request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
            request.timeoutInterval = .infinity

            let (bytes, response) = try await session.bytes(for: request)
            if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                emit(.error("SSE HTTP \(http.statusCode)"))
                return
            }

            emit(.connected)

            var eventName = "message"
            var dataLines: [String] = []

            for try await line in bytes.lines {
                guard isRunning, !Task.isCancelled else { break }

                if line.hasPrefix(":") {
                    continue
                }

                if line.isEmpty {
                    if !dataLines.isEmpty {
                        dispatch(event: eventName, data: dataLines.joined(separator: "\n"))
                    }
                    eventName = "message"
                    dataLines = []
                    continue
                }

                if line.hasPrefix("event:") {
                    eventName = String(line.dropFirst(6)).trimmingCharacters(in: .whitespaces)
                } else if line.hasPrefix("data:") {
                    dataLines.append(String(line.dropFirst(5)).trimmingCharacters(in: .whitespaces))
                }
            }
        } catch is CancellationError {
            return
        } catch {
            if isRunning {
                emit(.error(error.localizedDescription))
            }
        }
    }

    private func dispatch(event: String, data: String) {
        guard let jsonData = data.data(using: .utf8) else { return }
        let decoder = JSONDecoder()

        switch event {
        case "status":
            if let status = try? decoder.decode(ShellStatusPayload.self, from: jsonData) {
                emit(.status(status))
            }
        case "state":
            if let wrapper = try? decoder.decode(StateWrapper.self, from: jsonData) {
                emit(.state(wrapper.resolved))
            } else if let state = try? decoder.decode(ShellRuntimeState.self, from: jsonData) {
                emit(.state(state))
            }
        case "assistant_message":
            if let wrapper = try? decoder.decode(AssistantMessageWrapper.self, from: jsonData) {
                emit(.assistantMessage(wrapper.resolved))
            }
        case "assistant_delta":
            if let delta = try? decoder.decode(AssistantDeltaPayload.self, from: jsonData) {
                emit(.assistantDelta(delta))
            }
        default:
            break
        }
    }

    private func emit(_ event: ShellStreamEvent) {
        DispatchQueue.main.async { [weak self] in
            self?.onEvent?(event)
        }
    }

    private struct StateWrapper: Decodable {
        var payload: ShellRuntimeState?
        var phase: ShellPhase?
        var phrase: String?
        var metrics: String?
        var lastShellReply: String?

        var resolved: ShellRuntimeState {
            if let payload { return payload }
            return ShellRuntimeState(
                phase: phase ?? .waiting,
                phrase: phrase ?? "",
                metrics: metrics,
                lastShellReply: lastShellReply,
                updatedAt: nil
            )
        }
    }

    private struct AssistantMessageWrapper: Decodable {
        var message: AssistantMessage?
        var payload: AssistantMessage?

        var resolved: AssistantMessage {
            message ?? payload ?? AssistantMessage()
        }
    }
}
