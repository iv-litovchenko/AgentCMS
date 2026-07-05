import SwiftUI

@main
struct AgentShellApp: App {
    @StateObject private var viewModel = ShellViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(viewModel)
        }
    }
}
