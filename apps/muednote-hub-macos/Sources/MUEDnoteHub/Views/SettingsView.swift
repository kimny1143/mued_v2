import SwiftUI

/// Settings window view
struct SettingsView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView {
            GeneralSettingsView()
                .tabItem {
                    Label("一般", systemImage: "gear")
                }

            ConnectionSettingsView()
                .tabItem {
                    Label("接続", systemImage: "network")
                }

            AccountSettingsView()
                .tabItem {
                    Label("アカウント", systemImage: "person.circle")
                }
        }
        .frame(width: 450, height: 300)
    }
}

// MARK: - General Settings

struct GeneralSettingsView: View {
    @AppStorage("launchAtLogin") private var launchAtLogin = false
    @AppStorage("showNotifications") private var showNotifications = true
    @AppStorage("debounceMs") private var debounceMs = 500

    var body: some View {
        Form {
            Section {
                Toggle("ログイン時に起動", isOn: $launchAtLogin)
                Toggle("通知を表示", isOn: $showNotifications)
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
    @State private var showingOAuthSheet = false

    var body: some View {
        Form {
            Section("認証状態") {
                HStack {
                    Image(systemName: appState.isAuthenticated ? "checkmark.circle.fill" : "xmark.circle")
                        .foregroundColor(appState.isAuthenticated ? .green : .red)
                    Text(appState.isAuthenticated ? "認証済み" : "未認証")
                }
            }

            Section("OAuth認証 (推奨)") {
                Button("MUEDアカウントでログイン") {
                    showingOAuthSheet = true
                }
                .buttonStyle(.borderedProminent)

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
        .sheet(isPresented: $showingOAuthSheet) {
            OAuthView()
        }
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

// MARK: - OAuth View (Placeholder)

struct OAuthView: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.badge.key.fill")
                .font(.system(size: 48))
                .foregroundColor(.blue)

            Text("MUEDアカウントでログイン")
                .font(.title2)
                .fontWeight(.semibold)

            Text("ブラウザでClerk認証ページを開きます。\n認証完了後、自動的にこのアプリに戻ります。")
                .multilineTextAlignment(.center)
                .foregroundColor(.secondary)

            Button("ブラウザで認証") {
                // TODO: Implement Clerk OAuth flow
                // Open Safari with Clerk auth URL
                // Handle callback with custom URL scheme
                dismiss()
            }
            .buttonStyle(.borderedProminent)

            Button("キャンセル") {
                dismiss()
            }
            .buttonStyle(.bordered)
        }
        .padding(40)
        .frame(width: 350, height: 300)
    }
}

#Preview {
    SettingsView()
        .environmentObject(AppState())
}
