import SwiftUI

/// Settings window view
struct SettingsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView {
            GeneralSettingsView()
                .environmentObject(appState)
                .tabItem {
                    Label("一般", systemImage: "gear")
                }

            ConnectionSettingsView()
                .tabItem {
                    Label("接続", systemImage: "network")
                }

            AccountSettingsView()
                .environmentObject(appState)
                .tabItem {
                    Label("アカウント", systemImage: "person.circle")
                }
        }
        .frame(width: 450, height: 300)
    }
}

// MARK: - General Settings

struct GeneralSettingsView: View {
    @EnvironmentObject var appState: AppState
    @AppStorage("showNotifications") private var showNotifications = true
    @AppStorage("debounceMs") private var debounceMs = 500

    var body: some View {
        Form {
            Section {
                Toggle("ログイン時に起動", isOn: $appState.launchAtLogin.isEnabled)
                Toggle("通知を表示", isOn: $showNotifications)

                if let error = appState.launchAtLogin.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }

            Section("デバウンス設定") {
                Picker("遅延時間", selection: $debounceMs) {
                    Text("250ms").tag(250)
                    Text("500ms (推奨)").tag(500)
                    Text("1000ms").tag(1000)
                }
                .pickerStyle(.segmented)

                Text("パラメータ変更の検出間隔です。短いほど詳細なログが取れますが、データ量が増えます。")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - Connection Settings

struct ConnectionSettingsView: View {
    @AppStorage("apiURL") private var apiURL = "http://localhost:3000"
    @AppStorage("oscReceivePort") private var oscReceivePort = 11001
    @AppStorage("oscSendPort") private var oscSendPort = 11000

    var body: some View {
        Form {
            Section("サーバー") {
                TextField("API URL", text: $apiURL)
                    .textFieldStyle(.roundedBorder)

                Text("MUEDサーバーのURLを指定します。")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("OSC (AbletonOSC)") {
                HStack {
                    Text("受信ポート")
                    Spacer()
                    TextField("Port", value: $oscReceivePort, format: .number)
                        .frame(width: 80)
                        .textFieldStyle(.roundedBorder)
                }

                HStack {
                    Text("送信ポート")
                    Spacer()
                    TextField("Port", value: $oscSendPort, format: .number)
                        .frame(width: 80)
                        .textFieldStyle(.roundedBorder)
                }

                Text("AbletonOSCのデフォルト: 受信 11001, 送信 11000")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - Account Settings

struct AccountSettingsView: View {
    @EnvironmentObject var appState: AppState
    @State private var apiKey = ""

    var body: some View {
        Form {
            Section("認証状態") {
                HStack {
                    Image(systemName: appState.authService.isAuthenticated ? "checkmark.circle.fill" : "xmark.circle")
                        .foregroundColor(appState.authService.isAuthenticated ? .green : .red)
                    Text(appState.authService.isAuthenticated ? "認証済み" : "未認証")
                    Spacer()
                    if let email = appState.authService.userEmail {
                        Text(email)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                if let error = appState.authService.error {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }

            Section("OAuth認証 (推奨)") {
                if appState.authService.isAuthenticated {
                    Button("ログアウト") {
                        appState.authService.signOut()
                    }
                    .buttonStyle(.bordered)
                } else {
                    Button(action: {
                        appState.authService.signIn()
                    }) {
                        if appState.authService.isLoading {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .scaleEffect(0.8)
                        } else {
                            Text("MUEDアカウントでログイン")
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(appState.authService.isLoading)
                }

                Text("Clerkを使用したセキュアな認証です。")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Section("APIキー認証 (開発用)") {
                SecureField("APIキー", text: $apiKey)
                    .textFieldStyle(.roundedBorder)

                Button("APIキーを保存") {
                    saveApiKey()
                }
                .disabled(apiKey.isEmpty)

                Text("開発・テスト用途のみ。本番環境ではOAuth認証を使用してください。")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    private func saveApiKey() {
        Task {
            do {
                try await appState.apiClient.setApiKey(apiKey)
                apiKey = ""
            } catch {
                print("[Settings] Failed to save API key: \(error)")
            }
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppState())
}
