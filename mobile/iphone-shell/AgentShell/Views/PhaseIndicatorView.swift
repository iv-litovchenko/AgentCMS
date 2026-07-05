import SwiftUI

struct PhaseIndicatorView: View {
    let phase: ShellPhase
    let phrase: String
    let partialTranscript: String
    let connectionLabel: String
    let routeLabel: String

    var body: some View {
        VStack(spacing: 8) {
            Text("\(phase.emoji) \(phase.label)")
                .font(.title2.weight(.semibold))

            if phase == .listening, !partialTranscript.isEmpty {
                Text(partialTranscript)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            } else if !phrase.isEmpty {
                Text(phrase)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            HStack(spacing: 8) {
                Text(routeLabel)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(.blue.opacity(0.18), in: Capsule())
                Text(connectionLabel)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    PhaseIndicatorView(
        phase: .thinking,
        phrase: "Как дела?",
        partialTranscript: "",
        connectionLabel: "Live · 192.168.0.102",
        routeLabel: "QwenPaw"
    )
}
