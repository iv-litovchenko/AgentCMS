import SwiftUI

struct MicButtonView: View {
    let isRecording: Bool
    let isSending: Bool
    let onPress: () -> Void
    let onRelease: () -> Void
    let onCancel: () -> Void

    var body: some View {
        ZStack {
            Circle()
                .fill(isRecording ? Color.red.opacity(0.18) : Color.accentColor.opacity(0.12))
                .frame(width: 160, height: 160)

            Circle()
                .stroke(isRecording ? Color.red : Color.accentColor, lineWidth: 3)
                .frame(width: 120, height: 120)
                .scaleEffect(isRecording ? 1.06 : 1)
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: isRecording)

            Image(systemName: isRecording ? "waveform" : "mic.fill")
                .font(.system(size: 40, weight: .medium))
                .foregroundStyle(isRecording ? .red : .accentColor)
        }
        .opacity(isSending ? 0.5 : 1)
        .accessibilityLabel(isRecording ? "Идёт запись" : "Удерживайте для записи")
        .gesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in
                    guard !isSending else { return }
                    if !isRecording { onPress() }
                }
                .onEnded { _ in
                    if isRecording { onRelease() } else { onCancel() }
                }
        )
        .padding(.vertical, 8)
    }
}

#Preview {
    MicButtonView(
        isRecording: false,
        isSending: false,
        onPress: {},
        onRelease: {},
        onCancel: {}
    )
}
