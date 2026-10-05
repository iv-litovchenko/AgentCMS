import Foundation

enum ShellAPIError: LocalizedError {
    case invalidURL
    case badStatus(Int, String)
    case decodeFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Некорректный URL CMS"
        case .badStatus(let code, let message):
            return "HTTP \(code): \(message)"
        case .decodeFailed:
            return "Не удалось разобрать ответ сервера"
        }
    }
}

final class ShellAPIClient {
    private let configStore: ShellConfigStore
    private let session: URLSession
    private let decoder: JSONDecoder

    init(configStore: ShellConfigStore = .shared, session: URLSession = .shared) {
        self.configStore = configStore
        self.session = session
        self.decoder = JSONDecoder()
    }

    func fetchStatus() async throws -> ShellStatusPayload {
        try await get("/api/shell/status")
    }

    func sendMessage(body: String, voice: Bool) async throws -> ShellMessageResponse {
        try await post(
            "/api/shell/message",
            body: [
                "body": body,
                "author": "shell",
                "voice": voice
            ]
        )
    }

    func stopTTS() async throws {
        guard let url = buildURL(path: "/api/shell/stop-tts") else { throw ShellAPIError.invalidURL }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = Data("{}".utf8)
        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)
    }

    func openEventStream() throws -> ShellEventStream {
        guard let url = buildURL(path: "/api/shell/stream") else {
            throw ShellAPIError.invalidURL
        }
        return ShellEventStream(url: url, session: session)
    }

    private struct EmptyResponse: Decodable {}

    private func buildURL(path: String, extraQuery: [String: String] = [:]) -> URL? {
        var base = configStore.normalizedBaseURLString()
        if !path.hasPrefix("/") { base += "/" }
        guard var components = URLComponents(string: base + path) else { return nil }

        var items = components.queryItems ?? []
        items.append(URLQueryItem(name: "agent", value: configStore.agentId))
        for (key, value) in extraQuery {
            items.append(URLQueryItem(name: key, value: value))
        }
        components.queryItems = items
        return components.url
    }

    private func get<T: Decodable>(_ path: String) async throws -> T {
        guard let url = buildURL(path: path) else { throw ShellAPIError.invalidURL }

        let (data, response) = try await session.data(from: url)
        try validate(response: response, data: data)

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw ShellAPIError.decodeFailed
        }
    }

    private func post<T: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> T {
        guard let url = buildURL(path: path) else { throw ShellAPIError.invalidURL }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)
        try validate(response: response, data: data)

        if T.self == EmptyResponse.self, data.isEmpty {
            return EmptyResponse() as! T
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            if data.isEmpty, let empty = EmptyResponse() as? T {
                return empty
            }
            throw ShellAPIError.decodeFailed
        }
    }

    private func validate(response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200..<300).contains(http.statusCode) else {
            let message = (try? decoder.decode([String: String].self, from: data))
                .flatMap { $0["details"] ?? $0["error"] }
                ?? String(data: data, encoding: .utf8)
                ?? "Unknown error"
            throw ShellAPIError.badStatus(http.statusCode, message)
        }
    }
}
