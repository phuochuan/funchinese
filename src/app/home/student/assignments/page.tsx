"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface AssignmentCard {
  submissionId: string; assignmentId: string; title: string;
  className: string; deadline: string | null; diffHrs: number | null;
  status: string; passed: boolean | null; score: number | null;
  reassign: boolean; attempt: number; maxAttempts: number; xpReward: number;
}
interface Stats { pending: number; submitted: number; graded: number; }

const ICON_MAP: Record<string, string> = {
  DRAFT: "edit", SUBMITTED: "hourglass_top",
  GRADED: "task_alt", REASSIGNED: "refresh",
};

// 100 Philosopher Quotes to Encourage Learning
// Each quote includes: text (Vietnamese), author, country, and original text (for foreign authors)

export const PHILOSOPHER_QUOTES = [
  // 1-10
  {
    text: "Giáo dục là nền tảng vững chắc nhất của tự do.",
    author: "Thomas Jefferson",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Education is the most powerful weapon which you can use to change the world."
  },
  {
    text: "Học hỏi là kho tàng mà sẽ theo bạn ở khắp nơi.",
    author: "Thomas Jefferson",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Learning is a treasure that will follow its owner everywhere."
  },
  {
    text: "Những con đường vào trong trí tuệ chỉ có thể được phát hiện thông qua sự chăm chỉ học hỏi.",
    author: "Immanuel Kant",
    country: "🇩🇪 Đức",
    flag: "🇩🇪",
    original: "Knowledge is power."
  },
  {
    text: "Tôi không bao giờ dạy học sinh của tôi; tôi chỉ cố gắng tạo ra các điều kiện mà họ có thể học.",
    author: "Albert Einstein",
    country: "🇩🇪 Đức",
    flag: "🇩🇪",
    original: "I never teach my pupils. I only attempt to provide the conditions in which they can learn."
  },
  {
    text: "Trí tuệ không phải là những gì bạn biết, mà là khả năng học hỏi.",
    author: "Albert Einstein",
    country: "🇩🇪 Đức",
    flag: "🇩🇪",
    original: "Imagination is more important than knowledge."
  },
  {
    text: "Hãy học để sống, không phải sống để học.",
    author: "Francis Bacon",
    country: "🇬🇧 Anh",
    flag: "🇬🇧",
    original: "Knowledge itself is power."
  },
  {
    text: "Sự yếu đuối duy nhất là việc từ bỏ học tập.",
    author: "Socrates",
    country: "🇬🇷 Hy Lạp",
    flag: "🇬🇷",
    original: "The only true wisdom is knowing you know nothing."
  },
  {
    text: "Một người không bao giờ quá già để học hỏi.",
    author: "Rosalind Russell",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "You're never too old to learn something new."
  },
  {
    text: "Học tập là một quà tặng dù kẻ thù cũng không thể lấy đi.",
    author: "B.B. King",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Education is a gift - even an enemy cannot take it away."
  },
  {
    text: "Cuộc sống của mọi người đều là một bài học cho những người khác.",
    author: "Voltaire",
    country: "🇫🇷 Pháp",
    flag: "🇫🇷",
    original: "The perfect is the enemy of the good."
  },
  
  // 11-20
  {
    text: "Học tập không có điểm kết thúc mà chỉ có sự tiến bộ liên tục.",
    author: "Paulo Coelho",
    country: "🇧🇷 Brazil",
    flag: "🇧🇷",
    original: "Learning never exhausts the mind."
  },
  {
    text: "Sách là những người bạn im lặng nhưng trung thành nhất.",
    author: "Charles W. Eliot",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Books are the quietest and most constant of friends."
  },
  {
    text: "Hãy sáng tạo, đừng chỉ học để lặp lại.",
    author: "John Dewey",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Education is not the filling of a pail, but the lighting of a fire."
  },
  {
    text: "Những người thành công là những người chưa bao giờ ngừng học hỏi.",
    author: "Tony Robbins",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Success is not just about what you accomplish in your life, it's about what you inspire others to do."
  },
  {
    text: "Mỗi một ngày không học tập là một ngày bị lãng phí.",
    author: "Thomas Jefferson",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "An investment in knowledge pays the best interest."
  },
  {
    text: "Học hỏi là cách duy nhất để tiến bộ trong cuộc sống.",
    author: "Plato",
    country: "🇬🇷 Hy Lạp",
    flag: "🇬🇷",
    original: "The direction in which education starts a man will determine his future life."
  },
  {
    text: "Những kỹ năng mới mở ra những cánh cửa mới.",
    author: "Oprah Winfrey",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "You get in life what you have the courage to ask for."
  },
  {
    text: "Học tập là một hành trình, không phải đích đến.",
    author: "Malcolm X",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
  },
  {
    text: "Tri thức là vô tận, sự tò mò cũng vậy.",
    author: "Leonardo da Vinci",
    country: "🇮🇹 Ý",
    flag: "🇮🇹",
    original: "Learning never exhausts the mind."
  },
  {
    text: "Những người đầu tiên cất bước lên phía trước là những người dũng cảm học hỏi.",
    author: "Benjamin Franklin",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "An investment in knowledge pays the best interest."
  },

  // 21-30
  {
    text: "Sự khác biệt giữa những người thành công và những người khác là sự sẵn sàng học hỏi.",
    author: "Michael Jordan",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "I have missed more than 9,000 shots in my career. I have lost almost 300 games."
  },
  {
    text: "Học tập là quá trình khám phá chính bản thân mình.",
    author: "James Baldwin",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Not everything that is faced can be changed, but nothing can be changed until it is faced."
  },
  {
    text: "Những câu hỏi của bạn thể hiện sự tò mò, sự tò mò thúc đẩy tiến bộ.",
    author: "Neil deGrasse Tyson",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Science is not only a disciple of reason but also of romance and passion."
  },
  {
    text: "Hãy đọc sách như người đã chết sắp viết.",
    author: "C.S. Lewis",
    country: "🇬🇧 Anh",
    flag: "🇬🇧",
    original: "You can never get a cup of tea large enough or a book long enough to suit me."
  },
  {
    text: "Những người học hỏi nhiều nhất là những người có tâm trí cởi mở nhất.",
    author: "Aristotle",
    country: "🇬🇷 Hy Lạp",
    flag: "🇬🇷",
    original: "Education is the most powerful weapon which you can use to change the world."
  },
  {
    text: "Thất bại là bài học tốt nhất trên con đường học hỏi.",
    author: "Oprah Winfrey",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Turn your wounds into wisdom."
  },
  {
    text: "Hôm nay bạn học một thứ, ngày mai bạn sẽ hiểu nó tốt hơn.",
    author: "Nelson Mandela",
    country: "🇿🇦 Nam Phi",
    flag: "🇿🇦",
    original: "Education is the most powerful weapon which you can use to change the world."
  },
  {
    text: "Những người khôn ngoan luôn sẵn sàng thừa nhận rằng họ không biết.",
    author: "Confucius",
    country: "🇨🇳 Trung Quốc",
    flag: "🇨🇳",
    original: "When you know a thing, to hold that you know it; and when you do not know a thing, to allow that you do not know it - this is knowledge."
  },
  {
    text: "Học tập mỗi ngày, tiến bộ từng bước.",
    author: "Lao Tzu",
    country: "🇨🇳 Trung Quốc",
    flag: "🇨🇳",
    original: "The journey of a thousand miles begins with a single step."
  },
  {
    text: "Những ý tưởng vĩ đại bắt đầu từ sự sáng suốt trong học tập.",
    author: "Steve Jobs",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The only way to do great work is to love what you do."
  },

  // 31-40
  {
    text: "Cuộc sống là bài học dài nhất, chúng ta phải học hỏi từng ngày.",
    author: "Maya Angelou",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "There is no greater agony than bearing an untold story inside you."
  },
  {
    text: "Hãy học những thứ bạn yêu thích, thành công sẽ theo sau.",
    author: "Steve Jobs",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Stay hungry. Stay foolish."
  },
  {
    text: "Tất cả các nhà lãnh đạo vĩ đại đều là những người học hỏi liên tục.",
    author: "Bill Gates",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Don't compare yourself with anyone in this world if you do so, you are insulting yourself."
  },
  {
    text: "Học tập là cách để cải thiện bản thân mỗi ngày.",
    author: "Jim Rohn",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Success is not final, failure is not fatal: it is the courage to continue that counts."
  },
  {
    text: "Những câu hỏi tốt dẫn đến những câu trả lời tuyệt vời.",
    author: "Tony Robbins",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Whatever happens, take responsibility."
  },
  {
    text: "Hôm nay bạn đọc, ngày mai bạn sẽ lãnh đạo.",
    author: "Margaret Fuller",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Today a reader, tomorrow a leader."
  },
  {
    text: "Kiến thức là quyền lực, nhưng chỉ khi bạn áp dụng nó.",
    author: "Napoleon Hill",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Knowledge will give you power, but character will give you respect."
  },
  {
    text: "Học từ những lỗi lầm của người khác, bạn không có thời gian để mắc tất cả.",
    author: "Elbert Hubbard",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The great aim of education is not knowledge but action."
  },
  {
    text: "Những người thành công không bao giờ dừng học hỏi từ bất kỳ ai.",
    author: "Ray Dalio",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Radical transparency and open-mindedness are keys to success."
  },
  {
    text: "Học tập đúng cách mở ra cánh cửa thành công.",
    author: "Benjamin Franklin",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Tell me and I forget, teach me and I may remember, involve me and I learn."
  },

  // 41-50
  {
    text: "Hôm nay bạn chọn học, ngày mai bạn sẽ chọn thành công.",
    author: "Jack Ma",
    country: "🇨🇳 Trung Quốc",
    flag: "🇨🇳",
    original: "Today is hard, tomorrow will be worse, but the day after tomorrow will be sunshine."
  },
  {
    text: "Sự thông minh không phải là điều bạn được sinh ra, mà là điều bạn học được.",
    author: "Carol S. Dweck",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "In a growth mindset, challenges are exciting rather than threatening."
  },
  {
    text: "Học hỏi là cách tốt nhất để chuẩn bị cho tương lai.",
    author: "Peter Drucker",
    country: "🇦🇹 Áo",
    flag: "🇦🇹",
    original: "The best way to predict the future is to create it."
  },
  {
    text: "Những người giỏi nhất là những người chưa bao giờ dừng học.",
    author: "Warren Buffett",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Read 500 pages like this every day. That's how knowledge works."
  },
  {
    text: "Học tập không phải là chuẩn bị cho cuộc sống, nó là cuộc sống.",
    author: "John Dewey",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "If we teach today's students as we taught yesterday's, we rob them of tomorrow."
  },
  {
    text: "Tôi không sợ một người đã học 10,000 cách thử nghiệm. Tôi sợ người học 1 cách 10,000 lần.",
    author: "Bruce Lee",
    country: "🇭🇰 Hồng Kông",
    flag: "🇭🇰",
    original: "I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times."
  },
  {
    text: "Học là quá trình sáng tạo, không phải tiêu thụ.",
    author: "Paulo Freire",
    country: "🇧🇷 Brazil",
    flag: "🇧🇷",
    original: "Education either functions as an instrument to integrate the younger generation into the logic of the present system and bring about conformity, or it becomes the practice of freedom, the means by which people deal critically and creatively with reality and discover how to participate in the transformation of their world."
  },
  {
    text: "Để thành công, trước tiên hãy học thành công.",
    author: "Muhammad Ali",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Service to others is the rent you pay for your room here on Earth."
  },
  {
    text: "Sách mở ra những thế giới mới cho chúng ta.",
    author: "Stefan Zweig",
    country: "🇦🇹 Áo",
    flag: "🇦🇹",
    original: "A book is a dream that you hold in your hand."
  },
  {
    text: "Học hỏi là một sự may mắn mà chỉ có những người chăm chỉ mới nhận được.",
    author: "Thomas Jefferson",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The lottery of life is a great equalizer - there is something in common between all of us."
  },

  // 51-60
  {
    text: "Hãy tò mò, hãy hỏi, hãy khám phá - đó là bản chất của học hỏi.",
    author: "Richard Feynman",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The most important precedes for doing good science is curiosity."
  },
  {
    text: "Không có điều gì là quá khó khăn nếu bạn sẵn sàng học.",
    author: "Thomas Jefferson",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Nothing is more important than learning."
  },
  {
    text: "Học tập là một phiêu lưu, không phải một gánh nặng.",
    author: "William Butler Yeats",
    country: "🇮🇪 Ireland",
    flag: "🇮🇪",
    original: "Education is not the filling of a pail, but the lighting of a fire."
  },
  {
    text: "Những người thắng cuộc là những người không bao giờ thôi học hỏi.",
    author: "Sheryl Sandberg",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Done is better than perfect."
  },
  {
    text: "Hãy học để không bao giờ phải nói rằng mình không biết.",
    author: "Ralph Waldo Emerson",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The only person you are destined to become is the person you decide to be."
  },
  {
    text: "Học tập là cách để phục vụ xã hội tốt hơn.",
    author: "Jawaharlal Nehru",
    country: "🇮🇳 Ấn Độ",
    flag: "🇮🇳",
    original: "The true test of civilization is not the census, nor the size of cities, but the kind of men the country turns out."
  },
  {
    text: "Hôm nay bạn học tập, ngày mai bạn sẽ lãnh đạo những người khác.",
    author: "Malala Yousafzai",
    country: "🇵🇰 Pakistan",
    flag: "🇵🇰",
    original: "We realize the importance of our voices only when we are silenced."
  },
  {
    text: "Không có lý do nào để không học hỏi mỗi ngày.",
    author: "Bill Gates",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "As we look ahead, I'm optimistic about our ability to tackle challenges."
  },
  {
    text: "Kiến thức tích lũy mỗi ngày sẽ mang lại thay đổi lớn.",
    author: "James Clear",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Tiny changes, remarkable results."
  },
  {
    text: "Hãy yêu thích học tập, nó sẽ yêu thích bạn lại.",
    author: "Ryan Holiday",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The impediment to action advances action. What stands in the way becomes the way."
  },

  // 61-70
  {
    text: "Học tập là khoản đầu tư tốt nhất mà bạn có thể làm.",
    author: "Paul Ryan",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The greatest threat to our freedom is an ignorant electorate."
  },
  {
    text: "Những câu hỏi của bạn ngày hôm nay sẽ là câu trả lời của bạn ngày mai.",
    author: "Robin Sharma",
    country: "🇨🇦 Canada",
    flag: "🇨🇦",
    original: "The richest place on the planet is the graveyard, because there you will find all the dreams that were never fulfilled."
  },
  {
    text: "Học hỏi là điều kiện tiên quyết của sự cải thiện.",
    author: "W. Edwards Deming",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "It is not enough to do your best; you must know what to do, and then do your best."
  },
  {
    text: "Hôm nay là cơ hội tốt nhất để bắt đầu học hỏi.",
    author: "Zig Ziglar",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "You don't have to be great to start, but you have to start to be great."
  },
  {
    text: "Học tập mỗi giờ là điều tôi khuyên bạn nên làm.",
    author: "Isaac Newton",
    country: "🇬🇧 Anh",
    flag: "🇬🇧",
    original: "If I have seen further, it is by standing on the shoulders of giants."
  },
  {
    text: "Những con người thông minh nhất học hỏi từ tất cả những người xung quanh họ.",
    author: "Dan Brown",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The more you know, the more you realize you don't know."
  },
  {
    text: "Học tập là chìa khóa để mở cánh cửa của tương lai.",
    author: "George Washington Carver",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Education is the great equalizer."
  },
  {
    text: "Hãy học những thứ sẽ giúp bạn phục vụ nhân loại.",
    author: "Albert Schweitzer",
    country: "🇫🇷 Pháp",
    flag: "🇫🇷",
    original: "The only real progress lies in learning to unlearn old falsehoods."
  },
  {
    text: "Học tập không bao giờ dừng lại, nó chỉ thay đổi hình thức.",
    author: "Carol Dweck",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Becoming is better than being."
  },
  {
    text: "Những bước tiến bộ bắt đầu bằng sự sẵn sàng học hỏi.",
    author: "Louise Penny",
    country: "🇨🇦 Canada",
    flag: "🇨🇦",
    original: "The best things in life are actually free."
  },

  // 71-80
  {
    text: "Học hỏi là công việc, nhưng nó không bao giờ là chán dull.",
    author: "J.K. Rowling",
    country: "🇬🇧 Anh",
    flag: "🇬🇧",
    original: "It is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived - in which case, you fail by default."
  },
  {
    text: "Sự giàu có thực sự là hiểu biết sâu sắc.",
    author: "Socrates",
    country: "🇬🇷 Hy Lạp",
    flag: "🇬🇷",
    original: "Beware the barrenness of a busy life."
  },
  {
    text: "Hãy học những thứ mà bạn yêu thích, thành công sẽ tự đến.",
    author: "Oprah Winfrey",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "You get in life what you have the courage to ask for."
  },
  {
    text: "Học tập là quá trình mở rộng tâm trí của bạn.",
    author: "Aristotle",
    country: "🇬🇷 Hy Lạp",
    flag: "🇬🇷",
    original: "The more you know yourself, the more patience you have for what you see in others."
  },
  {
    text: "Những người thành công không sợ thất bại, họ học từ nó.",
    author: "Jack Canfield",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Success leaves clues."
  },
  {
    text: "Học hỏi từ lịch sử để xây dựng tương lai.",
    author: "Carl Sagan",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Somewhere, something incredible is waiting to be known."
  },
  {
    text: "Hôm nay bạn học một bài, ngày mai bạn sẽ dạy người khác.",
    author: "Margaret Mead",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Never doubt that a small group of thoughtful, committed citizens can change the world; indeed, it's the only thing that ever has."
  },
  {
    text: "Học tập là hành động của tôn trọng bản thân.",
    author: "Paulo Coelho",
    country: "🇧🇷 Brazil",
    flag: "🇧🇷",
    original: "When you want something, all the universe conspires in helping you to achieve it."
  },
  {
    text: "Những người giỏi nhất luôn là những người học hỏi nhiều nhất.",
    author: "Elon Musk",
    country: "🇿🇦 Nam Phi",
    flag: "🇿🇦",
    original: "First principles thinking is a powerful tool for understanding the world."
  },
  {
    text: "Học tập là hành trình, không phải đích đến cuối cùng.",
    author: "Maya Angelou",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "It is this belief in a power larger than myself and other than myself which allows me to venture into chaos or into the darkness to do what I think is right."
  },

  // 81-90
  {
    text: "Hãy đặt câu hỏi, vì mỗi câu hỏi là một cơ hội để học.",
    author: "Barbara Walters",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The most important thing in communication is hearing what isn't being said."
  },
  {
    text: "Học tập là quà tặng mà bạn tặng cho chính mình.",
    author: "Denzel Washington",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "At the end of the day, it's not about what you have or even what you've accomplished. It's about who you've lifted up, who you've made better."
  },
  {
    text: "Sự tò mò là động lực của mọi khám phá và học hỏi.",
    author: "Michael Faraday",
    country: "🇬🇧 Anh",
    flag: "🇬🇧",
    original: "Nothing is too wonderful to be true."
  },
  {
    text: "Học hỏi mỗi ngày là cách để không bao giờ lạc hướng.",
    author: "Stephen Covey",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Begin with the end in mind."
  },
  {
    text: "Những sách tốt nhất dạy bạn cách sống tốt hơn.",
    author: "Mark Twain",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The man who does not read has no advantage over the man who cannot read."
  },
  {
    text: "Học tập là cách để kiểm soát tương lai của bạn.",
    author: "Anthony Robbins",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The only limit to your impact is your imagination and commitment."
  },
  {
    text: "Hôm nay bạn là học sinh, ngày mai bạn là thầy giáo.",
    author: "Ralph Waldo Emerson",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Every man is a divinity in disguise, a god playing the fool."
  },
  {
    text: "Học tập là cách để khám phá những khả năng không tưởng trong chính mình.",
    author: "Joseph Campbell",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The privilege of a lifetime is to become who you truly are."
  },
  {
    text: "Những người tĩnh lặng nhất đôi khi là những người học hỏi nhiều nhất.",
    author: "Quiet Susan Cain",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "The world needs you to be yourself, not an imitation of someone else."
  },
  {
    text: "Học hỏi là cách để không bao giờ cảm thấy mất mát.",
    author: "Viktor Frankl",
    country: "🇦🇹 Áo",
    flag: "🇦🇹",
    original: "Everything can be taken from a man but one thing: the last of the human freedoms - the ability to choose one's attitude in any given set of circumstances."
  },

  // 91-100
  {
    text: "Sách là những người bạn tốt nhất, họ không bao giờ phản bội bạn.",
    author: "Charles Dickens",
    country: "🇬🇧 Anh",
    flag: "🇬🇧",
    original: "It was the best of times, it was the worst of times."
  },
  {
    text: "Học tập là những gì tách biệt chúng ta với các loài động vật khác.",
    author: "B.F. Skinner",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Education is what survives when what has been learned has been forgotten."
  },
  {
    text: "Hãy sống như bạn đang học, không phải như bạn đã học.",
    author: "Montaigne",
    country: "🇫🇷 Pháp",
    flag: "🇫🇷",
    original: "The only way to do great work is to love what you do."
  },
  {
    text: "Học hỏi không bao giờ kết thúc, cuộc sống là một bài học dài hạn.",
    author: "Socrates",
    country: "🇬🇷 Hy Lạp",
    flag: "🇬🇷",
    original: "The unexamined life is not worth living."
  },
  {
    text: "Những người giàu về tinh thần là những người học hỏi nhiều.",
    author: "Marie Curie",
    country: "🇵🇱 Ba Lan",
    flag: "🇵🇱",
    original: "Life is not easy for any of us. But what of that? We must have perseverance and above all confidence in ourselves."
  },
  {
    text: "Hôm nay bạn học một kỹ năng, ngày mai bạn sẽ tìm được một công việc.",
    author: "Sheryl Sandberg",
    country: "🇺🇸 Mỹ",
    flag: "🇺🇸",
    original: "Lean in to your ambitions and dreams."
  },
  {
    text: "Học tập là điều kiện để sống một cuộc sống có ý nghĩa.",
    author: "Hannah Arendt",
    country: "🇩🇪 Đức",
    flag: "🇩🇪",
    original: "Education is the most human and humanizing of all human activities."
  },
  {
    text: "Những cánh cửa mới mở ra khi bạn sẵn sàng học hỏi.",
    author: "Bob Proctor",
    country: "🇨🇦 Canada",
    flag: "🇨🇦",
    original: "You are not here by accident, you are here by design."
  },
  {
    text: "Học tập là cách để biến những ước mơ thành hiện thực.",
    author: "Brian Tracy",
    country: "🇨🇦 Canada",
    flag: "🇨🇦",
    original: "All successful people, men and women, are big dreamers. They imagine what their future could be, ideal in every respect, and then they work every day toward their distant vision."
  },
  {
    text: "Hãy học mỗi ngày, hãy sống mỗi ngày như bạn đang học một bài học mới.",
    author: "Rumi",
    country: "🇵🇪 Persia",
    flag: "🇮🇷",
    original: "Let yourself be silently drawn by the strange pull of what you really love."
  }
];
function getRandomQuote() {
  return PHILOSOPHER_QUOTES[Math.floor(Math.random() * PHILOSOPHER_QUOTES.length)];
}

