import SwiftUI

@main
struct MUEDnoteHubApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        // Menu bar only app - no main window
        MenuBarExtra("MUEDnote Hub", systemImage: "music.note.house") {
            MenuBarView()
                .environmentObject(appState)
        }
        .menuBarExtraStyle(.menu)

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
    @Published var isMIDIConnected = false

    // Statistics
    @Published var todayLogCount = 0
    @Published var todayMIDICount = 0
    @Published var recentLogs: [DAWLog] = []
    @Published var recentMIDILogs: [MIDILog] = []

    // Services
    let oscReceiver: OSCReceiverService
    let midiReceiver: MIDIReceiverService
    let apiClient: APIClient
    let authService: AuthService
    var launchAtLogin: LaunchAtLoginService

    /// Authentication state (delegated to AuthService)
    var isAuthenticated: Bool {
        authService.isAuthenticated
    }

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
        self.midiReceiver = MIDIReceiverService()
        self.apiClient = APIClient()
        self.authService = AuthService()
        self.launchAtLogin = LaunchAtLoginService()

        setupBindings()
    }

    private func setupBindings() {
        // OSC receiver callbacks
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

        // MIDI receiver callbacks
        midiReceiver.onMIDIMessage = { [weak self] log in
            Task { @MainActor in
                self?.handleNewMIDILog(log)
            }
        }

        midiReceiver.onConnectionChange = { [weak self] connected in
            Task { @MainActor in
                self?.isMIDIConnected = connected
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

    func handleNewMIDILog(_ log: MIDILog) {
        recentMIDILogs.insert(log, at: 0)
        if recentMIDILogs.count > 20 {
            recentMIDILogs.removeLast()
        }
        todayMIDICount += 1

        // TODO: Send to server (Phase 2)
    }

    func startListening() {
        oscReceiver.start()
    }

    func stopListening() {
        oscReceiver.stop()
    }

    func startMIDI() {
        midiReceiver.start()
    }

    func stopMIDI() {
        midiReceiver.stop()
    }
}
