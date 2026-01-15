import Foundation
import OSCKit

/// Device information
struct DeviceInfo {
    let trackId: Int
    let deviceId: Int
    var name: String
    var numParams: Int
}

/// Service for receiving OSC messages from AbletonOSC
@MainActor
class OSCReceiverService: ObservableObject {
    // Configuration
    private let abletonSendPort: UInt16 = 11000
    private let abletonReceivePort: UInt16 = 11001
    private let debounceMs: Int = 500
    private let maxTracksToMonitor = 10
    private let maxParamsPerDevice = 50  // Match Node.js version
    private let pollingIntervalMs: Int = 200
    private let deviceRefreshIntervalMs: Int = 3000  // Refresh device info every 3s

    // OSC Server & Client
    private var oscServer: OSCServer?
    private var oscClient: OSCClient?

    // Callbacks
    var onParameterChange: ((DAWLog) -> Void)?
    var onConnectionChange: ((Bool) -> Void)?

    // Debounce state
    private var pendingChanges: [String: PendingChange] = [:]

    // Device registry - keyed by "trackId:deviceId"
    private var devices: [String: DeviceInfo] = [:]

    // Caches - keyed by "trackId:deviceId:paramId"
    private var paramValueCache: [String: Double] = [:]
    private var paramStringCache: [String: String] = [:]
    private var paramNameCache: [String: String] = [:]
    private var pendingValueChanges: Set<String> = []

    // Track names
    private var trackNameCache: [Int: String] = [:]

    // Pending device info collection
    private var pendingDeviceInfo: [String: (name: String?, numParams: Int?)] = [:]

    // Track count
    private var numTracks = 0
    private var isInitialSetup = true

