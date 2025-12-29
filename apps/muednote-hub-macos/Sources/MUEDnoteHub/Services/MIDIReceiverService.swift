import Foundation
import CoreMIDI

/// Service for receiving MIDI messages via IAC Driver
@MainActor
class MIDIReceiverService: ObservableObject {
    // MIDI Client
    private var midiClient: MIDIClientRef = 0
    private var inputPort: MIDIPortRef = 0

    // State
    @Published var isRunning = false
    @Published var connectedSources: [String] = []

    // Callbacks
    var onMIDIMessage: ((MIDILog) -> Void)?
    var onConnectionChange: ((Bool) -> Void)?

    // Debounce for CC (to avoid flooding)
    private var lastCCValues: [String: (value: UInt8, time: Date)] = [:]
    private let ccDebounceMs: Int = 50

    init() {}

    func start() {
        guard midiClient == 0 else { return }

        // Create MIDI client
        var status = MIDIClientCreateWithBlock("MUEDnoteHub" as CFString, &midiClient) { [weak self] notification in
            Task { @MainActor in
                self?.handleMIDINotification(notification)
            }
        }

        guard status == noErr else {
            print("[MIDI] Failed to create client: \(status)")
            return
        }

        // Create input port
        status = MIDIInputPortCreateWithProtocol(
            midiClient,
            "Input" as CFString,
            ._1_0,
            &inputPort
        ) { [weak self] eventList, srcConnRefCon in
            self?.handleMIDIEventList(eventList)
        }

        guard status == noErr else {
            print("[MIDI] Failed to create input port: \(status)")
            return
        }

        // Connect to all available sources (including IAC Driver)
        connectToAllSources()

        isRunning = true
        onConnectionChange?(true)
        print("[MIDI] Service started")
        appendToLogFile("[MIDI] Service started\n")
    }

    func stop() {
        if inputPort != 0 {
            MIDIPortDispose(inputPort)
            inputPort = 0
        }
        if midiClient != 0 {
            MIDIClientDispose(midiClient)
            midiClient = 0
        }

        isRunning = false
        connectedSources.removeAll()
        onConnectionChange?(false)
        print("[MIDI] Service stopped")
    }

    private func connectToAllSources() {
        let sourceCount = MIDIGetNumberOfSources()
        var sources: [String] = []

        for i in 0..<sourceCount {
            let source = MIDIGetSource(i)
            let name = getMIDIObjectName(source) ?? "Unknown"

            let status = MIDIPortConnectSource(inputPort, source, nil)
            if status == noErr {
                sources.append(name)
                print("[MIDI] Connected to source: \(name)")
                appendToLogFile("[MIDI] Connected to source: \(name)\n")
            } else {
                print("[MIDI] Failed to connect to source: \(name)")
            }
        }

        connectedSources = sources
    }

    private func getMIDIObjectName(_ obj: MIDIObjectRef) -> String? {
        var name: Unmanaged<CFString>?
        let status = MIDIObjectGetStringProperty(obj, kMIDIPropertyName, &name)
        if status == noErr, let cfName = name?.takeRetainedValue() {
            return cfName as String
        }
        return nil
    }

    private func handleMIDINotification(_ notification: UnsafePointer<MIDINotification>) {
        let messageID = notification.pointee.messageID

        switch messageID {
        case .msgSetupChanged:
            print("[MIDI] Setup changed, reconnecting...")
            connectToAllSources()
        default:
            break
        }
    }

    private func handleMIDIEventList(_ eventList: UnsafePointer<MIDIEventList>) {
        let packet = eventList.pointee.packet
        withUnsafePointer(to: packet) { ptr in
            var packetPtr = ptr
            for _ in 0..<Int(eventList.pointee.numPackets) {
                handleMIDIPacket(packetPtr.pointee)
                packetPtr = UnsafePointer(MIDIEventPacketNext(packetPtr))
            }
        }
    }

