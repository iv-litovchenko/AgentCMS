import Foundation

struct ShellConfig: Equatable {
    var cmsBaseURL: URL
    var agentId: String

    static let defaultBaseURL = URL(string: "http://127.0.0.1:3000")!
    static let defaultAgentId = "agent-cms-test"

    static var current: ShellConfig {
        ShellConfig(
            cmsBaseURL: ShellConfigStore.shared.cmsBaseURL,
            agentId: ShellConfigStore.shared.agentId
        )
    }
}

final class ShellConfigStore: ObservableObject {
    static let shared = ShellConfigStore()

    private enum Keys {
        static let cmsBaseURL = "agentcms.shell.cmsBaseURL"
        static let agentId = "agentcms.shell.agentId"
        static let ttsEnabled = "agentcms.shell.ttsEnabled"
    }

    @Published var cmsBaseURL: URL {
        didSet { UserDefaults.standard.set(cmsBaseURL.absoluteString, forKey: Keys.cmsBaseURL) }
    }

    @Published var agentId: String {
        didSet { UserDefaults.standard.set(agentId, forKey: Keys.agentId) }
    }

    @Published var ttsEnabled: Bool {
        didSet { UserDefaults.standard.set(ttsEnabled, forKey: Keys.ttsEnabled) }
    }

    private init() {
        if let raw = UserDefaults.standard.string(forKey: Keys.cmsBaseURL),
           let url = URL(string: raw.trimmingCharacters(in: .whitespacesAndNewlines)) {
            cmsBaseURL = url
        } else {
            cmsBaseURL = ShellConfig.defaultBaseURL
        }

        let storedAgent = UserDefaults.standard.string(forKey: Keys.agentId)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        agentId = (storedAgent?.isEmpty == false) ? storedAgent! : ShellConfig.defaultAgentId

        if UserDefaults.standard.object(forKey: Keys.ttsEnabled) == nil {
            ttsEnabled = true
        } else {
            ttsEnabled = UserDefaults.standard.bool(forKey: Keys.ttsEnabled)
        }
    }

    func normalizedBaseURLString() -> String {
        var raw = cmsBaseURL.absoluteString.trimmingCharacters(in: .whitespacesAndNewlines)
        while raw.hasSuffix("/") { raw.removeLast() }
        return raw
    }

    func apply(baseURLString: String, agentId newAgentId: String) {
        let trimmedURL = baseURLString.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmedURL), url.scheme != nil else { return }
        cmsBaseURL = url

        let trimmedAgent = newAgentId.trimmingCharacters(in: .whitespacesAndNewlines)
        agentId = trimmedAgent.isEmpty ? ShellConfig.defaultAgentId : trimmedAgent
    }
}
