// src/app/api/admin/ai-questions/generate-batch/route.ts
// POST — AI tạo câu hỏi cho nhiều Vocabulary cùng lúc (Claude)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return true;
}

async function callDeepSeek(prompt: string): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.warn("[DEEPSEEK_API_KEY] DEEPSEEK_API_KEY not set");
    return null;
  }

const systemPrompt = `Bạn là giáo viên tiếng Trung cho học sinh (HSK1–HSK3) từ Việt Nam.

🎯 Mục tiêu:
Tạo 4–5 câu hỏi trắc nghiệm có ĐỘ TRƯỞNG THÀNH HỢP LÝ, phù hợp với học sinh cấp 3 & đại học, bối cảnh cuộc sống thực tế.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 NGỮ CẢNH HỌC TẬP:
🇻🇳 Người học là học sinh Việt Nam:
- Học tiếng Trung vì thi cử, du học, hoặc sở thích
- Muốn hiểu từ vựng theo thế giới thực, không phải chỉ sách vở
- KHÔNG phải đồng hoá thành người Trung Quốc
- Tôn trọng danh tính và nền tảng văn hoá Việt Nam

👉 Ưu tiên chủ đề phù hợp:
- 🎓 Học tập: lớp học, bài kiểm tra, dự án, thư viện, máy tính
- 📚 Sở thích: đọc sách, phim, âm nhạc, thể thao, nghệ thuật
- 🌍 Thế giới: tin tức, sự kiện, du lịch, ngoại giao
- 💭 Tương lai: nghề nghiệp, đại học, kỹ năng, mục tiêu
- 💻 Công nghệ: smartphone, mạng xã hội, internet
- 🎬 Văn hoá: so sánh Việt-Trung, điện ảnh, âm nhạc, lịch sử
- 🤝 Giao tiếp: bạn bè, gia đình, mối quan hệ, xã hội
- ❌ TRÁNH: trẻ con dưới 10 tuổi, trò chơi em bé, tiểu học

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 **CÁC DẠNG CÂU HỎI (ĐƠN GIẢN):**

Chỉ sử dụng các dạng cơ bản sau:

1️⃣ **MEANING** - Hỏi nghĩa
   Ví dụ: "Từ 考试 nghĩa là gì?"

2️⃣ **PINYIN** - Hỏi phiên âm
   Ví dụ: "从 được phiên âm như thế nào?"

3️⃣ **FILL_IN_BLANK** - Điền từ vào chỗ trống
   Ví dụ: "我喜欢____。(A. 看书  B. 吃饭  C. 睡觉  D. 走路)"

4️⃣ **USAGE/CONTEXT** - Chọn cách dùng đúng / tình huống
   Ví dụ: "Từ 会议 được sử dụng trong tình huống nào?"

5️⃣ **COMPARISON** - So sánh ý nghĩa hai từ
   Ví dụ: "Khác biệt giữa 和 và 或 là gì?"

👉 **Yêu cầu:**
- Chỉ một trong những dạng trên
- Ngắn gọn, không phức tạp
- Học sinh hiểu ngay, không cần suy luận

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ **KHÔNG ĐƯỢC:**
- Không câu hỏi mẹo / đánh đố
- Không ngữ pháp HSK4+ (chỉ HSK1-3)
- Không ví dụ không phù hợp tuổi
- Không nội dung chính trị, bạo lực, tình dục
- Không từ vựng vượt quá khó

👉 **Giữ đơn giản:**
- Câu hỏi rõ ràng, không mơ hồ
- Học sinh hiểu ngay đề hỏi
- Không cần suy luận phức tạp

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ QUY TẮC ĐỘ KHÓ:
- Câu ngắn, rõ nghĩa, tự nhiên
- Tối đa 15 từ tiếng Trung (nếu sử dụng)
- Ngữ pháp cơ bản, không lồng ghép phức tạp
- Học sinh có thể trả lời dựa trên kiến thức & kinh nghiệm

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 **FORMAT (BẮT BUỘC):**
Chỉ trả về JSON array hợp lệ. Không thêm bất kỳ text nào khác.

**VÍ DỤ 1 - Hỏi nghĩa (MEANING):**
{
  "hanzi": "考试",
  "type": "MEANING",
  "questionText": "Từ 考试 nghĩa là gì?",
  "correctAnswer": "Kỳ thi",
  "options": ["Kỳ thi", "Bài tập", "Đáp án", "Sách vở"],
  "explanation": "考试 là kỳ thi, bài kiểm tra.",
  "imageUrl": "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400"
}

**VÍ DỤ 2 - Hỏi phiên âm (PINYIN):**
{
  "hanzi": "从",
  "type": "PINYIN",
  "questionText": "Từ 从 được phiên âm là gì?",
  "correctAnswer": "cóng",
  "options": ["cóng", "công", "cung", "căng"],
  "explanation": "从 phiên âm là cóng, có nghĩa là 'từ'.",
  "imageUrl": "https://..."
}

**VÍ DỤ 3 - Điền từ (FILL_IN_BLANK):**
{
  "hanzi": "吃",
  "type": "FILL_IN_BLANK",
  "questionText": "我想____米饭。(Tôi muốn ____ cơm.)",
  "correctAnswer": "吃",
  "options": ["吃", "喝", "走", "看"],
  "explanation": "吃 có nghĩa là ăn. Đáp án là: 我想吃米饭。",
  "imageUrl": "https://..."
}

**VÍ DỤ 4 - Chọn cách dùng (USAGE):**
{
  "hanzi": "早上",
  "type": "USAGE",
  "questionText": "早上 (sáng sớm) được sử dụng khi nào?",
  "correctAnswer": "Thời gian từ khi thức dậy đến trưa",
  "options": ["Thời gian từ khi thức dậy đến trưa", "Thời gian buổi chiều", "Thời gian buổi tối", "Thời gian buổi đêm"],
  "explanation": "早上 là sáng sớm, từ khi thức dậy đến buổi trưa.",
  "imageUrl": "https://..."
}

**VÍ DỤ 5 - So sánh từ (COMPARISON):**
{
  "hanzi": "和 vs 或",
  "type": "COMPARISON",
  "questionText": "Khác biệt giữa 和 (và) và 或 (hoặc) là gì?",
  "correctAnswer": "和 là 'và', 或 là 'hoặc'",
  "options": ["和 là 'và', 或 là 'hoặc'", "和 là 'hoặc', 或 là 'và'", "Cả hai có ý nghĩa giống nhau", "Cả hai đều sai"],
  "explanation": "和 dùng để nối các sự vật lại với nhau. 或 dùng khi chọn giữa các lựa chọn khác nhau.",
  "imageUrl": "https://..."
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 QUY TẮC CHI TIẾT:

1. options:
- Luôn có đúng 4 đáp án
- 1 đúng, 3 sai nhưng hợp lý
- Các sai lầm phải là những nhầm lẫn thực tế của học sinh
- correctAnswer phải TRÙNG CHÍNH XÁC với 1 option

2. questionText:
- Viết bằng tiếng Việt
- Ngắn, rõ ràng, tự nhiên
- Có bối cảnh cụ thể nếu cần
- Không mơ hồ, không mẹo

3. explanation:
- 1-2 câu ngắn, rõ ràng
- Giải thích đơn giản, không dùng thuật ngữ ngữ pháp phức tạp
- Nếu cần, thêm ghi chú về cách dùng hoặc ngữ cảnh

4. **Nội dung ưu tiên:**
   
   📚 **Từ vựng HSK1-3 quen thuộc:**
   - Học tập: 学生, 老师, 学校, 考试, 书, 作业
   - Gia đình: 妈妈, 爸爸, 哥哥, 妹妹, 家
   - Ăn uống: 米饭, 菜, 水, 吃, 喝
   - Thời gian: 今天, 昨天, 明天, 早上, 晚上
   - Hoạt động: 走, 跑, 坐, 站, 睡觉, 工作
   - Tính từ: 大, 小, 多, 少, 好, 坏, 新, 旧
   - Số & lượng: 一, 二, 三, 十, 百, 个, 支, 只
   - Vị trí: 上, 下, 左, 右, 前, 后, 里, 外

   ❌ **TRÁNH:**
   - Từ vựng HSK4+ quá khó
   - Thành ngữ, tục ngữ
   - Những từ hiếm gặp trong cuộc sống

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🖼️ imageUrl (RẤT QUAN TRỌNG):

- BẮT BUỘC liên quan trực tiếp tới câu hỏi
- Không dùng ảnh random / placeholder
- Phải là link ảnh thật (https)

Ví dụ đúng (cho học sinh):
- 考试 → ảnh học sinh làm bài kiểm tra / sách vở
- 图书馆 → ảnh thư viện trường học
- 学生 → ảnh học sinh trong lớp
- 电脑 → ảnh máy tính / laptop
- 朋友 → ảnh bạn bè nói chuyện
- 运动 → ảnh thể thao / sân chơi
- 旅游 → ảnh du lịch / du khách
- 音乐 → ảnh âm nhạc / người nghe nhạc

Nguồn ảnh:
- unsplash / pexels / pixabay / wikipedia / nguồn công khai

👉 Ảnh phải phù hợp với bối cảnh học sinh, trường học, hoạt động thanh niên

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 **ƯU TIÊN:**
- Đơn giản > phức tạp
- Rõ ràng > mơ hồ
- Dễ hiểu > thông minh
- Từ vựng cơ bản HSK1-3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ **CẤM TUYỆT ĐỐI:**
- Không markdown
- Không text ngoài JSON
- Không thiếu field
- Không sai format JSON
- Không vượt quá HSK3
- Không imageUrl không liên quan
- Không nội dung không phù hợp tuổi

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **LƯU Ý CUỐI:**
- Chọn dạng câu hỏi đơn giản nhất
- Từ vựng HSK1-3 quen thuộc
- Câu hỏi rõ ràng, học sinh hiểu ngay
- Không cần phức tạp hoặc sáng tạo quá
`;

  const requestBody = {
    model: "deepseek-chat",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    max_tokens: 2500,
  };

  console.log("[deepseek Batch] 📤 Sending request with prompt:", prompt);
  console.log("[deepseek Batch] 📤 System prompt length:", systemPrompt.length);

  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[Claude Batch] 📥 Response status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Claude Batch] ❌ API error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    console.log("[deepseek Batch] ✅ Raw response (first 500 chars):", rawContent.slice(0, 500));
    console.log("[deepseek Batch] ✅ Cleaned response (first 500 chars):", cleaned.slice(0, 500));
    console.log("[deepseek Batch] ✅ Full response length:", cleaned.length);

    return cleaned;
  } catch (err) {
    console.error("[Claude Batch] ❌ Request error:", err);
    return null;
  }
}

