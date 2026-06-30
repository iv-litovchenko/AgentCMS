#!/usr/bin/env python3
"""Voice reply generator using Piper TTS"""
import sys
import subprocess
import os

def generate_voice(text, output_path, voice="irina"):
    """Generate voice using Piper TTS"""
    model = os.path.expanduser(f"~/.local/share/piper/ru_RU-{voice}-medium.onnx")
    
    # Generate WAV
    wav_path = output_path.replace('.ogg', '.wav')
    
    cmd = f'echo "{text}" | source ~/voice-env/bin/activate && python -m piper --model {model} --output_file {wav_path}'
    subprocess.run(cmd, shell=True, executable='/bin/bash')
    
    # Convert to OGG Opus
    ffmpeg_cmd = f'ffmpeg -y -i {wav_path} -c:a libopus -b:a 24k {output_path}'
    subprocess.run(ffmpeg_cmd, shell=True)
    
    # Cleanup
    if os.path.exists(wav_path):
        os.remove(wav_path)
    
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: VoiceReply.py 'Text to speak' [voice_name]")
        print("Available voices: irina (female), ruslan (male)")
        sys.exit(1)
    
    text = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else "irina"
    
    import uuid
    output = f"/home/openclaw/.openclaw/media/inbound/voice_{uuid.uuid4().hex[:8]}.ogg"
    result = generate_voice(text, output, voice)
    print(result)
