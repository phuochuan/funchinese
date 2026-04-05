// src/app/api/admin/ai-questions/generate/route.ts
// POST — AI tạo câu hỏi cho một Vocabulary word (dùng Claude API)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ─── Auth helper ─────────────────────────────────────────────────────────────
async function requireTeacher() {
  const session = await auth();
  if (!session?.user?.keycloakId || session.user.role !== "teacher") return null;
  return true;
}

// ─── Call Claude API ───────────────────────────────────────────────────────
async function callClaude(prompt: string): Promise<string | null> {
  const apiKey = process.env.Claude_API_KEY;
  if (!apiKey) {
    console.warn("[Claude] Claude_API_KEY not set");
    return null;
  }

  const body = {
    model: "Claude-chat",
    messages: [
      {
        role: "system",
        content: `Bạn là giáo viên tiếng Trung chuyên nghiệp. Tạo câu hỏi trắc nghiệm HSK kèm hình ảnh minh hoạ.
Trả lời CHỈ bằng JSON hợp lệ, KHÔNG có markdown, KHÔNG có giải thích gì thêm.
Format:
{
  "questionText": "Nghĩa của từ '{{hanzi}}' là gì?",
  "correctAnswer": "nghĩa_chính_xác",
  "options": ["đáp án đúng", "sai 1", "sai 2", "sai 3"],
  "explanation": "Giải thích ngắn bằng tiếng Việt",
  "imageUrl": "https://picsum.photos/seed/word/400/300"
}
Quy tắc:
- options: đúng 4 đáp án, mỗi dưới 25 ký tự, cùng loại từ/cùng HSK level
- correctAnswer phải trùng EXACT 1 trong 4 options
- questionText & explanation bằng tiếng Việt
- imageUrl: dùng https://picsum.photos/seed/{keyword}/400/300 để lấy ảnh minh hoạ phù hợp`,
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 400,
  };

  console.log("[Claude] 📤 Sending request:", JSON.stringify(body, null, 2));

  try {
    const res = await fetch("https://api.Claude.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    console.log("[Claude] 📥 Response status:", res.status);

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Claude] ❌ API error:", res.status, errText);
      return null;
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim() ?? "";
    const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    console.log("[Claude] ✅ Raw response:", rawContent);
    console.log("[Claude] ✅ Cleaned response:", cleaned);

    return cleaned;
  } catch (err) {
    console.error("[Claude] ❌ Request error:", err);
    return null;
  }
}

// ─── Fallback local generation ───────────────────────────────────────────────
async function generateLocally(
  hanzi: string,
  pinyin: string,
  meaningVi: string,
  hskLevel: number
) {
  const levelMap: Record<number, "HSK1"|"HSK2"|"HSK3"|"HSK4"|"HSK5"|"HSK6"> = {
    1: "HSK1", 2: "HSK2", 3: "HSK3", 4: "HSK4", 5: "HSK5", 6: "HSK6",
  };
  const level = levelMap[hskLevel] ?? "HSK1";

  const fakes = await prisma.vocabulary.findMany({
    where: { hskLevel: level, meaningVi: { not: meaningVi } },
    select: { meaningVi: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const fakeOptions = fakes
    .map((f) => f.meaningVi)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  while (fakeOptions.length < 3) fakeOptions.push("Một nghĩa khác");

  const options = [meaningVi, ...fakeOptions].slice(0, 4);
  options.sort(() => Math.random() - 0.5);

  const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(hanzi)}/400/300`;

  return {
    questionText: `Nghĩa của từ "${hanzi}" là gì?`,
    correctAnswer: meaningVi,
    options,
    explanation: `${hanzi} (${pinyin}) có nghĩa là ${meaningVi}.`,
    imageUrl,
  };
}

// ─── POST — Generate cho 1 vocabulary ───────────────────────────────────────
export async function POST(req: NextRequest) {
  const ok = await requireTeacher();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { vocabularyId, hanzi, pinyin, meaningVi, hskLevel, wordType, exampleSentence } = body;

  console.log("[AI Generate] 📥 Input:", { vocabularyId, hanzi, pinyin, meaningVi, hskLevel });

  if (!hanzi || !meaningVi) {
    return NextResponse.json({ error: "Thiếu hanzi hoặc meaningVi" }, { status: 400 });
  }

  const level = parseInt(hskLevel ?? "1");

  // ── 1. Gọi Claude ──
  const prompt = `Tạo câu hỏi cho từ:
- Chữ Hán: ${hanzi}
- Pinyin: ${pinyin ?? "?"}
- Nghĩa tiếng Việt: ${meaningVi}
- Loại từ: ${wordType ?? "không xác định"}
${exampleSentence ? `- Ví dụ: ${exampleSentence}` : ""}`;

  let parsed: any = null;
  const raw = await callClaude(prompt);

  if (raw) {
    try {
      parsed = JSON.parse(raw);
      console.log("[AI Generate] ✅ Parsed JSON:", parsed);
    } catch (e) {
      console.error("[AI Generate] ❌ JSON parse failed:", raw);
    }
  } else {
    console.warn("[AI Generate] ⚠️ Claude returned null — will use fallback");
  }

  // ── 2. Build question object ──
  let q: {
    questionText: string;
    correctAnswer: string;
    options: string[];
    explanation: string;
    imageUrl: string | null;
  };

  if (parsed?.questionText) {
    const imageUrl = parsed.imageUrl && typeof parsed.imageUrl === "string" && parsed.imageUrl.startsWith("http")
      ? parsed.imageUrl
      : null;

    q = {
      questionText:   parsed.questionText,
      correctAnswer:  parsed.correctAnswer ?? meaningVi,
      options:       Array.isArray(parsed.options) ? parsed.options.slice(0, 4) : [meaningVi],
      explanation:   parsed.explanation ?? `${hanzi} (${pinyin}) = ${meaningVi}`,
      imageUrl,
    };
    console.log("[AI Generate] ✅ Using Claude question:", q);
  } else {
    console.log("[AI Generate] ⚡ Using local fallback");
    const local = await generateLocally(hanzi, pinyin ?? "", meaningVi, level);
    q = local;
  }

  // Ensure 4 options
  while (q.options.length < 4) q.options.push("Một nghĩa khác");
  q.options = q.options.slice(0, 4);

  // ── 3. Upsert AiQuestion ──
  console.log("[AI Generate] 💾 Upserting question:", { questionText: q.questionText, correctAnswer: q.correctAnswer });

  const question = await prisma.aiQuestion.upsert({
    where: {
      vocabularyId_questionText: {
        vocabularyId,
        questionText: q.questionText,
      },
    },
    update: {
      questionText:   q.questionText,
      correctAnswer:  q.correctAnswer,
      options:        q.options,
      hskLevel:       level,
      type:           "MULTIPLE_CHOICE",
      explanation:    q.explanation,
      imageUrl:       q.imageUrl,
      status:         "pending",
      updatedAt:      new Date(),
    },
    create: {
      vocabularyId,
      questionText:   q.questionText,
      correctAnswer:  q.correctAnswer,
      options:        q.options,
      hskLevel:       level,
      type:           "MULTIPLE_CHOICE",
      explanation:    q.explanation,
      imageUrl:       q.imageUrl,
      status:         "pending",
      generatedBy:    parsed ? "Claude" : "fallback",
    },
  });

  console.log("[AI Generate] ✅ Done, question id:", question.id);
  return NextResponse.json({ question }, { status: 201 });
}
