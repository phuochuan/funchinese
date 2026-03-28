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

const PHILOSOPHER_QUOTES = [
  // ── Lão Tử (Tao Te Ching / Đạo Đức Kinh) ──────────────────────────────────
  { text: "Hành trình vạn dặm bắt đầu từ một bước chân.", author: "Lão Tử", flag: "🟡" },
  { text: "Người biết đủ thì không bao giờ nghèo.", author: "Lão Tử", flag: "🟡" },
  { text: "Khi không ai hiểu bạn, bạn đã trở thành người lớn.", author: "Lão Tử", flag: "🟡" },
  { text: "Ngã bất dữ thiên tỉnh kỳ dữ, ngã thường vô vi dĩ đắc thiên hạ.", author: "Lão Tử", flag: "🟡" },
  { text: "Đạo sinh một, một sinh hai, hai sinh ba, ba sinh vạn vật.", author: "Lão Tử", flag: "🟡" },
  { text: "Người hiền cương như đứa trẻ mới sinh, chưa biết giao hợp mà có thể động dục.", author: "Lão Tử", flag: "🟡" },
  { text: "Kẻ thắng người mạnh là kẻ mạnh, kẻ thắng chính mình mới là người quang minh.", author: "Lão Tử", flag: "🟡" },
  { text: "Tri tuệ giả, kỳ dụng diệc đại dã. Trì dã dĩ việc, kỳ dụng dĩ cử. Tư dã dĩ lợi, kỳ dụng dĩ phát.", author: "Lão Tử", flag: "🟡" },
  { text: "Bạo dữ chi sư, bất đắc bất chí; đắc dĩ tồn chi, nhi dĩ xả chi, thị vị bỉ đạo.", author: "Lão Tử", flag: "🟡" },
  { text: "Thiên hạ câu tri bỉ sự giai đắc, bất tri dĩ vi vi dã.", author: "Lão Tử", flag: "🟡" },
  { text: "Sách mở ra ngàn cánh cửa, nhưng không cánh cửa nào dẫn đến hạnh phúc nếu thiếu ý chí.", author: "Lão Tử", flag: "🟡" },
  { text: "Kẻ nào biết đủ thì giàu có, kẻ nào biết dừng lại thì an toàn.", author: "Lão Tử", flag: "🟡" },
  { text: "Đạo Đức bất đức, tắc hữu đức — Nhân nghĩ bất nhân, tắc hữu nhân.", author: "Lão Tử", flag: "🟡" },
  // ── Khổng Tử ───────────────────────────────────────────────────────────────
  { text: "Học nhi bất hành vô dĩ dụng, học tại cổ duyệt diệc duyên thời.", author: "Khổng Tử", flag: "🔴" },
  { text: "Người không biết điều thì không thể đứng được.", author: "Khổng Tử", flag: "🔴" },
  { text: "Ta học để hành, học mà không hành thì học làm gì?", author: "Khổng Tử", flag: "🔴" },
  { text: "Người với người giao tiếp, lấy tín nhiễu vi bản.", author: "Khổng Tử", flag: "🔴" },
  { text: "Đọc sách nhiều mà không suy nghĩ thì uổng công, suy nghĩ nhiều mà không đọc sách thì nguy hiểm.", author: "Khổng Tử", flag: "🔴" },
  { text: "Người quân tử hòa nhu mà không đồng nhục, tiểu nhân đồng nhục mà bất khả hòa nhu.", author: "Khổng Tử", flag: "🔴" },
  { text: "Tam giá tại thân: Vong dục, vong xí, vong đầu.", author: "Khổng Tử", flag: "🔴" },
  { text: "Có công mài sắt, có ngày nên kim.", author: "Khổng Tử", flag: "🔴" },
  { text: "Học, học nữa, học mãi — tri tuệ là sáng suốt, ngu si là ngu si, đó là tự mình chọn lấy.", author: "Khổng Tử", flag: "🔴" },
  { text: "Bất vi dụng nhi học chi viên, bất vi dụng dĩ vi tắc tích dã.", author: "Khổng Tử", flag: "🔴" },
  { text: "Quân tử dĩ A, B, C tự Cường; tiểu nhân A, B, C tự Cường bất Cường.", author: "Khổng Tử", flag: "🔴" },
  { text: "Kỷ bất dụng, vô dĩ dụng chính nhân. Đãi sự bất minh, bất minh chi sự, bất hành dã.", author: "Khổng Tử", flag: "🔴" },
  { text: "Thiên hạ chi sự giai thập dục, dĩ kỳ năng vi chư bất năng vi chi." , author: "Khổng Tử", flag: "🔴" },
  // ── Socrates ───────────────────────────────────────────────────────────────
  { text: "Tôi biết rằng tôi không biết gì.", author: "Socrates", flag: "🟢" },
  { text: "Đời người không sống thì như cây không ra quả.", author: "Socrates", flag: "🟢" },
  { text: "Kẻ thù lớn nhất của tri thức không phải là sự dốt nát, mà là ảo tưởng về tri thức.", author: "Socrates", flag: "🟢" },
  { text: "Hãy làm điều bạn sợ, và bạn sẽ không bao giờ còn sợ nữa.", author: "Socrates", flag: "🟢" },
  { text: "Khi thất bại, đừng tìm kiếm lỗi ở người khác — hãy tìm hiểu xem mình đã làm gì sai.", author: "Socrates", flag: "🟢" },
  { text: "Một đời không thăm dò là một đời sống không đáng sống.", author: "Socrates", flag: "🟢" },
  { text: "Người ta không dạy cái gì; người ta chỉ giúp người ta nhớ rằng họ đã biết.", author: "Socrates", flag: "🟢" },
  { text: "Hạnh phúc không đến từ sự giàu có, mà đến từ tâm hồn thanh thản.", author: "Socrates", flag: "🟢" },
  // ── Plato ─────────────────────────────────────────────────────────────────
  { text: "Giáo dục là việc chạm vào ngọn lửa chứ không phải rót nước vào bình.", author: "Plato", flag: "🔵" },
  { text: "Con người sinh ra không phải để tan vỡ, mà để bay cao.", author: "Plato", flag: "🔵" },
  { text: "Cái đẹp là sự huy hoàng của cái thiện.", author: "Plato", flag: "🔵" },
  { text: "Bắt đầu là nửa công việc.", author: "Plato", flag: "🔵" },
  { text: "Tri thức vô thượng là tri thức giúp ta nhận ra rằng mình không biết gì.", author: "Plato", flag: "🔵" },
  { text: "Cái nhà giàu không phải ngôi nhà đẹp nhất, mà là ngôi nhà có tình yêu thương.", author: "Plato", flag: "🔵" },
  { text: "Tình yêu chân chính không phải là sở hữu, mà là nâng đỡ tâm hồn.", author: "Plato", flag: "🔵" },
  // ── Seneca ────────────────────────────────────────────────────────────────
  { text: "Không có ai ngẫu nhiên trở thành người khôn ngoan — đó là kết quả của lao động.", author: "Seneca", flag: "⚪" },
  { text: "May mắn không xảy ra, đó là kết quả của sự chuẩn bị.", author: "Seneca", flag: "⚪" },
  { text: "Chúng ta không sợ mất thời gian, chúng ta sợ thời gian trôi qua mà không làm gì.", author: "Seneca", flag: "⚪" },
  { text: "Người khôn ngoan không đợi hứa hẹn tương lai mà tận hưởng hiện tại.", author: "Seneca", flag: "⚪" },
  { text: "Nghèo không phải là thiếu thốn, mà là không có gì thừa.", author: "Seneca", flag: "⚪" },
  { text: "Thời gian chữa lành mọi vết thương, nhưng chính ta phải cho nó cơ hội.", author: "Seneca", flag: "⚪" },
  { text: "Người sống trong quá khứ là người chết; người sống trong tương lai là người chưa sinh.", author: "Seneca", flag: "⚪" },
  { text: "Chúng ta học không phải cho trường học, mà cho cuộc sống.", author: "Seneca", flag: "⚪" },
  // ── Nietzsche ──────────────────────────────────────────────────────────────
  { text: "Điều không giết chết được ta sẽ khiến ta mạnh mẽ hơn.", author: "Nietzsche", flag: "⚫" },
  { text: "Người có lý do để sống có thể chịu đựng bất kỳ điều gì.", author: "Nietzsche", flag: "⚫" },
  { text: "Trong thế giới của cái ác, người tốt phải trở nên điên.", author: "Nietzsche", flag: "⚫" },
  { text: "Kẻ chiến thắng không bao giờ từ bỏ, kẻ từ bỏ không bao giờ chiến thắng.", author: "Nietzsche", flag: "⚫" },
  { text: "Sống như thể không có ngày mai — đó là cách sống của người can đảm.", author: "Nietzsche", flag: "⚫" },
  { text: "Amor fati — Hãy yêu số phận của con, trong mọi hoàn cảnh.", author: "Nietzsche", flag: "⚫" },
  { text: "Điều thiện và cái ác chỉ do con người tự tạo ra, không có ai là kẻ ác từ bản chất.", author: "Nietzsche", flag: "⚫" },
  // ── Marcus Aurelius ─────────────────────────────────────────────────────────
  { text: "Bạn có quyền về suy nghĩ của mình, nhưng không ai ép bạn phải tin vào điều gì.", author: "Marcus Aurelius", flag: "🟤" },
  { text: "Tâm trí là thứ tự định hình vật chất, không phải ngược lại.", author: "Marcus Aurelius", flag: "🟤" },
  { text: "Tương lai không thuộc về chúng ta, quá khứ đã qua — chỉ có hiện tại là của ta.", author: "Marcus Aurelius", flag: "🟤" },
  { text: "Đừng để những gì người khác nghĩ làm phiền bạn — họ có suy nghĩ của riêng họ.", author: "Marcus Aurelius", flag: "🟤" },
  { text: "Nghịch cảnh không kiểm tra tính cách, mà chỉ phơi bày nó.", author: "Marcus Aurelius", flag: "🟤" },
  { text: "Người ta tìm nơi ẩn náu trong những thứ sai lầm, vì họ sợ nhìn vào bên trong.", author: "Marcus Aurelius", flag: "🟤" },
  // ── Epictetus ──────────────────────────────────────────────────────────────
  { text: "Chúng ta không thể chọn hoàn cảnh bên ngoài, nhưng có thể chọn cách phản ứng.", author: "Epictetus", flag: "🟠" },
  { text: "Điều quan trọng không phải là chuyện gì xảy ra với bạn, mà là cách bạn phản ứng với nó.", author: "Epictetus", flag: "🟠" },
  { text: "Người không bận tâm về những điều không nằm trong tầm kiểm soát sẽ luôn bình an.", author: "Epictetus", flag: "🟠" },
  { text: "Muốn thay đổi thế giới, trước hết hãy thay đổi chính mình.", author: "Epictetus", flag: "🟠" },
  // ── Aristotle ───────────────────────────────────────────────────────────────
  { text: "Con người là động vật có lý trí; mục đích của cuộc sống là sống theo lý trí.", author: "Aristotle", flag: "🟣" },
  { text: "Hạnh phúc là ý nghĩa và mục đích của mọi sự tồn tại.", author: "Aristotle", flag: "🟣" },
  { text: "Biết được điều gì là đúng không khó, khó là thực hành nó mỗi ngày.", author: "Aristotle", flag: "🟣" },
  { text: "Excellence is not an act, but a habit — Vượt trội không phải hành động mà là thói quen.", author: "Aristotle", flag: "🟣" },
  { text: "Người không có bạn tốt là người cô đơn nhất trên đời.", author: "Aristotle", flag: "🟣" },
  // ── Victor Hugo ─────────────────────────────────────────────────────────────
  { text: "Mỗi năm qua đi là một bước tiến gần hơn tới sự hoàn thiện.", author: "Victor Hugo", flag: "🔵" },
  { text: "Kẻ mù không nhận ra ánh sáng, kẻ ngu không nhận ra tri thức.", author: "Victor Hugo", flag: "🔵" },
  { text: "Hạnh phúc lớn nhất là biết rằng ta được yêu thương vì chính con người ta.", author: "Victor Hugo", flag: "🔵" },
  { text: "Bực bội là thái độ của kẻ yếu, kiên nhẫn là thái độ của người mạnh.", author: "Victor Hugo", flag: "🔵" },
  // ── Voltaire ────────────────────────────────────────────────────────────────
  { text: "Nuôi dưỡng tâm trí mà không có tri thức cũng nguy hiểm như không có đạo đức.", author: "Voltaire", flag: "🟠" },
  { text: "Sự ngông cuồng là đặc quyền của những người thất bại.", author: "Voltaire", flag: "🟠" },
  // ── Rumi (Sufi) ─────────────────────────────────────────────────────────────
  { text: "Hãy để nước mắt rơi, nhưng đừng để trái tim khô cằn.", author: "Rumi", flag: "🩷" },
  { text: "Khuấy động cốc sữa, không thể có bơ; khuấy động tâm hồn, không thể có tri thức.", author: "Rumi", flag: "🩷" },
  { text: "Hãy đứng trong ánh mặt trời và để bóng tối ở sau lưng.", author: "Rumi", flag: "🩷" },
  // ── Buddha ──────────────────────────────────────────────────────────────────
  { text: "Đừng đi theo con đường mà người khác đã đi, mà hãy tìm con đường của chính mình.", author: "Buddha", flag: "💛" },
  { text: "Tâm là thứ tạo ra mọi thứ; tất cả đều từ tâm mà ra, do tâm chi phối.", author: "Buddha", flag: "💛" },
  { text: "Người chinh phục bản thân là người chiến thắng vĩ đại nhất.", author: "Buddha", flag: "💛" },
  { text: "Hạnh phúc không phải là điều được chuẩn bị sẵn, mà là kết quả của chính ta.", author: "Buddha", flag: "💛" },
  { text: "Ánh sáng bên trong các ngươi đủ soi sáng cả thế giới.", author: "Buddha", flag: "💛" },
  // ── Đặng Trần Côn (Việt Nam) ─────────────────────────────────────────────────
  { text: "Cảm tưởng đâu đã có trước kia, nay lại cảm tưởng, tưởng đã lắng rồi lại tràn.", author: "Đặng Trần Côn", flag: "🇻🇳" },
  // ── Trạng Trình Nguyễn Trãi (Việt Nam) ───────────────────────────────────────
  { text: "Nhân chi sơ, tín bản thiện — Tính người lúc mới sinh ra vốn là tốt đẹp.", author: "Nguyễn Trãi", flag: "🇻🇳" },
  // ── Hồ Chí Minh ─────────────────────────────────────────────────────────────
  { text: "Không có gì quý hơn độc lập, tự do.", author: "Hồ Chí Minh", flag: "🇻🇳" },
  { text: "Có tài mà không có đức thì cũng vô dụng như có đức mà không có tài.", author: "Hồ Chí Minh", flag: "🇻🇳" },
  // ── Nguyễn Du (Việt Nam) ─────────────────────────────────────────────────────
  { text: "Truyện Kiều là tiếng khóc của dân tộc Việt, là bài ca về số phận con người.", author: "Nguyễn Du", flag: "🇻🇳" },
  { text: "Chữ tài liền với chữ tai một vần — Tài làm cho đời sống thêm phong phú, tai ắt theo sau.", author: "Nguyễn Du", flag: "🇻🇳" },
  // ── Ngô Chi Lan ─────────────────────────────────────────────────────────────
  { text: "Sống là cho đi, không phải nhận lại — đó mới là ý nghĩa thật của cuộc đời.", author: "Ngô Chi Lan", flag: "🇻🇳" },
  // ── Taliesin (Celtic) ───────────────────────────────────────────────────────
  { text: "Hạnh phúc thật sự là khi những điều bạn nghĩ, điều bạn nói, và điều bạn làm đều hài hòa.", author: "Taliesin", flag: "🟢" },
  // ── Galileo Galilei ─────────────────────────────────────────────────────────
  { text: "Bạn không thể dạy một người điều gì đó; bạn chỉ có thể giúp họ tìm thấy nó trong chính mình.", author: "Galileo", flag: "🔵" },
  // ── Dr. Seuss ───────────────────────────────────────────────────────────────
  { text: "Hãy đi theo con đường của chính bạn, dù nó có lạ lùng đến đâu.", author: "Dr. Seuss", flag: "🔴" },
  // ── Cố Thủ Tướng Võ Văn Kiệt ─────────────────────────────────────────────────
  { text: "Không có con đường nào trải sẵn hoa hồng, chỉ có con đường ta tự rải.", author: "Võ Văn Kiệt", flag: "🇻🇳" },
];

