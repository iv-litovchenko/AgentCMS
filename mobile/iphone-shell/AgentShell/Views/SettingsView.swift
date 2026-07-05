import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var viewModel: ShellViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var baseURLString = ""
    @State private var agentId = ""
    @State private var ttsEnabled = true

    var body: some View {
        NavigationStack {
            Form {
                Section("Agent CMS") {
                    TextField("URL сервера", text: $baseURLString)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()

                    TextField("Agent ID", text: $agentId)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                Section("Голос") {
                    Toggle("Озвучивать ответы (TTS)", isOn: $ttsEnabled)
                }

                Section {
                    Text("Mac и iPhone — одна Wi‑Fi. CMS: HOST=0.0.0.0 npm start")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Text("API контракт: mobile/SHELL-API.md")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Настройки")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Отмена") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Сохранить") {
                        viewModel.configStore.apply(baseURLString: baseURLString, agentId: agentId)
                        viewModel.configStore.ttsEnabled = ttsEnabled
                        dismiss()
                        viewModel.reconnect()
                    }
                }
            }
            .onAppear {
                baseURLString = viewModel.configStore.normalizedBaseURLString()
                agentId = viewModel.configStore.agentId
                ttsEnabled = viewModel.configStore.ttsEnabled
            }
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(ShellViewModel())
}
