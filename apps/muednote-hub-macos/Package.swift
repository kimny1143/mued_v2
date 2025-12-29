// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "MUEDnoteHub",
    platforms: [
        .macOS(.v14)
    ],
    dependencies: [
        // OSC library for receiving Ableton messages
        .package(url: "https://github.com/orchetect/OSCKit.git", from: "0.6.0"),
        // Keychain access for secure token storage
        .package(url: "https://github.com/kishikawakatsumi/KeychainAccess.git", from: "4.2.2"),
    ],
    targets: [
        .executableTarget(
            name: "MUEDnoteHub",
            dependencies: [
                "OSCKit",
                "KeychainAccess",
            ],
            path: "Sources/MUEDnoteHub"
        ),
    ]
)
