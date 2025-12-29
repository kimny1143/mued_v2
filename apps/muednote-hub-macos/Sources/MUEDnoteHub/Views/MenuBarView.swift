import SwiftUI

/// Main menu bar popover view
struct MenuBarView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Connection Status
            StatusSection(appState: appState)

            Divider()

            // Recent Logs
            RecentLogsSection(logs: appState.recentLogs)

            Divider()

            // Statistics
            StatsSection(count: appState.todayLogCount)

            Divider()

            // Actions
            ActionsSection(appState: appState)
        }
        .padding()
        .frame(width: 280)
    }
}

// MARK: - Status Section

struct StatusSection: View {
    @ObservedObject var appState: AppState

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Circle()
                    .fill(appState.isAbletonConnected ? Color.green : Color.gray)
                    .frame(width: 8, height: 8)
                Text("Ableton")
                    .font(.system(size: 12))
                Spacer()
                Text(appState.isAbletonConnected ? "接続中" : "未接続")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }

            HStack(spacing: 8) {
                Circle()
                    .fill(appState.isServerConnected ? Color.green : Color.gray)
                    .frame(width: 8, height: 8)
                Text("Server")
                    .font(.system(size: 12))
                Spacer()
                Text(appState.isServerConnected ? "接続中" : "未接続")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Recent Logs Section

struct RecentLogsSection: View {
    let logs: [DAWLog]

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("最近のログ")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.secondary)
                .textCase(.uppercase)

            if logs.isEmpty {
                Text("ログがありません")
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .padding(.vertical, 8)
            } else {
                ForEach(logs.prefix(5)) { log in
                    HStack {
                        Text(log.timeString)
                            .font(.system(size: 10, design: .monospaced))
                            .foregroundColor(.purple)
                        Text(log.displayText)
                            .font(.system(size: 11))
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                }
            }
        }
    }
}

// MARK: - Stats Section

struct StatsSection: View {
    let count: Int

    var body: some View {
        HStack {
            Text("今日の送信数")
                .font(.system(size: 12))
            Spacer()
            Text("\(count)件")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(.purple)
        }
    }
}

// MARK: - Actions Section

struct ActionsSection: View {
    @ObservedObject var appState: AppState

    var body: some View {
        VStack(spacing: 8) {
            // Start/Stop button
            Button(action: {
                if appState.oscReceiver.isRunning {
                    appState.stopListening()
                } else {
                    appState.startListening()
                }
            }) {
                HStack {
                    Image(systemName: appState.oscReceiver.isRunning ? "stop.fill" : "play.fill")
                    Text(appState.oscReceiver.isRunning ? "停止" : "開始")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(appState.oscReceiver.isRunning ? .red : .green)

            HStack(spacing: 8) {
                // Settings
                SettingsLink {
                    HStack {
                        Image(systemName: "gear")
                        Text("設定")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                // Quit
                Button(action: {
                    NSApplication.shared.terminate(nil)
                }) {
                    HStack {
                        Image(systemName: "power")
                        Text("終了")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
            }
        }
    }
}

#Preview {
    MenuBarView()
        .environmentObject(AppState())
}
