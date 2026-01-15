import Foundation

/// Plugin-specific value formatters
/// Handles plugins that return incorrect value_string from AbletonOSC
enum PluginFormatters {

    // MARK: - Main Entry Point

    /// Format a parameter value using plugin-specific logic
    /// - Returns: Formatted string, or nil if no formatter matches
    static func format(
        deviceName: String?,
        paramName: String?,
        value: Double,
        originalValueString: String
    ) -> String? {
        guard let deviceName = deviceName, let paramName = paramName else {
            return nil
        }

        // FabFilter Pro-Q series (Pro-Q 3, Pro-Q 4, etc.)
        if deviceName.contains("Pro-Q") {
            return formatProQ(paramName: paramName, value: value)
        }

        // Add more plugins here as needed
        // if deviceName.contains("Pro-C") { ... }

        return nil
    }

    // MARK: - FabFilter Pro-Q

    /// FabFilter Pro-Q series formatter
    /// Pro-Q's VST returns incorrect value_string for most parameters
    /// @see docs/daw-hub/fabfilter-integration.md
    private static func formatProQ(paramName: String, value: Double) -> String? {
        // Frequency parameters (Band X Frequency)
        if paramName.contains("Frequency") {
            return formatProQFrequency(value: value)
        }

        // Gain parameters (Band X Gain, but not S/C Gain)
        if paramName.contains("Gain") && !paramName.contains("S/C") {
            return formatProQGain(value: value)
        }

        // Q parameters (Band X Q or just Q)
        if paramName == "Q" || paramName.contains(" Q") {
            return formatProQQ(value: value)
        }

        // Slope parameters (Band X Slope)
        if paramName.contains("Slope") {
            return formatProQSlope(value: value)
        }

        return nil
    }

    /// Frequency conversion
    /// Range: 10 Hz - 30 kHz (logarithmic scale)
    /// Formula: frequency = 10 * 3000 ^ value
    private static func formatProQFrequency(value: Double) -> String {
        let minFreq = 10.0
        let maxFreq = 30000.0
        let frequency = minFreq * pow(maxFreq / minFreq, value)

        if frequency >= 1000 {
            return String(format: "%.2f kHz", frequency / 1000)
        }
        return String(format: "%.1f Hz", frequency)
    }

    /// Gain conversion
    /// Range: -30 dB - +30 dB (linear scale)
    /// Formula: gain = (value - 0.5) * 60
    private static func formatProQGain(value: Double) -> String {
        let gain = (value - 0.5) * 60
        let sign = gain >= 0 ? "+" : ""
        return String(format: "%@%.2f dB", sign, gain)
    }

    /// Q (bandwidth) conversion
    /// Range: 0.025 - 40 (logarithmic scale)
    /// Formula: q = 0.025 * 1600 ^ value
    private static func formatProQQ(value: Double) -> String {
        let minQ = 0.025
        let maxQ = 40.0
        let q = minQ * pow(maxQ / minQ, value)
        return String(format: "%.2f", q)
    }

    /// Slope conversion
    /// Range: 6 - 96 dB/oct (6 dB increments)
    /// Formula: slope = (value + 1) * 6
    private static func formatProQSlope(value: Double) -> String {
        let slope = Int(round((value + 1) * 6))
        return "\(slope) dB/oct"
    }
}
