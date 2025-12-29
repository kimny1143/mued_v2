import Foundation
import AuthenticationServices
import KeychainAccess

/// Clerk OAuth authentication service
@MainActor
class AuthService: NSObject, ObservableObject {
    // Configuration
    private let clerkDomain: String
    private let clientId: String
    private let redirectScheme = "muednote"
    private let keychain = Keychain(service: "com.mued.muednote-hub")

    // State
    @Published var isAuthenticated = false
    @Published var userEmail: String?
    @Published var isLoading = false
    @Published var error: String?

    // Token keys
    private let accessTokenKey = "clerk_access_token"
    private let refreshTokenKey = "clerk_refresh_token"
    private let userEmailKey = "user_email"

    // Auth session
    private var authSession: ASWebAuthenticationSession?

    override init() {
        // Load from environment or use defaults
        self.clerkDomain = ProcessInfo.processInfo.environment["CLERK_DOMAIN"]
            ?? "clerk.mued.jp"
        self.clientId = ProcessInfo.processInfo.environment["CLERK_CLIENT_ID"]
            ?? ""

        super.init()

        // Check existing token
        checkExistingAuth()
    }

    // MARK: - Public Methods

    /// Start OAuth flow
    func signIn() {
        guard !clientId.isEmpty else {
            error = "Clerk Client ID が設定されていません"
            return
        }

        isLoading = true
        error = nil

        // Build OAuth URL
        var components = URLComponents()
        components.scheme = "https"
        components.host = clerkDomain
        components.path = "/oauth/authorize"
        components.queryItems = [
            URLQueryItem(name: "client_id", value: clientId),
            URLQueryItem(name: "redirect_uri", value: "\(redirectScheme)://callback"),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "scope", value: "openid profile email"),
        ]

        guard let authURL = components.url else {
            error = "認証URLの生成に失敗しました"
            isLoading = false
            return
        }

        // Start ASWebAuthenticationSession
        authSession = ASWebAuthenticationSession(
            url: authURL,
            callbackURLScheme: redirectScheme
        ) { [weak self] callbackURL, error in
            Task { @MainActor in
                self?.handleCallback(callbackURL: callbackURL, error: error)
            }
        }

        authSession?.presentationContextProvider = self
        authSession?.prefersEphemeralWebBrowserSession = false
        authSession?.start()
    }

    /// Sign out
    func signOut() {
        do {
            try keychain.remove(accessTokenKey)
            try keychain.remove(refreshTokenKey)
            try keychain.remove(userEmailKey)
            isAuthenticated = false
            userEmail = nil
        } catch {
            self.error = "ログアウトに失敗しました: \(error.localizedDescription)"
        }
    }

    /// Get current access token
    var accessToken: String? {
        try? keychain.get(accessTokenKey)
    }

    // MARK: - Private Methods

    private func checkExistingAuth() {
        if let token = try? keychain.get(accessTokenKey), !token.isEmpty {
            isAuthenticated = true
            userEmail = try? keychain.get(userEmailKey)
        }
    }

    private func handleCallback(callbackURL: URL?, error: Error?) {
        isLoading = false

        if let error = error as? ASWebAuthenticationSessionError {
            if error.code == .canceledLogin {
                // User cancelled - not an error
                return
            }
            self.error = "認証がキャンセルされました"
            return
        }

        guard let callbackURL = callbackURL else {
            self.error = "コールバックURLが取得できませんでした"
            return
        }

        // Parse callback URL for code
        guard let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false),
              let code = components.queryItems?.first(where: { $0.name == "code" })?.value else {
            self.error = "認証コードが取得できませんでした"
            return
        }

        // Exchange code for token
        Task {
            await exchangeCodeForToken(code: code)
        }
    }

    private func exchangeCodeForToken(code: String) async {
        isLoading = true

        // Build token exchange request
        var components = URLComponents()
        components.scheme = "https"
        components.host = clerkDomain
        components.path = "/oauth/token"

        guard let url = components.url else {
            error = "トークンURLの生成に失敗しました"
            isLoading = false
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let body = [
            "grant_type": "authorization_code",
            "client_id": clientId,
            "code": code,
            "redirect_uri": "\(redirectScheme)://callback"
        ]
        request.httpBody = body.map { "\($0.key)=\($0.value)" }.joined(separator: "&").data(using: .utf8)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                throw AuthError.tokenExchangeFailed
            }

            let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data)

            // Save tokens
            try keychain.set(tokenResponse.access_token, key: accessTokenKey)
            if let refreshToken = tokenResponse.refresh_token {
                try keychain.set(refreshToken, key: refreshTokenKey)
            }

            // Decode JWT to get email (simplified - in production use proper JWT parsing)
            if let email = extractEmailFromToken(tokenResponse.access_token) {
                try keychain.set(email, key: userEmailKey)
                userEmail = email
            }

            isAuthenticated = true
            isLoading = false

        } catch {
            self.error = "トークン取得に失敗しました: \(error.localizedDescription)"
            isLoading = false
        }
    }

    private func extractEmailFromToken(_ token: String) -> String? {
        // JWT is base64 encoded: header.payload.signature
        let parts = token.split(separator: ".")
        guard parts.count >= 2 else { return nil }

        var payload = String(parts[1])
        // Add padding if needed
        while payload.count % 4 != 0 {
            payload += "="
        }

        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let email = json["email"] as? String else {
            return nil
        }

        return email
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension AuthService: ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Return the key window for presenting the auth sheet
        NSApplication.shared.keyWindow ?? NSApplication.shared.windows.first!
    }
}

// MARK: - Supporting Types

private struct TokenResponse: Codable {
    let access_token: String
    let refresh_token: String?
    let token_type: String
    let expires_in: Int?
}

enum AuthError: LocalizedError {
    case tokenExchangeFailed

    var errorDescription: String? {
        switch self {
        case .tokenExchangeFailed:
            return "トークンの取得に失敗しました"
        }
    }
}
