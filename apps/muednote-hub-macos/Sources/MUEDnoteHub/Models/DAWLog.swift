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

    init(
        id: UUID = UUID(),
        timestamp: Date = Date(),
        daw: String = "ableton",
        action: DAWAction = .parameterChange,
        trackId: Int,
        deviceId: Int,
        paramId: Int,
        value: Double,
        valueString: String
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
    }

    /// Display text for UI
    var displayText: String {
        switch action {
        case .trackVolume:
            return "Track \(trackId) Vol: \(valueString)"
        case .trackPan:
            return "Track \(trackId) Pan: \(valueString)"
        case .parameterChange:
            return "T\(trackId)/D\(deviceId)/P\(paramId): \(valueString)"
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
    }
}
