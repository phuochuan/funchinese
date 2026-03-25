# 📘 Practice by Level – Feature Documentation

## 1. 🎯 Overview
The **Practice by Level** feature allows students to practice multiple-choice questions based on their current learning level, within a user-selected time limit. The system enforces time constraints and automatically submits the session when time expires.

---

## 2. 👥 Actors
- **Student**: participates in practice sessions  
- **Admin/Teacher**: manages and imports question data  

---

## 3. 📊 Core Entities

### Question
- Content (text)
- Level (difficulty)
- List of answers (multiple choice)
- Exactly one correct answer
- Audio (optional)

---

### Practice Session
- User
- Level
- Question set (immutable snapshot)
- `startedAt` (start time)
- `expiresAt` (end time)
- `durationSelected` (user-selected duration)
- Status:
  - `doing`
  - `submitted`
  - `expired`

---

## 4. 🔄 Business Flow

### 4.1 Start Practice

**Trigger:**  
Student clicks “Practice by Level”

**Input:**
- Selected duration (minutes)

**Process:**
1. Determine the student’s highest level  
2. Validate duration:
   - Minimum: 5 minutes  
   - Maximum (optional): e.g. 30 minutes  
3. Retrieve questions by level  
4. Randomly select a fixed number of questions  
5. Create a session:
   - `startedAt = now`
   - `expiresAt = now + durationSelected`

**Output:**
- Question list
- Remaining time

---

### 4.2 During Practice

- Student selects answers
- Audio playback available (if exists)
- Countdown timer is displayed

---

### 4.3 Finish Practice

#### Case 1: Manual Submit
- Validate session is still active
- Calculate score
- Save results
- Update status → `submitted`

---

#### Case 2: Time Expired (Auto Submit)
- When `now >= expiresAt`:
  - System auto-submits the session
  - Only answered questions are counted
  - Unanswered questions are marked incorrect
  - Status → `expired`

---

## 5. ⏱️ Time Rules

- Duration is selected by user (≥ 5 minutes)
- Backend is the single source of truth for time
- Duration cannot be changed after session starts
- Submissions after expiration are not allowed

---

## 6. 🧠 Scoring Rules

- Each question:
  - Correct → +1 point  
  - Incorrect / unanswered → 0 point  
- Total score = sum of correct answers

---

## 7. 🔒 System Rules

- Each session can only be submitted once  
- Question set is immutable after session creation  
- Do not trust frontend data (time, answers)  
- Expired sessions must be handled (auto submit)  

---

## 8. 📥 Question Import (Admin)

### Requirements:
- Question content
- Level
- At least 2 answers
- Exactly 1 correct answer

---

### Audio Support:
- Optional
- Supported methods:
  - File upload
  - Auto generation (Text-to-Speech)

---

## 9. ⚠️ Edge Cases

- Not enough questions for a level  
  → fallback to lower level or return error  

- Page reload  
  → resume current session  

- User exits mid-session  
  → session continues until expiration  

- User does not submit  
  → auto submit when time expires  

- Multiple tabs  
  → share the same session  

---

## 10. 🎯 Gameplay Rules

- Number of questions: fixed per session  
- Duration: user-selected  

**Purpose:**  
- Flexible learning experience  
- Not designed for competitive exams  

---

## 11. 🚀 Future Enhancements

- Leaderboard  
- Daily challenges  
- Adaptive difficulty  
- Performance analytics  

---

## ✅ Summary
A level-based practice system with:
- Flexible time selection  
- Fixed question set  
- Strict time enforcement  
- Automatic submission on timeout  