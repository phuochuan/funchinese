#!/usr/bin/env python3
# scripts/generate-audio.py
# Cài: pip install edge-tts asyncio
# Chạy: python scripts/generate-audio.py

import asyncio
import edge_tts
import os
import sys
import json
import argparse

VOICE_ZH = "zh-CN-XiaoxiaoNeural"   # nữ, chuẩn Phổ thông
VOICE_ZH_MALE = "zh-CN-YunxiNeural" # nam

async def generate_audio(text: str, output_path: str, voice: str = VOICE_ZH):
    """Generate audio cho 1 từ/câu."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

async def process_file(input_file: str, output_dir: str):
    """Xử lý file JSON chứa danh sách từ vựng."""
    with open(input_file, encoding="utf-8") as f:
        words = json.load(f)

    total   = len(words)
    success = 0
    skipped = 0

    for i, word in enumerate(words, 1):
        hanzi = word.get("hanzi", "").strip()
        if not hanzi:
            continue

        # Tên file = hanzi (encode để tránh lỗi filesystem)
        filename    = f"{hanzi}.mp3"
        output_path = os.path.join(output_dir, filename)

        if os.path.exists(output_path):
            skipped += 1
            continue

        try:
            await generate_audio(hanzi, output_path)
            success += 1
            print(f"[{i}/{total}] ✓ {hanzi} → {filename}")
            await asyncio.sleep(0.15)  # tránh rate limit
        except Exception as e:
            print(f"[{i}/{total}] ✗ {hanzi}: {e}")

    print(f"\nDone: {success} generated, {skipped} skipped, {total} total")

async def generate_single(text: str, output_dir: str):
    """Generate audio cho 1 từ đơn lẻ."""
    filename    = f"{text}.mp3"
    output_path = os.path.join(output_dir, filename)
    await generate_audio(text, output_path)
    print(f"Generated: {output_path}")
    return output_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Chinese audio using edge-tts")
    parser.add_argument("--text",   help="Single text to generate audio for")
    parser.add_argument("--file",   help="JSON file with vocabulary list")
    parser.add_argument("--output", default="public/audio/zh", help="Output directory")
    args = parser.parse_args()

    if args.text:
        asyncio.run(generate_single(args.text, args.output))
    elif args.file:
        asyncio.run(process_file(args.file, args.output))
    else:
        print("Usage:")
        print("  python generate-audio.py --text 学习 --output public/audio/zh")
        print("  python generate-audio.py --file vocabulary.json --output public/audio/zh")
