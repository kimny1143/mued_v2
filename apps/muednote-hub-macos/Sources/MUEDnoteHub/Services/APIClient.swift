import Foundation
import KeychainAccess

/// API client for communicating with MUED server
actor APIClient {
    // Configuration
    private let baseURL: URL
    private let keychain = Keychain(service: "com.mued.muednote-hub")

    // Token storage keys
    private let tokenKey = "auth_token"
    private let apiKeyKey = "api_key"

    init() {
        // Use environment variable or default to localhost for development
        let urlString = ProcessInfo.processInfo.environment["MUED_API_URL"]
            ?? "http://localhost:3000"
        self.baseURL = URL(string: urlString)!
    }

    // MARK: - Authentication

    /// Get stored auth token
    var authToken: String? {
        try? keychain.get(tokenKey)
    }

    /// Store auth token (from OAuth flow)
    func setAuthToken(_ token: String) throws {
        try keychain.set(token, key: tokenKey)
    }

    /// Clear auth token (logout)
    func clearAuthToken() throws {
        try keychain.remove(tokenKey)
    }

    /// Get API key for development
    var apiKey: String? {
        try? keychain.get(apiKeyKey) ?? "dev_daw_key_kimny"
    }

    /// Set API key
    func setApiKey(_ key: String) throws {
        try keychain.set(key, key: apiKeyKey)
    }

    // MARK: - DAW Log API

    /// Send a DAW log to the server
    func sendLog(_ log: DAWLog) async throws {
        let url = baseURL.appendingPathComponent("/api/muednote/daw-log")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add authentication
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else if let key = apiKey {
            request.setValue(key, forHTTPHeaderField: "X-DAW-API-Key")
        }

        // Encode body
        let body = DAWLogRequest(from: log)
        request.httpBody = try JSONEncoder().encode(body)

        // Send request
        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorBody = try? JSONDecoder().decode(APIErrorResponse.self, from: data) {
                throw APIError.serverError(errorBody.error)
            }
            throw APIError.httpError(httpResponse.statusCode)
        }
    }

    /// Get DAW logs for a time range
    func getLogs(since: Date, until: Date, limit: Int = 100) async throws -> [DAWLog] {
        var components = URLComponents(url: baseURL.appendingPathComponent("/api/muednote/daw-log"), resolvingAgainstBaseURL: false)!

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        components.queryItems = [
            URLQueryItem(name: "since", value: formatter.string(from: since)),
            URLQueryItem(name: "until", value: formatter.string(from: until)),
            URLQueryItem(name: "limit", value: String(limit))
        ]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "GET"

        // Add authentication
        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else if let key = apiKey {
            request.setValue(key, forHTTPHeaderField: "X-DAW-API-Key")
        }

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(httpResponse.statusCode)
        }

        let result = try JSONDecoder().decode(DAWLogsResponse.self, from: data)
        return result.logs
    }
}

// MARK: - Error Types

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(Int)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid server response"
        case .httpError(let code):
            return "HTTP error: \(code)"
        case .serverError(let message):
            return message
        }
    }
}

struct APIErrorResponse: Codable {
    let error: String
}

struct DAWLogsResponse: Codable {
    let logs: [DAWLog]
    let count: Int
}
