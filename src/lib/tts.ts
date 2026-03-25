// src/lib/tts.ts
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import crypto from "crypto";

function hashText(text: string) {
  return crypto.createHash("md5").update(text).digest("hex");
}
const execAsync = promisify(exec);

export async function generateZhAudio(text: string) {
  const audioDir = path.join(process.cwd(), "public", "audio", "zh");
  fs.mkdirSync(audioDir, { recursive: true });

  const filename   = `${hashText(text)}.mp3`;
  const outputPath = path.join(audioDir, filename);

  if (!fs.existsSync(outputPath)) {
    try {
      await execAsync(
        `edge-tts --voice zh-CN-XiaoxiaoNeural --text "${text}" --write-media "${outputPath}"`
      );
    } catch (err) {
      console.error("TTS error:", err);
      return null;
    }
  }

  if (fs.existsSync(outputPath)) {
    return `/audio/zh/${filename}`;
  }

  return null;
}