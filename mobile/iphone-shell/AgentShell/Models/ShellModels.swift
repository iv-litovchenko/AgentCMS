import Foundation

enum ShellPhase: String, Codable, CaseIterable {
    case waiting
    case listening
    case thinking
    case speaking
    case disabled

    var label: String {
        switch self {
        case .waiting: return "Ожидаю"
        case .listening: return "Слушаю"
        case .thinking: return "Думаю"
        case .speaking: return "Говорю"
        case .disabled: return "Отключено"
        }
    }

    var emoji: String {
        switch self {
        case .waiting: return "🟡"
        case .listening: return "🔴"
        case .thinking: return "🟢"
        case .speaking: return "🔊"
        case .disabled: return "⏸️"
        }
    }
}

struct ShellRuntimeState: Codable, Equatable {
    var phase: ShellPhase
    var phrase: String
    var metrics: String?
    var lastShellReply: String?
    var updatedAt: String?

    static let empty = ShellRuntimeState(
        phase: .waiting,
        phrase: "",
        metrics: nil,
        lastShellReply: nil,
        updatedAt: nil
    )
}

struct AssistantMessage: Codable, Equatable {
    var id: String?
    var body: String?
    var role: String?
    var author: String?
    var created: String?

    var text: String {
        String(body ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

struct ShellStatusPayload: Codable {
    var agentId: String?
    var state: ShellRuntimeState?
    var settings: ShellSettingsSummary?
    var latestAgent: AssistantMessage?
    var shellReply: String?
    var connected: Bool?
    var qwenpaw: QwenPawStatus?

    struct ShellSettingsSummary: Codable {
        var messageTarget: String?
        var ttsEnabled: Bool?
    }

    struct QwenPawStatus: Codable {
        var ok: Bool?
        var serverOk: Bool?
        var agentOk: Bool?
    }

    static func pickReply(from status: ShellStatusPayload) -> String {
        if let stateReply = status.state?.lastShellReply?.trimmingCharacters(in: .whitespacesAndNewlines),
           !stateReply.isEmpty {
            return stateReply
        }
        if let shellReply = status.shellReply?.trimmingCharacters(in: .whitespacesAndNewlines),
           !shellReply.isEmpty {
            return shellReply
        }
        return status.latestAgent?.text ?? ""
    }
}

enum ShellRoute {
    static func label(for target: String) -> String {
        switch target {
        case "qwenpaw": return "QwenPaw"
        case "qwenpaw-log": return "QwenPaw + CMS"
        case "cms": return "CMS"
        default: return target.isEmpty ? "—" : target
        }
    }
}

struct ShellMessageResponse: Codable {
    var agentId: String?
    var ok: Bool?
    var error: String?
}

struct AssistantDeltaPayload: Codable {
    var streamId: String?
    var delta: String?
    var body: String?
}