// ─── Save a single question to DB ─────────────────────────────────────────────

// Map AI type label → Prisma QuestionType enum
const QUESTION_TYPES = [
  "MULTIPLE_CHOICE", "FILL_BLANK", "MATCHING",
  "WORD_ORDER", "FREE_WRITE", "TRANSLATION", "SPEAKING", "LISTENING",
] as const;
type QuestionTypeEnum = typeof QUESTION_TYPES[number];

const AI_TYPE_MAP: Record<string, QuestionTypeEnum> = {
  MEANING:  "MULTIPLE_CHOICE",
  USAGE:    "MULTIPLE_CHOICE",
  SYNONYM:  "MULTIPLE_CHOICE",
  PINYIN:   "MULTIPLE_CHOICE",
};

function mapQuestionType(type: string | undefined): QuestionTypeEnum {
  if (!type) return "MULTIPLE_CHOICE";
  return AI_TYPE_MAP[type.toUpperCase()] ?? "MULTIPLE_CHOICE";
}

async function upsertQuestion(vocab: {
  id: string;
  hanzi: string;
  pinyin: string | null;
  meaningVi: string;
  hskLevel: string;
}, q: any) {
  const options = Array.isArray(q.options) ? q.options.slice(0, 4) : [vocab.meaningVi];
  while (options.length < 4) options.push("Một nghĩa khác");

  // const imageUrl = q.imageUrl && typeof q.imageUrl === "string" && q.imageUrl.startsWith("http")
  //   ? q.imageUrl
  //   : `https://picsum.photos/seed/${encodeURIComponent(vocab.hanzi)}/400/300`;

    const imageUrl = q.imageUrl && typeof q.imageUrl === "string" && q.imageUrl.startsWith("http")
  ? q.imageUrl
  : await getWikimediaImage(vocab.hanzi, vocab.meaningVi);

  // const imageUrl = await getWikimediaImage(vocab.hanzi, vocab.meaningVi);


  const hskNum = parseInt(String(vocab.hskLevel).replace("HSK", "")) || 1;
  const questionType = mapQuestionType(q.type);

  return prisma.aiQuestion.upsert({
    where: {
      vocabularyId_questionText: {
        vocabularyId: vocab.id,
        questionText: q.questionText,
      },
    },
    update: {
      questionText:   q.questionText,
      correctAnswer:  q.correctAnswer ?? vocab.meaningVi,
      options,
      hskLevel:      hskNum,
      type:          questionType,
      explanation:   q.explanation ?? `${vocab.hanzi} = ${vocab.meaningVi}`,
      imageUrl,
      status:        "pending",
      generatedBy:   "Claude",
    },
    create: {
      vocabularyId:   vocab.id,
      questionText:   q.questionText,
      correctAnswer:  q.correctAnswer ?? vocab.meaningVi,
      options,
      hskLevel:      hskNum,
      type:          questionType,
      explanation:   q.explanation ?? `${vocab.hanzi} = ${vocab.meaningVi}`,
      imageUrl,
      generatedBy:   "Claude",
    },
  });
}

