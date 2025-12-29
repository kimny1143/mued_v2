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
    private let maxParamsPerDevice = 8  // Reduced from 30 to avoid listener overload
    private let pollingIntervalMs: Int = 200  // Poll every 200ms

    // OSC Server & Client
    private var oscServer: OSCServer?
    private var oscClient: OSCClient?

    // Callbacks
    var onParameterChange: ((DAWLog) -> Void)?
    var onConnectionChange: ((Bool) -> Void)?

    // Debounce state
    private var pendingChanges: [String: PendingChange] = [:]
    private var paramValueCache: [String: Double] = [:]

    // Polling state
    private var pollingTask: Task<Void, Never>?
    private var registeredDevices: [(trackId: Int, deviceId: Int, numParams: Int)] = []
    private var pendingValueChanges: Set<String> = []  // Keys with detected value changes

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
            // Create OSC client for sending to Ableton
            oscClient = OSCClient()

            // Create OSC server for receiving from Ableton
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
        pollingTask?.cancel()
        pollingTask = nil
        oscServer?.stop()
        oscServer = nil
        isRunning = false
        registeredDevices.removeAll()
        pendingValueChanges.removeAll()
        paramValueCache.removeAll()
        onConnectionChange?(false)
        print("[OSC] Server stopped")
    }

    private func requestTrackInfo() {
        sendOSC(address: "/live/song/get/num_tracks")
    }

    private func appendToLogFile(_ text: String) {
        let logPath = "/tmp/muednote-osc.log"
        if let data = text.data(using: .utf8) {
            if FileManager.default.fileExists(atPath: logPath) {
                if let handle = FileHandle(forWritingAtPath: logPath) {
                    handle.seekToEndOfFile()
                    handle.write(data)
                    handle.closeFile()
                }
            } else {
                FileManager.default.createFile(atPath: logPath, contents: data, attributes: nil)
            }
        }
    }

    private func sendOSC(address: String, args: [any OSCValue] = []) {
        let message = OSCMessage(address, values: args)
        do {
            try oscClient?.send(message, to: "localhost", port: abletonSendPort)
            print("[OSC] Sent: \(address) \(args)")
        } catch {
            print("[OSC] Failed to send: \(error)")
        }
    }

    private func handleOSCMessage(_ message: OSCMessage) {
        let address = message.addressPattern.stringValue

        // Debug: すべてのOSCメッセージをログ出力（型情報付き）
        let valueTypes = message.values.map { "\(type(of: $0))" }.joined(separator: ", ")
        print("[OSC] Received: \(address) - values: \(message.values) types: [\(valueTypes)]")
        // ファイルにも出力
        let logLine = "[OSC] \(Date()): \(address) - \(message.values) types: [\(valueTypes)]\n"
        if let data = logLine.data(using: .utf8) {
            let logPath = "/tmp/muednote-osc.log"
            if FileManager.default.fileExists(atPath: logPath) {
                if let handle = FileHandle(forWritingAtPath: logPath) {
                    handle.seekToEndOfFile()
                    handle.write(data)
                    handle.closeFile()
                }
            } else {
                FileManager.default.createFile(atPath: logPath, contents: data, attributes: nil)
            }
        }

        switch address {
        // Parameter value (numeric) - cache and detect changes
        case "/live/device/get/parameter/value":
            guard message.values.count >= 4 else { return }
            let trackId: Int
            if let id = message.values[0] as? Int32 { trackId = Int(id) }
            else if let id = message.values[0] as? Int { trackId = id }
            else { return }
            let deviceId: Int
            if let id = message.values[1] as? Int32 { deviceId = Int(id) }
            else if let id = message.values[1] as? Int { deviceId = id }
            else { return }
            let paramId: Int
            if let id = message.values[2] as? Int32 { paramId = Int(id) }
            else if let id = message.values[2] as? Int { paramId = id }
            else { return }
            let value: Double
            if let v = message.values[3] as? Float { value = Double(v) }
            else if let v = message.values[3] as? Double { value = v }
            else { return }

            let key = "\(trackId):\(deviceId):\(paramId)"

            // Detect change by comparing with cached value
            let oldValue = paramValueCache[key]
            let hasChanged = (oldValue == nil) || (abs(oldValue! - value) > 0.001)
            paramValueCache[key] = value

            // If value changed, mark as pending (will be logged when value_string arrives)
            if hasChanged && oldValue != nil {
                pendingValueChanges.insert(key)
                let changeLog = "[CHANGE] \(key): \(oldValue!) -> \(value)\n"
                appendToLogFile(changeLog)
            }

        // Parameter value string (triggers debounced log only if value changed)
        case "/live/device/get/parameter/value_string":
            guard message.values.count >= 4 else { return }
            let trackId: Int
            if let id = message.values[0] as? Int32 { trackId = Int(id) }
            else if let id = message.values[0] as? Int { trackId = id }
            else { return }
            let deviceId: Int
            if let id = message.values[1] as? Int32 { deviceId = Int(id) }
            else if let id = message.values[1] as? Int { deviceId = id }
            else { return }
            let paramId: Int
            if let id = message.values[2] as? Int32 { paramId = Int(id) }
            else if let id = message.values[2] as? Int { paramId = id }
            else { return }
            guard let valueString = message.values[3] as? String else { return }

            let key = "\(trackId):\(deviceId):\(paramId)"

            // Only log if value has changed (from polling or listener)
            guard pendingValueChanges.contains(key) else { return }
            pendingValueChanges.remove(key)

            let value = paramValueCache[key] ?? 0

            appendToLogFile("[LOG] Track \(trackId) Device \(deviceId) Param \(paramId): \(valueString)\n")

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
            guard message.values.count >= 2 else { return }
            let trackId: Int
            if let id = message.values[0] as? Int32 { trackId = Int(id) }
            else if let id = message.values[0] as? Int { trackId = id }
            else { return }
            let value: Double
            if let v = message.values[1] as? Float { value = Double(v) }
            else if let v = message.values[1] as? Double { value = v }
            else { return }

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
            guard message.values.count >= 2 else { return }
            // OSCKit uses Int32 for integers, Float for floats
            let trackId: Int
            if let id = message.values[0] as? Int32 { trackId = Int(id) }
            else if let id = message.values[0] as? Int { trackId = id }
            else { return }
            let value: Double
            if let v = message.values[1] as? Float { value = Double(v) }
            else if let v = message.values[1] as? Double { value = v }
            else { return }

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
            let numTracks: Int
            if let n = message.values.first as? Int32 { numTracks = Int(n) }
            else if let n = message.values.first as? Int { numTracks = n }
            else { return }
            print("[OSC] Detected \(numTracks) tracks")
            registerTrackListeners(numTracks: min(numTracks, maxTracksToMonitor))

        // Device count response
        case "/live/track/get/num_devices":
            guard message.values.count >= 2 else { return }
            let trackId: Int
            if let id = message.values[0] as? Int32 { trackId = Int(id) }
            else if let id = message.values[0] as? Int { trackId = id }
            else { return }
            let numDevices: Int
            if let n = message.values[1] as? Int32 { numDevices = Int(n) }
            else if let n = message.values[1] as? Int { numDevices = n }
            else { return }
            print("[OSC] Track \(trackId): \(numDevices) devices")
            registerDeviceListeners(trackId: trackId, numDevices: numDevices)

        // Parameter count response
        case "/live/device/get/num_parameters":
            guard message.values.count >= 3 else { return }
            let trackId: Int
            if let id = message.values[0] as? Int32 { trackId = Int(id) }
            else if let id = message.values[0] as? Int { trackId = id }
            else { return }
            let deviceId: Int
            if let id = message.values[1] as? Int32 { deviceId = Int(id) }
            else if let id = message.values[1] as? Int { deviceId = id }
            else { return }
            let numParams: Int
            if let n = message.values[2] as? Int32 { numParams = Int(n) }
            else if let n = message.values[2] as? Int { numParams = n }
            else { return }
            print("[OSC] Track \(trackId) Device \(deviceId): \(numParams) parameters")
            registerParameterListeners(trackId: trackId, deviceId: deviceId, numParams: numParams)

        default:
            break
        }
    }

    private func registerTrackListeners(numTracks: Int) {
        for trackId in 0..<numTracks {
            // Register volume listener
            sendOSC(address: "/live/track/start_listen/volume", args: [Int32(trackId)])
            // Register pan listener
            sendOSC(address: "/live/track/start_listen/panning", args: [Int32(trackId)])
            // Request device count for this track
            sendOSC(address: "/live/track/get/num_devices", args: [Int32(trackId)])
        }
        print("[OSC] Registered volume/pan listeners for \(numTracks) tracks, requesting device info...")
    }

    private func registerDeviceListeners(trackId: Int, numDevices: Int) {
        for deviceId in 0..<numDevices {
            // Request parameter count for each device
            sendOSC(address: "/live/device/get/num_parameters", args: [Int32(trackId), Int32(deviceId)])
        }
        print("[OSC] Track \(trackId): requesting params for \(numDevices) devices")
    }

    private func registerParameterListeners(trackId: Int, deviceId: Int, numParams: Int) {
        // Use actual param count (not maxParamsPerDevice limit for polling accuracy)
        let actualParams = min(numParams, maxParamsPerDevice)

        // Still try listeners (might work in some cases)
        for paramId in 0..<actualParams {
            sendOSC(address: "/live/device/start_listen/parameter/value", args: [Int32(trackId), Int32(deviceId), Int32(paramId)])
        }
        print("[OSC] Track \(trackId) Device \(deviceId): registered \(actualParams)/\(numParams) listeners")

        // Register device for polling as backup (use actual count to avoid index out of range)
        registeredDevices.append((trackId: trackId, deviceId: deviceId, numParams: actualParams))

        // Start polling if not already running
        if pollingTask == nil {
            startPolling()
        }
    }

    private func startPolling() {
        pollingTask = Task { @MainActor in
            print("[OSC] Starting parameter polling (interval: \(pollingIntervalMs)ms)")

            while !Task.isCancelled {
                // Poll all registered device parameters
                for device in registeredDevices {
                    for paramId in 0..<device.numParams {
                        // Request current value and value_string
                        sendOSC(address: "/live/device/get/parameter/value", args: [Int32(device.trackId), Int32(device.deviceId), Int32(paramId)])
                        sendOSC(address: "/live/device/get/parameter/value_string", args: [Int32(device.trackId), Int32(device.deviceId), Int32(paramId)])
                    }
                }

                try? await Task.sleep(nanoseconds: UInt64(pollingIntervalMs * 1_000_000))
            }

            print("[OSC] Parameter polling stopped")
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
        // Debug: パラメータ変更検出
        print("[OSC] scheduleParameterChange: \(key) = \(valueString)")

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

            print("[OSC] Emitting log: Track \(trackId), \(valueString)")
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