function getRandomQuote() {
  return PHILOSOPHER_QUOTES[Math.floor(Math.random() * PHILOSOPHER_QUOTES.length)];
}

function DeadlineTag({ diffHrs }: { diffHrs: number | null }) {
  if (diffHrs === null) return null;
  if (diffHrs < 0)    return <span className="text-[10px] font-extrabold px-2 py-0.5 bg-error text-white rounded-full">Không đạt</span>;
  if (diffHrs < 6)    return <span className="text-[10px] font-extrabold px-2 py-0.5 bg-error text-white rounded-full">Còn {diffHrs} giờ</span>;
  if (diffHrs < 72)   return <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-500 text-white rounded-full">{Math.ceil(diffHrs/24)} ngày còn lại</span>;
  return null;
}

function AssignmentCard({ item }: { item: AssignmentCard }) {
  const isLate    = item.diffHrs !== null && item.diffHrs < 0 && item.status === "DRAFT";
  const showScore = item.status === "GRADED" && item.score !== null;

  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-4 hover:shadow-md transition-all
      ${isLate ? "border-error/30" : "border-gray-100"}`}>
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
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
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
    <div className="p-4 md:p-6" style={{ background: "#f5f7fa", minHeight: "100vh" }}>
      {/* Hero */}
      <div className="flex items-start gap-4 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-4xl text-pink-400 select-none" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
            <h1 className="text-3xl font-extrabold text-on-surface">Bài tập</h1>
          </div>
          <p className="text-sm text-on-surface-variant">
            Hoàn thành bài tập để nâng cao kỹ năng và ghi điểm thưởng mỗi ngày.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-sm font-bold flex-shrink-0">
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          Chuỗi {streak} ngày
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex bg-white rounded-xl p-1 gap-1 border border-gray-100 shadow-sm">
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
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-52 animate-pulse" />
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
