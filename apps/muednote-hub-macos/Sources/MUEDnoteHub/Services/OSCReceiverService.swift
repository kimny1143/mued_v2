import Foundation
import OSCKit

/// Service for receiving OSC messages from AbletonOSC
@MainActor
class OSCReceiverService: ObservableObject {
    // Configuration
    private let abletonSendPort: UInt16 = 11000
    private let abletonReceivePort: UInt16 = 11001
    private let debounceMs: Int = 500
    private let maxTracksToMonitor = 10
    private let maxParamsPerDevice = 30

    // OSC Server
    private var oscServer: OSCServer?

    // Callbacks
    var onParameterChange: ((DAWLog) -> Void)?
    var onConnectionChange: ((Bool) -> Void)?

    // Debounce state
    private var pendingChanges: [String: PendingChange] = [:]
    private var paramValueCache: [String: Double] = [:]

    private struct PendingChange {
        let value: Double
        let valueString: String
        let trackId: Int
        let deviceId: Int
        let paramId: Int
        var timer: Task<Void, Never>?
    }

    @Published var isRunning = false

    init() {}

    func start() {
        guard oscServer == nil else { return }

        do {
            oscServer = OSCServer(port: abletonReceivePort) { [weak self] message, _ in
                Task { @MainActor in
                    self?.handleOSCMessage(message)
                }
            }

            try oscServer?.start()
            isRunning = true
            onConnectionChange?(true)
            print("[OSC] Server started on port \(abletonReceivePort)")

            // Request initial track info
            requestTrackInfo()
        } catch {
            print("[OSC] Failed to start server: \(error)")
            isRunning = false
            onConnectionChange?(false)
        }
    }

    func stop() {
        oscServer?.stop()
        oscServer = nil
        isRunning = false
        onConnectionChange?(false)
        print("[OSC] Server stopped")
    }

    private func requestTrackInfo() {
        sendOSC(address: "/live/song/get/num_tracks")
    }

    private func sendOSC(address: String, args: [any OSCValue] = []) {
        let message = OSCMessage(address, values: args)
        // Note: For sending, we need a UDP client to port 11000
        // This will be implemented with a separate OSCClient
    }

    private func handleOSCMessage(_ message: OSCMessage) {
        let address = message.addressPattern.stringValue

        switch address {
        // Parameter value (numeric)
        case "/live/device/get/parameter/value":
            guard message.values.count >= 4,
                  let trackId = message.values[0] as? Int,
                  let deviceId = message.values[1] as? Int,
                  let paramId = message.values[2] as? Int,
                  let value = message.values[3] as? Double else { return }

            let key = "\(trackId):\(deviceId):\(paramId)"
            paramValueCache[key] = value

        // Parameter value string (triggers debounced log)
        case "/live/device/get/parameter/value_string":
            guard message.values.count >= 4,
                  let trackId = message.values[0] as? Int,
                  let deviceId = message.values[1] as? Int,
                  let paramId = message.values[2] as? Int,
                  let valueString = message.values[3] as? String else { return }

            let key = "\(trackId):\(deviceId):\(paramId)"
            let value = paramValueCache[key] ?? 0

            scheduleParameterChange(
                key: key,
                trackId: trackId,
                deviceId: deviceId,
                paramId: paramId,
                value: value,
                valueString: valueString,
                action: .parameterChange
            )

        // Track volume
        case "/live/track/get/volume":
            guard message.values.count >= 2,
                  let trackId = message.values[0] as? Int,
                  let value = message.values[1] as? Double else { return }

            let db = 20 * log10(value)
            let valueString = String(format: "%.1f dB", db)

            scheduleParameterChange(
                key: "\(trackId):-1:0",
                trackId: trackId,
                deviceId: -1,
                paramId: 0,
                value: value,
                valueString: valueString,
                action: .trackVolume
            )

        // Track pan
        case "/live/track/get/panning":
            guard message.values.count >= 2,
                  let trackId = message.values[0] as? Int,
                  let value = message.values[1] as? Double else { return }

            let pan: String
            if value == 0 {
                pan = "C"
            } else if value > 0 {
                pan = "\(Int(value * 50))R"
            } else {
                pan = "\(Int(-value * 50))L"
            }

            scheduleParameterChange(
                key: "\(trackId):-1:1",
                trackId: trackId,
                deviceId: -1,
                paramId: 1,
                value: value,
                valueString: pan,
                action: .trackPan
            )

        // Track count response
        case "/live/song/get/num_tracks":
            guard let numTracks = message.values.first as? Int else { return }
            print("[OSC] Detected \(numTracks) tracks")
            // Would register listeners here

        default:
            break
        }
    }

    private func scheduleParameterChange(
        key: String,
        trackId: Int,
        deviceId: Int,
        paramId: Int,
        value: Double,
        valueString: String,
        action: DAWAction
    ) {
        // Cancel existing timer
        pendingChanges[key]?.timer?.cancel()

        // Create new debounced emission
        let timer = Task { @MainActor in
            try? await Task.sleep(nanoseconds: UInt64(debounceMs * 1_000_000))

            guard !Task.isCancelled else { return }

            let log = DAWLog(
                trackId: trackId,
                deviceId: deviceId,
                paramId: paramId,
                value: value,
                valueString: valueString
            )

            self.onParameterChange?(log)
            self.pendingChanges.removeValue(forKey: key)
        }

        pendingChanges[key] = PendingChange(
            value: value,
            valueString: valueString,
            trackId: trackId,
            deviceId: deviceId,
            paramId: paramId,
            timer: timer
        )
    }
}
