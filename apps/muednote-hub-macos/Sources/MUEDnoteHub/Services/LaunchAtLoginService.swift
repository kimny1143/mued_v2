import Foundation
import ServiceManagement

/// Service for managing Launch at Login functionality
/// Uses SMAppService for macOS 13+
@MainActor
class LaunchAtLoginService: ObservableObject {
    @Published var isEnabled: Bool = false {
        didSet {
            if oldValue != isEnabled {
                updateLaunchAtLogin()
            }
        }
    }

    @Published var error: String?

    init() {
        checkCurrentStatus()
    }

    /// Check if launch at login is currently enabled
    private func checkCurrentStatus() {
        if #available(macOS 13.0, *) {
            let status = SMAppService.mainApp.status
            isEnabled = (status == .enabled)
        } else {
            // Fallback for older macOS versions
            isEnabled = false
        }
    }

    /// Update launch at login setting
    private func updateLaunchAtLogin() {
        if #available(macOS 13.0, *) {
            do {
                if isEnabled {
                    try SMAppService.mainApp.register()
                    print("[LaunchAtLogin] Registered for launch at login")
                } else {
                    try SMAppService.mainApp.unregister()
                    print("[LaunchAtLogin] Unregistered from launch at login")
                }
                error = nil
            } catch {
                self.error = "ログイン項目の設定に失敗しました: \(error.localizedDescription)"
                print("[LaunchAtLogin] Error: \(error)")
                // Revert the change
                checkCurrentStatus()
            }
        } else {
            error = "この機能はmacOS 13以降で利用可能です"
        }
    }

    /// Toggle launch at login
    func toggle() {
        isEnabled.toggle()
    }
}
