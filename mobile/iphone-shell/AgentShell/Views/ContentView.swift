import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var viewModel: ShellViewModel
    @State private var composeText = ""
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                PhaseIndicatorView(
                    phase: viewModel.phase,
                    phrase: viewModel.phrase,
                    partialTranscript: viewModel.speech.partialTranscript,
                    connectionLabel: viewModel.connectionLabel,
                    routeLabel: viewModel.routeLabel
                )

                MicButtonView(
                    isRecording: viewModel.speech.isRecording,
                    isSending: viewModel.isSending,
                    onPress: viewModel.beginHoldToTalk,
                    onRelease: viewModel.endHoldToTalk,
                    onCancel: viewModel.cancelHoldToTalk
                )

                ReplyView(text: viewModel.displayReply)

                composeBar

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
            .padding()
            .navigationTitle("Agent Shell")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        viewModel.reconnect()
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .accessibilityLabel("Переподключить")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("Настройки")
                }
                if viewModel.tts.isSpeaking {
                    ToolbarItem(placement: .bottomBar) {
                        Button("Стоп озвучки") {
                            viewModel.stopSpeaking()
                        }
                    }
                }
            }
            .sheet(isPresented: $showSettings) {
                SettingsView()
                    .environmentObject(viewModel)
            }
        }
        .onAppear { viewModel.onAppear() }
        .onDisappear { viewModel.onDisappear() }
    }

    private var composeBar: some View {
        HStack(spacing: 8) {
            TextField("Сообщение…", text: $composeText, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(1...4)

            Button("→") {
                let text = composeText
                composeText = ""
                viewModel.sendTypedMessage(text)
            }
            .buttonStyle(.borderedProminent)
            .disabled(composeText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isSending)
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(ShellViewModel())
}
