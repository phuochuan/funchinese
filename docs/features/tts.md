# Text-to-Speech (TTS)

## Overview

Hệ thống TTS tiếng Trung dùng **Microsoft Edge TTS** (edge-tts) để phát âm từ vựng và câu hỏi. Audio được cache thành file MP3 trên disk.

## How It Works

### Library (`src/lib/tts.ts`)

```ts
generateZhAudio(text: string): Promise<string | null>
// Returns: "/audio/zh/{md5_hash}.mp3"
// or null if TTS fails
```

### Algorithm
```
1. MD5 hash của text → filename
2. Check: public/audio/zh/{filename}.mp3 có tồn tại?
   → Có: return URL (cache hit)
   → Không: goto 3
3. Run: edge-tts --voice zh-CN-XiaoxiaoNeural --text "{text}" --write-media "{path}"
4. If success: return URL
   If fail: return null + log error
```

### Voice
- **Voice:** `zh-CN-XiaoxiaoNeural` — female, natural Mandarin Chinese
- **Format:** MP3
- **Cache dir:** `public/audio/zh/` (committed to repo hoặc .gitignore)

## Usage

### Vocabulary
Mỗi Vocabulary record có `audioUrl`. Khi admin tạo/sửa vocabulary:
```ts
// Trong POST /api/admin/vocabulary
if (!vocab.audioUrl) {
  vocab.audioUrl = await generateZhAudio(vocab.hanzi)
}
```

### Flashcard
Card hiển thị nút phát âm:
```tsx
<audio src={vocab.audioUrl} />
<button onClick={() => audioRef.current?.play()}>
  <span className="material-symbols-outlined">volume_up</span>
</button>
```

### Lesson Content
Block type `AUDIO`: hiển thị audio player với text Hanzi + pinyin.

### Admin: Question Audio Generation
**`POST /api/admin/questions/generate-audio`**
```ts
Request: { text: string }
Response: { audioUrl: string }
```
Teacher tạo/sửa HSK question → generate audio cho listening questions.
Lưu audio vào **Supabase Storage** bucket `audio_question`:
```ts
// Upload generated audio to Supabase
const { data } = await supabase.storage
  .from('audio_question')
  .upload(`${uuid}.mp3`, audioBuffer)
```

## Student Flashcard Audio

Student flashcard UI phát âm:
1. Click volume icon → play `vocabulary.audioUrl`
2. Hoặc keyboard shortcut (configurable)

## Admin AI Question Image Generation

AI batch generation cũng thử fetch image từ Wikimedia Commons:
```ts
// Wikimedia Commons API → tìm ảnh liên quan đến từ Hanzi
// Fallback: Picsum random image
```

Image URL lưu vào `AiQuestion.imageUrl`.

## File Locations

| Mục đích | Nơi lưu |
|---|---|
| Vocabulary audio | `public/audio/zh/{md5}.mp3` |
| Question audio (Supabase) | Bucket: `audio_question` |
| Student video upload | `public/uploads/videos/` |
| Avatar upload | `public/uploads/avatars/` |
| Lesson images (Supabase) | Bucket: `lesson-images` |

## Batch Audio Generation

Khi admin bulk import vocabulary từ CSV:
```ts
for each vocabRow:
  audioUrl = await generateZhAudio(hanzi)
  // Save với vocab record
```

Hoặc dùng `POST /api/admin/vocabulary` với action `"generate-audio"` cho nhiều từ cùng lúc.

## Error Handling

- edge-tts không có → log error, return null
- File write fail → return null
- Audio URL null → UI hiển thị icon mờ hoặc disabled

## Dependencies

```bash
npm install edge-tts
# hoặc: pip install edge-tts (nếu dùng subprocess)
```

Thực tế dùng Node.js `child_process.exec`:
```ts
import { exec } from "child_process"
import { promisify } from "util"
const execAsync = promisify(exec)

await execAsync(
  `edge-tts --voice zh-CN-XiaoxiaoNeural --text "${text}" --write-media "${outputPath}"`
)
```
