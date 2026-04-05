
[-] Removed enums
  - Role
  - HskLevel
  - QuestionType
  - SessionStatus
  - AssignType
  - SubmissionStatus
  - Gender

[-] Removed tables
  - users
  - classes
  - class_members
  - class_lessons
  - courses
  - chapters
  - lessons
  - vocabulary
  - lesson_vocabulary
  - user_vocabulary
  - lesson_progress
  - assignments
  - assignment_assignees
  - questions
  - question_vocab
  - assignment_questions
  - submissions
  - grades
  - quiz_sessions
  - badges
  - user_badges
  - daily_activity
  - notifications
  - class_schedules
  - class_sessions
  - hsk_questions
  - PracticeSession
  - user_profiles
  - app_settings

[*] Changed the `assignment_assignees` table
  [-] Removed foreign key on columns (assignmentId)
  [-] Removed foreign key on columns (userId)

[*] Changed the `assignment_questions` table
  [-] Removed foreign key on columns (assignmentId)
  [-] Removed foreign key on columns (questionId)

[*] Changed the `assignments` table
  [-] Removed foreign key on columns (classId)

[*] Changed the `chapters` table
  [-] Removed foreign key on columns (courseId)

[*] Changed the `class_lessons` table
  [-] Removed foreign key on columns (classId)
  [-] Removed foreign key on columns (lessonId)

[*] Changed the `class_members` table
  [-] Removed foreign key on columns (classId)
  [-] Removed foreign key on columns (userId)

[*] Changed the `class_schedules` table
  [-] Removed foreign key on columns (classId)

[*] Changed the `class_sessions` table
  [-] Removed foreign key on columns (scheduleId)
  [-] Removed foreign key on columns (classId)

[*] Changed the `classes` table
  [-] Removed foreign key on columns (courseId)

[*] Changed the `daily_activity` table
  [-] Removed foreign key on columns (userId)

[*] Changed the `grades` table
  [-] Removed foreign key on columns (submissionId)
  [-] Removed foreign key on columns (teacherId)

[*] Changed the `lesson_progress` table
  [-] Removed foreign key on columns (userId)
  [-] Removed foreign key on columns (lessonId)

[*] Changed the `lesson_vocabulary` table
  [-] Removed foreign key on columns (lessonId)
  [-] Removed foreign key on columns (vocabularyId)

[*] Changed the `lessons` table
  [-] Removed foreign key on columns (chapterId)

[*] Changed the `notifications` table
  [-] Removed foreign key on columns (userId)

[*] Changed the `question_vocab` table
  [-] Removed foreign key on columns (questionId)
  [-] Removed foreign key on columns (vocabularyId)

[*] Changed the `quiz_sessions` table
  [-] Removed foreign key on columns (userId)

[*] Changed the `submissions` table
  [-] Removed foreign key on columns (assignmentId)
  [-] Removed foreign key on columns (userId)

[*] Changed the `user_badges` table
  [-] Removed foreign key on columns (userId)
  [-] Removed foreign key on columns (badgeId)

[*] Changed the `user_profiles` table
  [-] Removed foreign key on columns (userId)

[*] Changed the `user_vocabulary` table
  [-] Removed foreign key on columns (userId)
  [-] Removed foreign key on columns (vocabularyId)
