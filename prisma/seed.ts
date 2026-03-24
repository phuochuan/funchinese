import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Teacher
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@funchinese.vn" },
    update: {},
    create: {
      email:      "teacher@funchinese.vn",
      name:       "Cô Tiên",
      role:       "teacher",
      xp:         9999,
      level:      "Kim Cương",
      streakDays: 30,
    },
  });

  // 2. Student
  const student = await prisma.user.upsert({
    where: { email: "student@funchinese.vn" },
    update: {},
    create: {
      email:      "student@funchinese.vn",
      name:       "Minh Hạnh",
      role:       "student",
      xp:         1240,
      level:      "Bạc",
      streakDays: 12,
      lastStudyDate: new Date(),
    },
  });

  // 3. Class
  const cls = await prisma.class.upsert({
    where: { joinCode: "HSK2A" },
    update: {},
    create: {
      name:      "Lớp HSK2 Tối",
      joinCode:  "HSK2A",
      teacherId: teacher.id,
      scheduleNote: "T2, T4 19:30",
    },
  });

  // Add student to class
  await prisma.classMember.upsert({
    where: { classId_userId: { classId: cls.id, userId: student.id } },
    update: {},
    create: { classId: cls.id, userId: student.id },
  });

  // 4. Course
  const course = await prisma.course.upsert({
    where: { id: "course-hsk2" },
    update: {},
    create: {
      id:          "course-hsk2",
      title:       "HSK 2 - Giao tiếp cơ bản",
      hskLevel:    "HSK2",
      isPublished: true,
    },
  });

  // 5. Chapter + Lesson
  const chapter = await prisma.chapter.upsert({
    where: { id: "chapter-1" },
    update: {},
    create: {
      id:        "chapter-1",
      courseId:  course.id,
      title:     "Chủ đề: Gia đình",
      sortOrder: 1,
    },
  });

  const lesson = await prisma.lesson.upsert({
    where: { id: "lesson-12" },
    update: {},
    create: {
      id:           "lesson-12",
      chapterId:    chapter.id,
      title:        "Bài 12: Gia đình & Họ hàng",
      titleChinese: "我的家庭",
      pinyin:       "Wǒ de jiātíng",
      sortOrder:    12,
      isPublished:  true,
    },
  });

  // Lesson progress (đang học dở)
  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: student.id, lessonId: lesson.id } },
    update: {},
    create: {
      userId:      student.id,
      lessonId:    lesson.id,
      completed:   false,
      lastViewedAt: new Date(),
    },
  });

  // 6. Vocabulary
  const vocabData = [
    { hanzi: "家庭", pinyin: "jiātíng",   hanViet: "Gia đình", meaningVi: "Gia đình" },
    { hanzi: "父亲", pinyin: "fùqīn",     hanViet: "Phụ thân", meaningVi: "Cha (trang trọng)" },
    { hanzi: "母亲", pinyin: "mǔqīn",     hanViet: "Mẫu thân", meaningVi: "Mẹ (trang trọng)" },
    { hanzi: "学习", pinyin: "xuéxí",     hanViet: "Học tập",  meaningVi: "Học tập / Học hành" },
    { hanzi: "朋友", pinyin: "péngyǒu",   hanViet: "Bằng hữu", meaningVi: "Bạn bè" },
    { hanzi: "工作", pinyin: "gōngzuò",   hanViet: "Công tác", meaningVi: "Công việc / Làm việc" },
    { hanzi: "今天", pinyin: "jīntiān",   hanViet: "Kim thiên", meaningVi: "Hôm nay" },
    { hanzi: "明天", pinyin: "míngtiān",  hanViet: "Minh thiên", meaningVi: "Ngày mai" },
  ];

  for (const v of vocabData) {
    const vocab = await prisma.vocabulary.upsert({
      where: { id: `vocab-${v.hanzi}` },
      update: {},
      create: { id: `vocab-${v.hanzi}`, ...v, hskLevel: "HSK2" },
    });

    await prisma.userVocabulary.upsert({
      where: { userId_vocabularyId: { userId: student.id, vocabularyId: vocab.id } },
      update: {},
      create: { userId: student.id, vocabularyId: vocab.id, timesCorrect: 3 },
    });
  }

  // 7. Assignments
  const asgn1 = await prisma.assignment.upsert({
    where: { id: "asgn-1" },
    update: {},
    create: {
      id:       "asgn-1",
      classId:  cls.id,
      title:    "Luyện dịch đoạn văn: Du lịch Bắc Kinh",
      deadline: new Date(Date.now() + 12 * 3600000), // 12 tiếng nữa
    },
  });

  await prisma.assignment.upsert({
    where: { id: "asgn-2" },
    update: {},
    create: {
      id:       "asgn-2",
      classId:  cls.id,
      title:    "Quiz Ngữ pháp: Câu chữ 'Bǎ' (把)",
      deadline: new Date(Date.now() + 4 * 24 * 3600000), // 4 ngày nữa
    },
  });

  await prisma.assignment.upsert({
    where: { id: "asgn-3" },
    update: {},
    create: {
      id:       "asgn-3",
      classId:  cls.id,
      title:    "Phát âm: Âm cuốn lưỡi 'er'",
      deadline: new Date(Date.now() + 5 * 24 * 3600000), // 5 ngày nữa
    },
  });

  // 8. Daily activity (7 ngày gần nhất)
  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    if (i % 2 === 0) continue; // Bỏ vài ngày để trông thực tế
    await prisma.dailyActivity.upsert({
      where: { userId_date: { userId: student.id, date } },
      update: {},
      create: { userId: student.id, date, xpEarned: 20 + i * 5, wordsLearned: 5 },
    });
  }

  // 9. Notification
  await prisma.notification.create({
    data: {
      userId: student.id,
      type:   "new_assignment",
      title:  "Bài tập mới từ cô Lan",
      body:   "Luyện dịch đoạn văn: Du lịch Bắc Kinh — Hạn nộp hôm nay",
      link:   "/home/student/assignments/asgn-1",
    },
  }).catch(() => {}); // Ignore duplicate

  console.log("✅ Seed done!");
  console.log(`   Teacher: ${teacher.email}`);
  console.log(`   Student: ${student.email}`);
  console.log(`   Class:   ${cls.name} (code: ${cls.joinCode})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
