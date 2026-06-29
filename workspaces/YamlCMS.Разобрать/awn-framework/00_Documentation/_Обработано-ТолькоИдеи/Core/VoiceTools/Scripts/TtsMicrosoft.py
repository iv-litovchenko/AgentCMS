#!/usr/bin/env python3
"""Microsoft Edge TTS wrapper for OpenClaw"""
import subprocess
import sys
import tempfile
import os

def tts_microsoft(text, output_path, voice="ru-RU-SvetlanaNeural", lang="ru-RU"):
    """Generate voice using Microsoft Edge TTS via node-edge-tts"""
    
    # Create temp file for output
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        # Escape text for shell
        escaped_text = text.replace('"', '\\"')
        
        # Run node-edge-tts
        cmd = [
            'npx', 'node-edge-tts',
            '-t', text,
            '-v', voice,
            '-l', lang,
            '-f', tmp_path,
            '--timeout', '30000'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        if result.returncode != 0:
            print(f"Error: {result.stderr}", file=sys.stderr)
            return None
        
        # Convert to OGG Opus for Telegram voice messages if needed
        if output_path.endswith('.ogg') or output_path.endswith('.opus'):
            ffmpeg_cmd = [
                'ffmpeg', '-y', '-i', tmp_path,
                '-c:a', 'libopus', '-b:a', '24k',
                output_path
            ]
            subprocess.run(ffmpeg_cmd, check=True, capture_output=True)
            os.remove(tmp_path)
            return output_path
        else:
            # Just rename/copy the mp3
            os.rename(tmp_path, output_path)
            return output_path
            
    except Exception as e:
        print(f"TTS Error: {e}", file=sys.stderr)
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: TtsMicrosoft.py 'Text to speak' /path/to/output.ogg [voice]")
        print("Default voice: ru-RU-SvetlanaNeural")
        sys.exit(1)
    
    text = sys.argv[1]
    output = sys.argv[2]
    voice = sys.argv[3] if len(sys.argv) > 3 else "ru-RU-SvetlanaNeural"
    
    result = tts_microsoft(text, output, voice)
    if result:
        print(result)
    else:
        sys.exit(1)