    // Polling state
    private var pollingTask: Task<Void, Never>?
    private var deviceRefreshTask: Task<Void, Never>?

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
            oscClient = OSCClient()

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
        deviceRefreshTask?.cancel()
        deviceRefreshTask = nil
        oscServer?.stop()
        oscServer = nil
        isRunning = false
        devices.removeAll()
        pendingValueChanges.removeAll()
        paramValueCache.removeAll()
        paramStringCache.removeAll()
        paramNameCache.removeAll()
        trackNameCache.removeAll()
        onConnectionChange?(false)
        print("[OSC] Server stopped")
    }

    private func requestTrackInfo() {
        sendOSC(address: "/live/song/get/num_tracks")
    }

    private func sendOSC(address: String, args: [any OSCValue] = []) {
        let message = OSCMessage(address, values: args)
        do {
            try oscClient?.send(message, to: "localhost", port: abletonSendPort)
        } catch {
            print("[OSC] Failed to send: \(error)")
        }
    }

    // MARK: - Device Cache Management

    private func clearDeviceCaches(trackId: Int, deviceId: Int) {
        let prefix = "\(trackId):\(deviceId):"

        paramValueCache = paramValueCache.filter { !$0.key.hasPrefix(prefix) }
        paramStringCache = paramStringCache.filter { !$0.key.hasPrefix(prefix) }
        paramNameCache = paramNameCache.filter { !$0.key.hasPrefix(prefix) }
        pendingValueChanges = pendingValueChanges.filter { !$0.hasPrefix(prefix) }
    }

    private func checkAndRegisterDevice(trackId: Int, deviceId: Int) {
        let key = "\(trackId):\(deviceId)"
        guard let pending = pendingDeviceInfo[key],
              let name = pending.name,
              let numParams = pending.numParams else {
            return
        }

        let existingDevice = devices[key]

        // Check if device changed
        if let existing = existingDevice {
            if existing.name != name {
                print("[DEVICE] Track \(trackId) Device \(deviceId): \"\(existing.name)\" → \"\(name)\"")
                clearDeviceCaches(trackId: trackId, deviceId: deviceId)
            }

            if existing.numParams != numParams && !isInitialSetup {
                let diff = numParams - existing.numParams
                let changeType = diff > 0 ? "added" : "removed"
                let trackName = trackNameCache[trackId] ?? "Track \(trackId)"

                print("[CONFIG] \(trackName) > \(name): \(abs(diff)) param(s) \(changeType)")

                // Log config change if same device
                if existing.name == name {
                    let log = DAWLog(
                        action: .deviceConfigChange,
                        trackId: trackId,
                        deviceId: deviceId,
                        paramId: -1,
                        value: Double(numParams),
                        valueString: "\(abs(diff)) param(s) \(changeType)",
                        trackName: trackName,
                        deviceName: name
                    )
                    onParameterChange?(log)
                }

                clearDeviceCaches(trackId: trackId, deviceId: deviceId)
            }
        }

        // Register/update device
        devices[key] = DeviceInfo(
            trackId: trackId,
            deviceId: deviceId,
            name: name,
            numParams: numParams
        )

        pendingDeviceInfo.removeValue(forKey: key)

        // Start polling if needed
        if pollingTask == nil && !devices.isEmpty {
            Task {
                try? await Task.sleep(nanoseconds: 500_000_000)
                isInitialSetup = false
                startPolling()
                startDeviceRefresh()
            }
        }
    }

    // MARK: - Polling

    private func startPolling() {
        guard pollingTask == nil else { return }

        print("[POLL] Starting parameter polling (\(pollingIntervalMs)ms)")

        pollingTask = Task { @MainActor in
            while !Task.isCancelled {
                for device in devices.values {
                    let maxParams = min(device.numParams, maxParamsPerDevice)
                    for paramId in 0..<maxParams {
                        // Always request param name (Pro-Q etc change dynamically)
                        sendOSC(address: "/live/device/get/parameter/name",
                               args: [Int32(device.trackId), Int32(device.deviceId), Int32(paramId)])
                        sendOSC(address: "/live/device/get/parameter/value",
                               args: [Int32(device.trackId), Int32(device.deviceId), Int32(paramId)])
                        sendOSC(address: "/live/device/get/parameter/value_string",
                               args: [Int32(device.trackId), Int32(device.deviceId), Int32(paramId)])
                    }
                }

                try? await Task.sleep(nanoseconds: UInt64(pollingIntervalMs * 1_000_000))
            }
        }
    }

    private func startDeviceRefresh() {
        guard deviceRefreshTask == nil else { return }

        print("[REFRESH] Starting device refresh (\(deviceRefreshIntervalMs)ms)")

        deviceRefreshTask = Task { @MainActor in
            while !Task.isCancelled {
                // Re-query all tracks for their devices
                for i in 0..<numTracks {
                    sendOSC(address: "/live/track/get/num_devices", args: [Int32(i)])
                }

                try? await Task.sleep(nanoseconds: UInt64(deviceRefreshIntervalMs * 1_000_000))
            }
        }
    }

    // MARK: - OSC Message Handling

    private func handleOSCMessage(_ message: OSCMessage) {
        let address = message.addressPattern.stringValue

        switch address {
        // Parameter name response
        case "/live/device/get/parameter/name":
            guard message.values.count >= 4 else { return }
            let trackId = parseIntValue(message.values[0])
            let deviceId = parseIntValue(message.values[1])
            let paramId = parseIntValue(message.values[2])
            guard let name = message.values[3] as? String else { return }

            let key = "\(trackId):\(deviceId):\(paramId)"
            paramNameCache[key] = name

        // Parameter value (numeric) - detect changes
        case "/live/device/get/parameter/value":
            guard message.values.count >= 4 else { return }
            let trackId = parseIntValue(message.values[0])
            let deviceId = parseIntValue(message.values[1])
            let paramId = parseIntValue(message.values[2])
            let value = parseDoubleValue(message.values[3])

            let key = "\(trackId):\(deviceId):\(paramId)"
            let oldValue = paramValueCache[key]
            let hasChanged = oldValue != nil && abs(oldValue! - value) > 0.001

            paramValueCache[key] = value

            if hasChanged {
                // Mark that we're waiting for the new value_string
                // Don't use cached string - it's from the OLD value!
                pendingValueChanges.insert(key)
            }

        // Parameter value string
        case "/live/device/get/parameter/value_string":
            guard message.values.count >= 4 else { return }
            let trackId = parseIntValue(message.values[0])
            let deviceId = parseIntValue(message.values[1])
            let paramId = parseIntValue(message.values[2])
            guard let valueString = message.values[3] as? String else { return }

            let key = "\(trackId):\(deviceId):\(paramId)"
            let oldString = paramStringCache[key]
            paramStringCache[key] = valueString

            // If value changed and we have the string, or string itself changed
            if pendingValueChanges.contains(key) {
                pendingValueChanges.remove(key)
                let value = paramValueCache[key] ?? 0
                handleParameterChange(
                    trackId: trackId,
                    deviceId: deviceId,
                    paramId: paramId,
                    value: value,
                    valueString: valueString
                )
            } else if oldString != nil && oldString != valueString {
                // String changed even if numeric value didn't trigger
                let value = paramValueCache[key] ?? 0
                handleParameterChange(
                    trackId: trackId,
                    deviceId: deviceId,
                    paramId: paramId,
                    value: value,
                    valueString: valueString
                )
            }

        // Track count response
        case "/live/song/get/num_tracks":
            numTracks = parseIntValue(message.values.first)
            print("[OSC] Detected \(numTracks) tracks")

            for i in 0..<min(numTracks, maxTracksToMonitor) {
                sendOSC(address: "/live/track/get/name", args: [Int32(i)])
                sendOSC(address: "/live/track/get/num_devices", args: [Int32(i)])
                sendOSC(address: "/live/track/start_listen/volume", args: [Int32(i)])
                sendOSC(address: "/live/track/start_listen/panning", args: [Int32(i)])
            }

        // Track name response
        case "/live/track/get/name":
            guard message.values.count >= 2 else { return }
            let trackId = parseIntValue(message.values[0])
            guard let name = message.values[1] as? String else { return }

            trackNameCache[trackId] = name
            print("  Track \(trackId): \"\(name)\"")

        // Device count response
        case "/live/track/get/num_devices":
            guard message.values.count >= 2 else { return }
            let trackId = parseIntValue(message.values[0])
            let numDevices = parseIntValue(message.values[1])

            // Remove devices that no longer exist
            for (key, device) in devices {
                if device.trackId == trackId && device.deviceId >= numDevices {
                    print("[DEVICE] Removed: Track \(trackId) Device \(device.deviceId) \"\(device.name)\"")
                    devices.removeValue(forKey: key)
                    clearDeviceCaches(trackId: trackId, deviceId: device.deviceId)
                }
            }

            // Query all devices on this track
            for d in 0..<numDevices {
                let key = "\(trackId):\(d)"
                pendingDeviceInfo[key] = (nil, nil)
                sendOSC(address: "/live/device/get/name", args: [Int32(trackId), Int32(d)])
                sendOSC(address: "/live/device/get/num_parameters", args: [Int32(trackId), Int32(d)])
            }

        // Device name response
        case "/live/device/get/name":
            guard message.values.count >= 3 else { return }
            let trackId = parseIntValue(message.values[0])
            let deviceId = parseIntValue(message.values[1])
            guard let name = message.values[2] as? String else { return }

            let key = "\(trackId):\(deviceId)"
            var pending = pendingDeviceInfo[key] ?? (nil, nil)
            pending.name = name
            pendingDeviceInfo[key] = pending

            if isInitialSetup {
                print("    Device \(deviceId): \"\(name)\"")
            }

            checkAndRegisterDevice(trackId: trackId, deviceId: deviceId)

        // Parameter count response
        case "/live/device/get/num_parameters":
            guard message.values.count >= 3 else { return }
            let trackId = parseIntValue(message.values[0])
            let deviceId = parseIntValue(message.values[1])
            let numParams = parseIntValue(message.values[2])

            let key = "\(trackId):\(deviceId)"
            var pending = pendingDeviceInfo[key] ?? (nil, nil)
            pending.numParams = numParams
            pendingDeviceInfo[key] = pending

            checkAndRegisterDevice(trackId: trackId, deviceId: deviceId)

        // Track volume (listener-based)
        case "/live/track/get/volume":
            guard message.values.count >= 2 else { return }
            let trackId = parseIntValue(message.values[0])
            let value = parseDoubleValue(message.values[1])

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

        // Track pan (listener-based)
        case "/live/track/get/panning":
            guard message.values.count >= 2 else { return }
            let trackId = parseIntValue(message.values[0])
            let value = parseDoubleValue(message.values[1])

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

        default:
            break
        }
    }

    // MARK: - Parameter Change Handling

    private func handleParameterChange(
        trackId: Int,
        deviceId: Int,
        paramId: Int,
        value: Double,
        valueString: String
    ) {
        let key = "\(trackId):\(deviceId):\(paramId)"

        // Get names
        let trackName = trackNameCache[trackId]
        let deviceKey = "\(trackId):\(deviceId)"
        let device = devices[deviceKey]
        let deviceName = device?.name
        let paramName = paramNameCache[key]

        // Apply plugin-specific value formatting
        let formattedValue = PluginFormatters.format(
            deviceName: deviceName,
            paramName: paramName,
            value: value,
            originalValueString: valueString
        )
        let finalValueString = formattedValue ?? valueString

        scheduleParameterChange(
            key: key,
            trackId: trackId,
            deviceId: deviceId,
            paramId: paramId,
            value: value,
            valueString: finalValueString,
            action: .parameterChange,
            trackName: trackName,
            deviceName: deviceName,
            paramName: paramName
        )
    }

    private func scheduleParameterChange(
        key: String,
        trackId: Int,
        deviceId: Int,
        paramId: Int,
        value: Double,
        valueString: String,
        action: DAWAction,
        trackName: String? = nil,
        deviceName: String? = nil,
        paramName: String? = nil
    ) {
        // Cancel existing timer
        pendingChanges[key]?.timer?.cancel()

        // Create new debounced emission
        let timer = Task { @MainActor in
            try? await Task.sleep(nanoseconds: UInt64(debounceMs * 1_000_000))

            guard !Task.isCancelled else { return }

            let log = DAWLog(
                action: action,
                trackId: trackId,
                deviceId: deviceId,
                paramId: paramId,
                value: value,
                valueString: valueString,
                trackName: trackName ?? self.trackNameCache[trackId],
                deviceName: deviceName,
                paramName: paramName
            )

            // Console output
            let track = log.trackName ?? "Track \(trackId)"
            let device = deviceId >= 0 ? (log.deviceName ?? "Device \(deviceId)") : "Mixer"
            let param = log.paramName ?? (deviceId == -1 ? (paramId == 0 ? "Volume" : "Pan") : "Param \(paramId)")
            print("[LOG] \(log.timeString) | \(track) > \(device) > \(param) → \(valueString)")

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

    // MARK: - Helpers

    private func parseIntValue(_ value: Any?) -> Int {
        if let v = value as? Int32 { return Int(v) }
        if let v = value as? Int { return v }
        return 0
    }

    private func parseDoubleValue(_ value: Any?) -> Double {
        if let v = value as? Float { return Double(v) }
        if let v = value as? Double { return v }
        return 0
    }
}
