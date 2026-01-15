import Foundation

/// DAW log entry representing a parameter change
struct DAWLog: Identifiable, Codable {
    let id: UUID
    let timestamp: Date
    let daw: String
    let action: DAWAction
    let trackId: Int
    let deviceId: Int
    let paramId: Int
    let value: Double
    let valueString: String

    // Metadata (optional)
    let trackName: String?
    let deviceName: String?
    let paramName: String?

    init(
        id: UUID = UUID(),
        timestamp: Date = Date(),
        daw: String = "ableton",
        action: DAWAction = .parameterChange,
        trackId: Int,
        deviceId: Int,
        paramId: Int,
        value: Double,
        valueString: String,
        trackName: String? = nil,
        deviceName: String? = nil,
        paramName: String? = nil
    ) {
        self.id = id
        self.timestamp = timestamp
        self.daw = daw
        self.action = action
        self.trackId = trackId
        self.deviceId = deviceId
        self.paramId = paramId
        self.value = value
        self.valueString = valueString
        self.trackName = trackName
        self.deviceName = deviceName
        self.paramName = paramName
    }

    /// Display text for UI
    var displayText: String {
        let track = trackName ?? "Track \(trackId)"
        let device = deviceName ?? "Device \(deviceId)"
        let param = paramName ?? "Param \(paramId)"

        switch action {
        case .trackVolume:
            return "\(track) Vol: \(valueString)"
        case .trackPan:
            return "\(track) Pan: \(valueString)"
        case .parameterChange:
            return "\(track) > \(device) > \(param): \(valueString)"
        case .deviceConfigChange:
            return "\(track) > \(device): \(valueString)"
        }
    }

    /// Formatted timestamp
    var timeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss"
        return formatter.string(from: timestamp)
    }
}

/// Type of DAW action
enum DAWAction: String, Codable {
    case parameterChange = "parameter_change"
    case trackVolume = "track_volume"
    case trackPan = "track_pan"
    case deviceConfigChange = "device_config_change"
}

/// Metadata for API request
struct DAWLogMetadata: Codable {
    let track_name: String?
    let device_name: String?
    let param_name: String?
}

/// API request body for sending logs
struct DAWLogRequest: Codable {
    let timestamp: String
    let daw: String
    let action: String
    let track_id: Int
    let device_id: Int
    let param_id: Int
    let value: Double
    let value_string: String
    let metadata: DAWLogMetadata?

    init(from log: DAWLog) {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        self.timestamp = formatter.string(from: log.timestamp)
        self.daw = log.daw
        self.action = log.action.rawValue
        self.track_id = log.trackId
        self.device_id = log.deviceId
        self.param_id = log.paramId
        self.value = log.value
        self.value_string = log.valueString

        // Include metadata if any field is set
        if log.trackName != nil || log.deviceName != nil || log.paramName != nil {
            self.metadata = DAWLogMetadata(
                track_name: log.trackName,
                device_name: log.deviceName,
                param_name: log.paramName
            )
        } else {
            self.metadata = nil
        }
    }
}
