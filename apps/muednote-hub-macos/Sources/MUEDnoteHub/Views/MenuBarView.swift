import SwiftUI

/// Main menu bar view (menu style - simpler for compatibility)
struct MenuBarView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        // Connection Status
        Text("Ableton: \(appState.isAbletonConnected ? "✓ 接続中" : "✗ 未接続")")
        Text("Server: \(appState.isServerConnected ? "✓ 接続中" : "✗ 未接続")")

        Divider()

        // Statistics
        Text("今日: \(appState.todayLogCount)件送信")

        Divider()

        // Actions
        Button(appState.oscReceiver.isRunning ? "⏹ OSC受信を停止" : "▶ OSC受信を開始") {
            if appState.oscReceiver.isRunning {
                appState.stopListening()
            } else {
                appState.startListening()
            }
        }

        Divider()

        SettingsLink {
            Text("設定...")
        }
        .keyboardShortcut(",", modifiers: .command)

        Button("終了") {
            NSApplication.shared.terminate(nil)
        }
        .keyboardShortcut("q", modifiers: .command)
    }
}

#Preview {
    MenuBarView()
        .environmentObject(AppState())
}