function DeadlineTag({ diffHrs }: { diffHrs: number | null }) {
  if (diffHrs === null) return null;
  if (diffHrs < 0)    return <span className="text-[10px] font-extrabold px-2 py-0.5 bg-error text-white rounded-full">Không đạt</span>;
  if (diffHrs < 6)    return <span className="text-[10px] font-extrabold px-2 py-0.5 bg-error text-white rounded-full">Còn {diffHrs} giờ</span>;
  if (diffHrs < 72)   return <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-500 dark:bg-amber-600 text-white dark:text-amber-100 rounded-full">{Math.ceil(diffHrs/24)} ngày còn lại</span>;
  return null;
}

function AssignmentCard({ item }: { item: AssignmentCard }) {
  const isLate    = item.diffHrs !== null && item.diffHrs < 0 && item.status === "DRAFT";
  const showScore = item.status === "GRADED" && item.score !== null;

  return (
    <div className={`bg-surface-container-lowest rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-md transition-all
      ${isLate ? "border-error/30" : "border-outline-variant/20"}`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${item.status === "GRADED" ? "bg-secondary/10" :
            item.status === "SUBMITTED" ? "bg-primary/10" :
            item.status === "REASSIGNED" ? "bg-error/10" : "bg-surface-container"}`}>
          <span className={`material-symbols-outlined ${
            item.status === "GRADED" ? "text-secondary" :
            item.status === "SUBMITTED" ? "text-primary" :
            item.status === "REASSIGNED" ? "text-error" : "text-on-surface-variant"}`}
            style={{ fontSize: 20 }}>{ICON_MAP[item.status] ?? "assignment"}</span>
        </div>

        <div className="flex-1 min-w-0">
          {item.diffHrs !== null && (
            <DeadlineTag diffHrs={item.diffHrs} />
          )}
          {showScore && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-secondary/10 text-secondary rounded-full">
              Đạt: {item.score}/10
            </span>
          )}
          {item.status === "REASSIGNED" && (
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-error/10 text-error rounded-full">Không đạt</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div>
        <p className="text-xs text-on-surface-variant mb-1">
          {item.className} • Bài {item.attempt}
        </p>
        <h3 className="font-extrabold text-on-surface leading-snug mb-1">{item.title}</h3>
        <p className="chinese-text text-sm text-primary/70">學習進度管理</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-outline-variant/20">
        <div>
          {item.deadline && (
            <p className="text-xs text-on-surface-variant">
              Deadline:&nbsp;
              <span className={item.diffHrs !== null && item.diffHrs < 6 ? "text-error font-bold" : ""}>
                {item.diffHrs !== null && item.diffHrs < 24
                  ? `${new Date(item.deadline).getHours()}:${String(new Date(item.deadline).getMinutes()).padStart(2,"0")} Hôm nay`
                  : new Date(item.deadline).toLocaleDateString("vi-VN", { day: "2-digit", month: "short" })
                }
              </span>
            </p>
          )}
        </div>

        {item.status === "DRAFT" && (
          <Link href={`/home/student/assignments/${item.assignmentId}`}
            className="flex items-center gap-1.5 bg-primary text-on-primary text-xs font-bold px-4 py-2 rounded-xl hover:brightness-110 transition-all">
            Làm bài
          </Link>
        )}
        {item.status === "SUBMITTED" && (
          <span className="text-xs text-on-surface-variant italic">Chờ chấm</span>
        )}
        {item.status === "GRADED" && (
          <Link href={`/home/student/assignments/${item.assignmentId}`}
            className="text-xs font-bold text-primary hover:underline">
            Xem kết quả
          </Link>
        )}
        {item.status === "REASSIGNED" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-error">Cần làm lại bài tập này</span>
            <Link href={`/home/student/assignments/${item.assignmentId}`}
              className="text-xs font-bold text-on-surface border border-outline-variant/40 px-3 py-1.5 rounded-lg hover:bg-surface-container transition-all">
              Xem lỗi sai
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentAssignmentsPage() {
  const [items,   setItems]   = useState<AssignmentCard[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("pending");
  const streak = 12; // from user data

  useEffect(() => {
    setLoading(true);
    fetch(`/api/student/assignments?filter=${filter}`)
      .then(r => r.json())
      .then(d => {
        setItems(d.assignments ?? []);
        setStats(d.stats ?? null);
      })
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="p-4 md:p-6 bg-surface-container" style={{ minHeight: "100vh" }}>
      {/* Hero */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-4xl text-tertiary select-none" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            <h1 className="text-3xl font-extrabold text-on-surface">Bài tập</h1>
          </div>
          <p className="text-sm text-on-surface-variant">
            Hoàn thành bài tập để nâng cao kỹ năng và ghi điểm thưởng mỗi ngày.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-tertiary/10 text-tertiary px-3 py-1.5 rounded-xl text-sm font-bold flex-shrink-0 border border-tertiary/20">
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          Chuỗi {streak} ngày
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex bg-surface-container-lowest rounded-xl p-1 gap-1 border border-outline-variant/20 shadow-sm">
          {[
            { key: "pending",   label: "Chưa nộp"  },
            { key: "submitted", label: "Đã nộp"    },
            { key: "graded",    label: "Đã chấm"   },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all
                ${filter === f.key ? "bg-surface-container shadow text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {loading ? [1,2,3].map(i => (
          <div key={i} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 p-5 h-52 animate-pulse" />
        )) : items.map(item => (
          <AssignmentCard key={item.submissionId} item={item} />
        ))}

        {/* Philosopher quote card */}
        {!loading && (
          <div className="bg-primary rounded-2xl p-5 relative overflow-hidden col-span-1 md:col-span-1 lg:col-span-1 flex flex-col gap-3">
            <div className="absolute right-2 bottom-1 material-symbols-outlined text-[7rem] text-white/10 select-none" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</div>
            {(() => {
              const q = getRandomQuote();
              return (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-white/60 uppercase tracking-widest">Lời hay</span>
                    <span className="text-xs text-white/40">{q.flag}</span>
                  </div>
                  <p className="text-sm text-white/90 italic leading-relaxed relative z-10">
                    "{q.text}"
                  </p>
                  <p className="text-xs font-bold text-white/50">— {q.author}</p>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {!loading && items.length === 0 && (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 block mb-3">assignment</span>
          <p className="text-sm text-on-surface-variant">Không có bài tập nào</p>
        </div>
      )}
    </div>
  );
}
