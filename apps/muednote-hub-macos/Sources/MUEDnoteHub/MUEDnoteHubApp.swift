import SwiftUI

@main
struct MUEDnoteHubApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        // Menu bar only app - no main window
        MenuBarExtra {
            MenuBarView()
                .environmentObject(appState)
        } label: {
            Image(systemName: appState.statusIcon)
                .symbolRenderingMode(.hierarchical)
        }
        .menuBarExtraStyle(.window)

        // Settings window
        Settings {
            SettingsView()
                .environmentObject(appState)
        }
    }
}

/// Global app state
@MainActor
class AppState: ObservableObject {
    // Connection status
    @Published var isAbletonConnected = false
    @Published var isServerConnected = false
    @Published var isAuthenticated = false

    // Statistics
    @Published var todayLogCount = 0
    @Published var recentLogs: [DAWLog] = []

    // Services
    let oscReceiver: OSCReceiverService
    let apiClient: APIClient

    /// Status icon based on connection state
    var statusIcon: String {
        if !isAuthenticated {
            return "person.crop.circle.badge.questionmark"
        }
        if isAbletonConnected && isServerConnected {
            return "music.note.house.fill"
        }
        if isAbletonConnected || isServerConnected {
            return "music.note.house"
        }
        return "music.note.house"
    }

    init() {
        self.oscReceiver = OSCReceiverService()
        self.apiClient = APIClient()

        setupBindings()
    }

    private func setupBindings() {
        // OSC receiver callbacks will be set up here
        oscReceiver.onParameterChange = { [weak self] log in
            Task { @MainActor in
                self?.handleNewLog(log)
            }
        }

        oscReceiver.onConnectionChange = { [weak self] connected in
            Task { @MainActor in
                self?.isAbletonConnected = connected
            }
        }
    }

    func handleNewLog(_ log: DAWLog) {
        recentLogs.insert(log, at: 0)
        if recentLogs.count > 10 {
            recentLogs.removeLast()
        }
        todayLogCount += 1

        // Send to server
        Task {
            do {
                try await apiClient.sendLog(log)
                isServerConnected = true
            } catch {
                print("[Hub] API error: \(error)")
                isServerConnected = false
            }
        }
    }

    func startListening() {
        oscReceiver.start()
    }

    func stopListening() {
        oscReceiver.stop()
    }
}