    private func handleMIDIPacket(_ packet: MIDIEventPacket) {
        let words = packet.words

        // Parse Universal MIDI Packet (UMP) format
        let word0 = words.0
        let messageType = (word0 >> 28) & 0x0F

        // Type 2: MIDI 1.0 Channel Voice Message
        guard messageType == 2 else { return }

        let status = UInt8((word0 >> 16) & 0xFF)
        let data1 = UInt8((word0 >> 8) & 0xFF)
        let data2 = UInt8(word0 & 0xFF)

        let channel = status & 0x0F
        let messageKind = status & 0xF0

        var midiLog: MIDILog?

        switch messageKind {
        case 0x90: // Note On
            if data2 > 0 {
                midiLog = MIDILog(
                    type: .noteOn,
                    channel: channel,
                    note: data1,
                    velocity: data2
                )
                let logLine = "[MIDI] Note On: ch=\(channel) note=\(data1) vel=\(data2)\n"
                print(logLine.trimmingCharacters(in: .newlines))
                appendToLogFile(logLine)
            } else {
                // Note On with velocity 0 = Note Off
                midiLog = MIDILog(
                    type: .noteOff,
                    channel: channel,
                    note: data1,
                    velocity: 0
                )
            }

        case 0x80: // Note Off
            midiLog = MIDILog(
                type: .noteOff,
                channel: channel,
                note: data1,
                velocity: data2
            )
            let logLine = "[MIDI] Note Off: ch=\(channel) note=\(data1)\n"
            print(logLine.trimmingCharacters(in: .newlines))
            appendToLogFile(logLine)

        case 0xB0: // Control Change
            // Debounce CC to avoid flooding
            let key = "\(channel):\(data1)"
            let now = Date()

            if let last = lastCCValues[key] {
                let elapsed = now.timeIntervalSince(last.time) * 1000
                if elapsed < Double(ccDebounceMs) && last.value == data2 {
                    return // Skip duplicate within debounce window
                }
            }
            lastCCValues[key] = (data2, now)

            midiLog = MIDILog(
                type: .controlChange,
                channel: channel,
                controller: data1,
                ccValue: data2
            )
            let ccName = ccNameFor(data1)
            let logLine = "[MIDI] CC: ch=\(channel) \(ccName)(\(data1))=\(data2)\n"
            print(logLine.trimmingCharacters(in: .newlines))
            appendToLogFile(logLine)

        case 0xE0: // Pitch Bend
            let pitchBend = Int(data2) << 7 | Int(data1)
            midiLog = MIDILog(
                type: .pitchBend,
                channel: channel,
                pitchBend: pitchBend
            )
            let logLine = "[MIDI] Pitch Bend: ch=\(channel) value=\(pitchBend)\n"
            print(logLine.trimmingCharacters(in: .newlines))
            appendToLogFile(logLine)

        default:
            break
        }

        if let log = midiLog {
            Task { @MainActor in
                self.onMIDIMessage?(log)
            }
        }
    }

    private func ccNameFor(_ cc: UInt8) -> String {
        switch cc {
        case 1: return "Mod"
        case 7: return "Vol"
        case 10: return "Pan"
        case 11: return "Expr"
        case 64: return "Sustain"
        case 65: return "Porta"
        case 66: return "Sost"
        case 67: return "Soft"
        default: return "CC"
        }
    }

    private func appendToLogFile(_ text: String) {
        let logPath = "/tmp/muednote-midi.log"
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
}

/// MIDI log entry
struct MIDILog: Identifiable {
    let id: UUID
    let timestamp: Date
    let type: MIDIMessageType
    let channel: UInt8

    // Note data
    var note: UInt8?
    var velocity: UInt8?

    // CC data
    var controller: UInt8?
    var ccValue: UInt8?

    // Pitch bend data
    var pitchBend: Int?

    init(
        id: UUID = UUID(),
        timestamp: Date = Date(),
        type: MIDIMessageType,
        channel: UInt8,
        note: UInt8? = nil,
        velocity: UInt8? = nil,
        controller: UInt8? = nil,
        ccValue: UInt8? = nil,
        pitchBend: Int? = nil
    ) {
        self.id = id
        self.timestamp = timestamp
        self.type = type
        self.channel = channel
        self.note = note
        self.velocity = velocity
        self.controller = controller
        self.ccValue = ccValue
        self.pitchBend = pitchBend
    }

    var displayText: String {
        switch type {
        case .noteOn:
            return "Note On: \(noteName) vel=\(velocity ?? 0)"
        case .noteOff:
            return "Note Off: \(noteName)"
        case .controlChange:
            return "CC\(controller ?? 0): \(ccValue ?? 0)"
        case .pitchBend:
            return "PitchBend: \(pitchBend ?? 8192)"
        }
    }

    private var noteName: String {
        guard let n = note else { return "?" }
        let names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
        let octave = Int(n) / 12 - 1
        let noteName = names[Int(n) % 12]
        return "\(noteName)\(octave)"
    }

    var timeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm:ss.SSS"
        return formatter.string(from: timestamp)
    }
}

enum MIDIMessageType: String, Codable {
    case noteOn = "note_on"
    case noteOff = "note_off"
    case controlChange = "control_change"
    case pitchBend = "pitch_bend"
}
