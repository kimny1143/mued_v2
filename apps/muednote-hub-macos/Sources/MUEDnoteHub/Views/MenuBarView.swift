import SwiftUI

/// Main menu bar view (menu style - simpler for compatibility)
struct MenuBarView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        // Connection Status
        Text("OSC: \(appState.isAbletonConnected ? "✓ 接続中" : "✗ 未接続")")
        Text("MIDI: \(appState.isMIDIConnected ? "✓ 接続中 (\(appState.midiReceiver.connectedSources.count))" : "✗ 未接続")")
        Text("Server: \(appState.isServerConnected ? "✓ 接続中" : "✗ 未接続")")

        Divider()

        // Statistics
        Text("OSC: \(appState.todayLogCount)件")
        Text("MIDI: \(appState.todayMIDICount)件")

        Divider()

        // OSC Actions
        Button(appState.oscReceiver.isRunning ? "⏹ OSC停止" : "▶ OSC開始") {
            if appState.oscReceiver.isRunning {
                appState.stopListening()
            } else {
                appState.startListening()
            }
        }

        // MIDI Actions
        Button(appState.midiReceiver.isRunning ? "⏹ MIDI停止" : "▶ MIDI開始") {
            if appState.midiReceiver.isRunning {
                appState.stopMIDI()
            } else {
                appState.startMIDI()
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