// ─── Fallback local question ─────────────────────────────────────────────────
async function generateLocalFallback(vocab: {
  id: string;
  hanzi: string;
  pinyin: string | null;
  meaningVi: string;
  hskLevel: string;
}) {
  const levelMap: Record<string, "HSK1"|"HSK2"|"HSK3"|"HSK4"|"HSK5"|"HSK6"> = {
    HSK1:"HSK1",HSK2:"HSK2",HSK3:"HSK3",HSK4:"HSK4",HSK5:"HSK5",HSK6:"HSK6",
  };
  const level = levelMap[String(vocab.hskLevel)] ?? "HSK1";

  const fakes = await prisma.vocabulary.findMany({
    where: { hskLevel: level, meaningVi: { not: vocab.meaningVi } },
    select: { meaningVi: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  const fakeOpts = fakes.map((f) => f.meaningVi).sort(() => Math.random() - 0.5).slice(0, 3);
  while (fakeOpts.length < 3) fakeOpts.push("Một nghĩa khác");
  const options = [vocab.meaningVi, ...fakeOpts].sort(() => Math.random() - 0.5);

  return upsertQuestion(vocab, {
    questionText: `Nghĩa của từ "${vocab.hanzi}" là gì?`,
    correctAnswer: vocab.meaningVi,
    options,
    type: "MULTIPLE_CHOICE",
    explanation: `${vocab.hanzi} (${vocab.pinyin ?? ""}) = ${vocab.meaningVi}`,
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(vocab.hanzi)}/400/300`,
  });
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vocabularyIds } = await req.json();

  if (!vocabularyIds || !Array.isArray(vocabularyIds) || vocabularyIds.length === 0) {
    return NextResponse.json({ error: "Cần cung cấp vocabularyIds[]" }, { status: 400 });
  }

  const vocabularies = await prisma.vocabulary.findMany({
    where: { id: { in: vocabularyIds } },
    select: { id: true, hanzi: true, pinyin: true, meaningVi: true, hskLevel: true, wordType: true, exampleSentence: true },
  });

  if (vocabularies.length === 0) {
    return NextResponse.json({ error: "Không tìm thấy từ vựng nào" }, { status: 400 });
  }

  console.log("[Claude Batch] 📥 Starting batch for", vocabularies.length, "words:", vocabularies.map(v => v.hanzi));

  const results: { vocabularyId: string; hanzi: string; savedCount: number; questions?: any[]; error?: string }[] = [];
  const maxPerBatch = 10;
  const batches: typeof vocabularies[] = [];

  for (let i = 0; i < vocabularies.length; i += maxPerBatch) {
    batches.push(vocabularies.slice(i, i + maxPerBatch));
  }

  console.log("[Claude Batch] 📦 Total batches:", batches.length);

  // Process each batch
  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(`[Claude Batch] 🔄 Processing batch ${batchIdx + 1}/${batches.length}:`, batch.map(v => v.hanzi));

    const prompt = `Tạo câu hỏi trắc nghiệm cho ${batch.length} từ vựng sau:\n` +
      batch.map((v) =>
        `- Chữ: ${v.hanzi} | Pinyin: ${v.pinyin ?? "?"} | Nghĩa: ${v.meaningVi} | Loại: ${v.wordType ?? "?"}`
      ).join("\n");

    console.log("[Claude Batch] 📝 Prompt:", prompt);

    const raw = await callDeepSeek(prompt);
    let parsed: any[] = [];

    if (raw) {
      try {
        parsed = JSON.parse(raw);
        console.log("[Claude Batch] ✅ Parsed questions count:", parsed.length);
        console.log("[Claude Batch] ✅ Questions by hanzi:", parsed.map(q => ({ hanzi: q.hanzi, type: q.type, questionText: q.questionText?.slice(0, 40) })));
      } catch (e) {
        console.error("[Claude Batch] ❌ JSON parse failed:", raw.slice(0, 300));
      }
    } else {
      console.warn("[Claude Batch] ⚠️ Claude returned null for batch", batchIdx + 1);
    }

    // Save each question for each vocabulary word
    for (const vocab of batch) {
      // Get ALL questions for this vocab from Claude response (all 4 types)
      const vocabQuestions = parsed.filter((p: any) => p.hanzi === vocab.hanzi);

      console.log(`[Claude Batch] 📊 For "${vocab.hanzi}": found ${vocabQuestions.length} questions from Claude (expected 4)`, vocabQuestions.map(q => q.type));

      if (vocabQuestions.length > 0) {
        // Save all questions from Claude
        const saved: any[] = [];
        for (const q of vocabQuestions) {
          if (!q.questionText) {
            console.warn(`[Claude Batch] ⚠️ Skipping question with no questionText for ${vocab.hanzi}:`, q);
            continue;
          }
          const savedQ = await upsertQuestion(vocab, q);
          saved.push(savedQ);
          console.log(`[Claude Batch] ✅ Saved: ${vocab.hanzi} [${q.type}] → "${q.questionText?.slice(0, 40)}"`);
        }
        results.push({
          vocabularyId: vocab.id,
          hanzi: vocab.hanzi,
          savedCount: saved.length,
          questions: saved.map(q => ({ type: q.type, questionText: q.questionText?.slice(0, 40) })),
        });
      } else {
        // Fallback: tạo câu hỏi cục bộ
        console.log(`[Claude Batch] ⚡ Fallback for "${vocab.hanzi}"`);
        await generateLocalFallback(vocab);
        results.push({
          vocabularyId: vocab.id,
          hanzi: vocab.hanzi,
          savedCount: 1,
          questions: [{ type: "MULTIPLE_CHOICE", questionText: `Nghĩa của từ "${vocab.hanzi}" là gì?`, generatedBy: "fallback" }],
        });
      }
    }
  }

  const totalSaved = results.reduce((sum, r) => sum + r.savedCount, 0);
  console.log(`[Claude Batch] ✅ Batch complete. Total questions saved: ${totalSaved}`);

  return NextResponse.json({
    message: `Đã tạo ${totalSaved} câu hỏi cho ${results.length} từ`,
    results,
  });
}

async function getWikimediaImage(hanzi: string, meaningVi: string): Promise<string> {
  try {
    const searchTerm = hanzi; // Tìm bằng hanzi
    const res = await fetch(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=allimages&aisort=timestamp&aidir=descending&ailimit=1&aifrom=${encodeURIComponent(searchTerm)}`
    );
    const data = await res.json();
    if (data.query?.allimages?.[0]?.url) {
      return data.query.allimages[0].url;
    }
  } catch (e) {
    console.warn("[Image] Wikimedia lookup failed for", hanzi);
  }
  return `https://picsum.photos/seed/${encodeURIComponent(hanzi)}/400/300`;
}