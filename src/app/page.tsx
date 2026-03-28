"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

// ─── Shared style ─────────────────────────────────────────────────────────────
const FILL = { fontVariationSettings: "'FILL' 1" };



const TESTIMONIALS = [
  {
    quote: "Giao diện cực kỳ đẹp và dễ học. Mình thích nhất là phần âm Hán Việt, nó giúp mình nhớ từ vựng nhanh khủng khiếp. Từ số không lên HSK 4 chỉ trong 6 tháng!",
    name: "Minh Thư", role: "Nhân viên Xuất nhập khẩu",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBVVHBhZ1jF5ax9rjWKCFagEvt3GOvh6Y7KPDb1sXqkMfMqo94m50raD36PXNgqdjiBPtbGVXNMrlvLjSDh_wpN6K1kTDrQvyjxtH_tyMDjyoq1xe5PlIENBP7TTJRnsCP4rYu8WSSK17Oep3zP7xZWxxXtsjUpCiQLZxW1VEziBzLPrhVlx-l2fMaW8gBWlM6JQof9hLdNih1mAeAHOpCcMEHULzXStkJfBb91Rl0xrvfWSKr8DCYZM7ibi10IGnYiAZsR5CzovZFG",
  },
  {
    quote: "Hệ thống Quiz của funchinese rất gây nghiện. Học mà như chơi game vậy, không bao giờ thấy chán. Giáo viên sửa lỗi bài tập cũng rất chính xác và tận tình.",
    name: "Hoàng Long", role: "Sinh viên Đại học Ngoại thương",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9qHub9hcvKhoQE294TTvmRzpyTDQ3nknPsJ4S1rbtdAXmI3YXSl8bm1-fe28IPKKBAe3y0Bf1y-8wfva-FUDSfA0c5GI-PoYzUINb7RmyVtzZAcDrAXNQCrLS_U2pDjGGiEKQrKi9khInLllYi4F4fmuQD54g9fd6rRAvid8poV2cx-LBCAvTPlqMelGDQ49O7VcM2GIFzoru9nMJtCCsd6W0GUZbYBsjSOGUKtkdMvZ1nJU0QhfRfVJk0-2gLV3EvnJtaKYOOQ1I",
  },
  {
    quote: "Mình đã thử nhiều app nhưng đây là app đầu tiên mình kiên trì được hơn 3 tháng. Lộ trình học rất rõ ràng và khoa học, cực kỳ phù hợp cho người bận rộn.",
    name: "Linh Chi", role: "Freelance Designer",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDMgpQcymzK3dqIpNKZ8cVFmkgcEmhKSu9xproVNNaPvWs4nkgKRZJnYutwrZQ6SNHCJHZs4KAwstGO8MEm2fGjGFBVZoJLr89OhtLdr0V4N9S4BKbxVBNisLdCO2U-zlWtHkGzXp6APXy-Au_dl-vFcCeem7AWibzeVgrbEkuXDvSufxRJxbJ-DRwIBIa4RQNZWWrD9tQLRiEHf5xbUQ5oBnimFawb9_PZ4qnhNC1wGs5CIh9ZAaXNexyeu7uipWR71TKJD7ksrjSe",
  },
];

const HERO_AVATARS = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAJ4lVd79_xuGcHaYsk0lPr-_H3it60kWYC2eAdM56fm129xWlEHDtaOXeTJip9xgw8BJotZNznJ4FMBC0Pa87RShZxS8v7V3aWCTzr_NVBs57MdXJpVwGTTfw8lxrnSLjDLIj1qmYky670pVT7g9-toZpJt1v1wUJzZ7rngSFZjFvbUml5BbsAKGLxTlu6huG6LoPKnQy-jbvOi9LYrKIT2sQMhqV7iuYKIarpsxONZCKAyNzEg4AKVzdA_cnEFG0uKzJFLfIYPrSI",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDZVd4PffLRVfClcskC7N23EwGM_y46UHGryPRhy08QthmFdgNT3ZRL0JPc6TtCIll3jVv7UMcmdoDE_AySrVRyIj16IAlJKTlrGRFHPWqkUrbEj9zQp15-NZxQ324q18SGVcdRHWHbhtjtvT4i9atB2DPITClVQvA8NF5t5tfsx7SOSIjJyNWgLJ_lWIKuTFeZbo95hey3PiA10bE2o43NvYu7q4TemvdyxtGj1MzatqpT_5LEa6WuiC06JfhN8a5tpvUWvrgozQJP",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCWB7X9-xg8BBpGT4HucnEuoqV5jaQgyWEU7Uf3v6H_a69kMyrAE7JnmqJ8Hs4LvYUvByqY_lah6jIf4yFIxJKWYzyZA9SgGMY8xPbEaVxo6XDp1Ll6MFuXY1cWzK8BNGCW-qhf9MkjuFPSHfz201Qy7bqFJ-HjrcnmTqpMKyMCfRHDc-Ka7xi6z_9K0q-oxonVplBA8AJox7ZlPAZnC16AjzxQzeAd8qfCzt3--PFEPyUyKK5nGuetQHgh7SW60UyX44_QZ7EXREkG",
];

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-md z-50 border-b border-outline-variant/10">
      <div className="container mx-auto h-full px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="funchinese" width={32} height={32} className="object-contain" />
          <span className="text-xl font-extrabold tracking-tight text-primary">
            fun<span className="text-secondary">chinese</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            Tính năng
          </Link>
          <Link href="#hsk" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            Lộ trình HSK
          </Link>
          <Link href="#community" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            Cộng đồng
          </Link>
        </div>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-bold text-primary px-5 py-2 rounded-lg border border-primary/30 hover:bg-primary-fixed/50 transition-all"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="text-sm font-bold bg-primary text-on-primary px-5 py-2 rounded-lg shadow-sm hover:brightness-110 transition-all"
          >
            Bắt đầu học miễn phí
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-surface-container transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <span className="material-symbols-outlined text-on-surface">
            {open ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-surface border-t border-outline-variant/10 px-6 py-4 flex flex-col gap-3">
          {["#features|Tính năng", "#hsk|Lộ trình HSK", "#community|Cộng đồng"].map((item) => {
            const [href, label] = item.split("|");
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="text-sm font-semibold text-on-surface-variant py-2">
                {label}
              </Link>
            );
          })}
          <hr className="border-outline-variant/20" />
          <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-bold text-primary py-2">
            Đăng nhập
          </Link>
          <Link href="/register" onClick={() => setOpen(false)} className="text-sm font-bold bg-primary text-on-primary px-4 py-2.5 rounded-lg text-center">
            Bắt đầu học miễn phí
          </Link>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative pt-32 pb-24 px-6 min-h-screen flex items-center overflow-hidden bg-surface">
      {/* Decorative bg characters */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none opacity-[0.06]">
        <div className="absolute -top-16 -right-16 text-[28rem] chinese-text font-bold text-primary leading-none">學</div>
        <div className="absolute bottom-0 left-6 text-[18rem] chinese-text font-bold text-secondary leading-none">橋</div>
      </div>

      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
        {/* Left */}
        <div className="flex flex-col justify-center">
          <span className="inline-block px-4 py-1.5 bg-primary-fixed text-on-primary-fixed-variant rounded-full text-xs font-bold mb-5 w-max">
            Dành cho người Việt học tiếng Trung
          </span>

          <h1 className="text-5xl md:text-6xl font-extrabold text-on-surface leading-[1.1] tracking-tight mb-6">
            Học tiếng Trung
            <br /><span className="text-primary">cùng nhau mỗi ngày</span>
          </h1>

          <p className="text-lg text-on-surface-variant leading-relaxed mb-8 max-w-lg">
            Tận dụng nền tảng Hán Việt sẵn có để học từ vựng nhanh hơn.
            Phương pháp đơn giản, lộ trình rõ ràng — phù hợp cho người bận rộn.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="bg-primary text-on-primary px-8 py-3.5 rounded-lg text-base font-bold shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Bắt đầu học miễn phí
            </Link>
            <Link
              href="#hsk"
              className="text-primary px-8 py-3.5 rounded-lg text-base font-bold border border-outline-variant/30 hover:bg-surface-container-low transition-all"
            >
              Xem lộ trình HSK
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex items-center gap-4">
            <div className="flex -space-x-3">
              {HERO_AVATARS.map((src, i) => (
                <img key={i} src={src} alt="" className="w-10 h-10 rounded-full border-4 border-surface object-cover" />
              ))}
            </div>
            <div className="text-sm">
              <p className="font-bold text-on-surface">Nhiều học viên</p>
              <p className="text-on-surface-variant">đã bắt đầu chinh phục HSK</p>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="relative hidden lg:block">
          <div className="bg-gradient-to-br from-primary to-primary-container w-full aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAe8YfTtJQGKW6H5AfGs1YaPo6cq5lSNooU22RTiNJkXrZ77spC3OrXCJbYyoap_aylNpXaVwYP6FwRNttMIGvsDpPyFoxk9CrBaCAnT8YA_9rrWBVdOHPjs7xls7b4st6Bt8CuJbvAsFuATt4D3KmaFVoa99SZnDEL49JU2MC6-s1uZxujFtLKNMTkRCxfqc-ovIw3F1E5_9LOMAlwj5EakffpjJrcE2s6xBaoxU3tVKVFs3IHPXSeMt-EGP_Clfd1jsHpST1SHZ2Z"
              alt="Học viên học tiếng Trung"
              className="w-full h-full object-cover mix-blend-overlay opacity-60"
            />
            {/* Progress card */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="glass-panel p-6 rounded-2xl shadow-xl border border-white/20 w-64 rotate-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-on-secondary-container text-lg" style={FILL}>star</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mới hoàn thành</p>
                    <p className="text-sm font-bold text-on-surface">HSK 4 - Bài 12</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-primary-fixed rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[85%] rounded-full" />
                </div>
                <p className="mt-2 text-right text-xs font-bold text-primary">85% Hoàn thành</p>
              </div>
            </div>
          </div>

          {/* Streak card */}
          <div className="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 border border-outline-variant/10">
            <div className="bg-tertiary-container w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-white text-lg" style={FILL}>local_fire_department</span>
            </div>
            <div>
              <p className="text-lg font-extrabold text-on-surface leading-none">32 Ngày</p>
              <p className="text-xs text-on-surface-variant">Chuỗi học tập</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
function Features() {
  return (
    <section id="features" className="py-20 px-6 bg-surface-container-low">
      <div className="container mx-auto">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-3xl font-extrabold mb-4">Những gì bạn cần để bắt đầu</h2>
          <p className="text-on-surface-variant">
            Những công cụ cơ bản nhưng hiệu quả, giúp bạn học tiếng Trung mỗi ngày.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:h-[560px]">
          {/* Card 1 – Quiz */}
          <div className="md:col-span-7 bg-surface-container-lowest p-8 rounded-[2rem] flex flex-col justify-between group hover:shadow-lg transition-all border border-transparent hover:border-primary-container/20">
            <div>
              <div className="w-12 h-12 bg-primary-fixed rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-primary">psychology</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Quiz luyện tập</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed max-w-sm">
                Hàng ngàn câu hỏi theo từng cấp độ HSK. Tự động gợi ý những từ bạn hay quên để ôn luyện kịp thời.
              </p>
            </div>
            <div className="mt-6 overflow-hidden rounded-xl bg-surface-container-high h-32 relative">
              <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-40 group-hover:scale-105 transition-transform">
                {["你好", "学习", "成功"].map((c) => (
                  <div key={c} className="p-3 bg-white rounded-lg shadow-sm chinese-text text-lg font-bold">{c}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2 – Hán Việt */}
          <div className="md:col-span-5 bg-primary text-on-primary p-8 rounded-[2rem] flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-white">link</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Gốc Hán Việt</h3>
              <p className="text-on-primary/80 text-sm leading-relaxed">
                Mỗi từ tiếng Trung đều có gốc Hán Việt. Khi hiểu gốc, bạn sẽ nhớ từ đó dễ dàng hơn rất nhiều.
              </p>
            </div>
            <div className="relative z-10 mt-4 flex justify-end">
              <span className="material-symbols-outlined text-5xl text-white/20 group-hover:rotate-12 transition-transform">translate</span>
            </div>
          </div>

          {/* Card 3 – Leaderboard */}
          <div className="md:col-span-5 bg-secondary-container p-8 rounded-[2rem] hover:brightness-105 transition-all">
            <div className="w-12 h-12 bg-on-secondary-container/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-on-secondary-container" style={FILL}>military_tech</span>
            </div>
            <h3 className="text-xl font-bold text-on-secondary-fixed mb-3">Bảng xếp hạng</h3>
            <p className="text-on-secondary-fixed-variant text-sm leading-relaxed">
              Thi đua cùng hàng ngàn học viên khác. Nhận quà tặng và vinh danh khi lọt top những người học chăm chỉ nhất tuần.
            </p>
          </div>

          {/* Card 4 – Feedback */}
          <div className="md:col-span-7 bg-surface-container-lowest p-8 rounded-[2rem] flex items-center gap-6 hover:shadow-lg transition-all">
            <div className="flex-1">
              <div className="w-12 h-12 bg-tertiary-fixed rounded-2xl flex items-center justify-center mb-5">
                <span className="material-symbols-outlined text-on-tertiary-fixed-variant">forum</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Phản hồi cá nhân</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                AI tích hợp nhận xét chi tiết về phát âm và ngữ pháp ngay lập tức sau mỗi bài luyện nói.
              </p>
            </div>
            <div className="hidden sm:flex w-36 h-36 bg-surface-container-high rounded-full items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-5xl text-primary animate-pulse">mic</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}


// ─── DATA ───────────────────────────────────────────────────────────────
const HSK_LEVELS = [
  {
    num: 1,
    title: "HSK 1 – Nhập môn",
    badge: "Beginner",
    desc: "Làm quen với tiếng Trung, phát âm, pinyin và các mẫu câu cơ bản trong giao tiếp hàng ngày.",
  },
  {
    num: 2,
    title: "HSK 2 – Cơ bản",
    badge: "Elementary",
    desc: "Mở rộng khả năng giao tiếp với các tình huống quen thuộc như mua sắm, hỏi đường, giới thiệu bản thân.",
  },
  {
    num: 3,
    title: "HSK 3 – Sơ trung cấp",
    badge: "Intermediate",
    desc: "Có thể giao tiếp cơ bản trong công việc và đời sống, hiểu các đoạn hội thoại đơn giản.",
  },
  {
    num: 4,
    title: "HSK 4 – Trung cấp",
    badge: "Upper-Intermediate",
    desc: "Sử dụng tiếng Trung linh hoạt hơn, đọc hiểu nội dung dài và giao tiếp trôi chảy hơn.",
  },
  {
    num: 5,
    title: "HSK 5 – Trung cao cấp",
    badge: "Advanced",
    desc: "Đọc báo, xem phim và thảo luận nhiều chủ đề phức tạp với người bản xứ.",
  },
  {
    num: 6,
    title: "HSK 6 – Cao cấp",
    badge: "Mastery",
    desc: "Sử dụng tiếng Trung thành thạo trong học thuật và công việc chuyên sâu.",
  },
];

// ─── COMPONENT ──────────────────────────────────────────────────────────
 function HskLevels() {
  return (
    <section id="hsk" className="py-20 px-6">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="max-w-lg">
            <h2 className="text-3xl font-extrabold mb-3">
              Lộ trình học theo cấp HSK
            </h2>
            <p className="text-on-surface-variant">
              Từ HSK 1 đến HSK 6, mỗi cấp độ có định hướng rõ ràng giúp bạn tiến bộ từng bước.
            </p>
          </div>

          <Link
            href="/courses"
            className="text-primary font-bold flex items-center gap-1 hover:underline whitespace-nowrap text-sm"
          >
            Xem chi tiết
            <span className="material-symbols-outlined text-lg">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {HSK_LEVELS.map((h) => (
            <Link
              key={h.num}
              href={`/courses/hsk${h.num}`}
              className="p-7 rounded-3xl bg-surface-container-low hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all group"
            >
              {/* Level number */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-4xl font-black text-primary/20 group-hover:text-primary/40 transition-colors">
                  {h.num}
                </span>
              </div>

              {/* Title */}
              <h4 className="text-lg font-bold mb-2">{h.title}</h4>

              {/* Description only */}
              <p className="text-on-surface-variant text-sm leading-relaxed">
                {h.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  return (
    <section id="community" className="py-20 px-6 bg-primary-container text-on-primary-container overflow-hidden relative">
      <div className="container mx-auto relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold mb-3">Câu chuyện thành công</h2>
          <p className="text-on-primary-container/80 max-w-md mx-auto text-sm">
            Hàng ngàn học viên đã thay đổi sự nghiệp và cuộc sống nhờ làm chủ tiếng Trung.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-6 overflow-x-auto pb-4">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="min-w-[320px] md:min-w-[340px] bg-white/10 backdrop-blur-lg border border-white/20 p-7 rounded-[2rem]">
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className="material-symbols-outlined text-tertiary-fixed text-lg" style={FILL}>star</span>
                ))}
              </div>
              <p className="text-sm italic mb-6 leading-relaxed">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-sm">{t.name}</p>
                  <p className="text-xs opacity-70">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
    </section>
  );
}

// ─── Login CTA ────────────────────────────────────────────────────────────────
function LoginCTA() {
  return (
    <section className="py-20 px-6 bg-surface-container-low border-b border-outline-variant/10">
      <div className="container mx-auto">
        <div className="max-w-4xl mx-auto bg-surface-container-lowest rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col md:flex-row border border-outline-variant/20">
          {/* Left – Visual */}
          <div className="md:w-5/12 bg-primary p-10 text-on-primary flex flex-col justify-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
              <div className="absolute -top-10 -left-10 text-[14rem] chinese-text font-bold opacity-10 leading-none">進</div>
            </div>
            <div className="relative z-10">
              <h2 className="text-2xl font-extrabold mb-5 leading-snug">
                Sẵn sàng bắt đầu?
              </h2>
              <ul className="space-y-3">
                {[
                  "Lưu lại tiến độ học tập",
                  "Quiz cá nhân hóa theo cấp độ",
                  "Gợi ý từ vựng cần ôn luyện",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <span className="material-symbols-outlined text-secondary-fixed text-lg">check_circle</span>
                    <span className="text-on-primary/90">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right – Login prompt */}
          <div className="md:w-7/12 p-10 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">
              <h3 className="text-xl font-extrabold text-on-surface mb-2">Chào mừng trở lại!</h3>
              <p className="text-sm text-on-surface-variant mb-8">
                Đăng nhập để tiếp tục lộ trình học tiếng Trung của bạn.
              </p>

              {/* Primary login button */}
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-[0.98] transition-all mb-4"
              >
                <span className="material-symbols-outlined text-lg">login</span>
                Đăng nhập
              </Link>

              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/20" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-surface-container-lowest px-4 text-xs text-on-surface-variant uppercase font-medium">
                    Hoặc đăng nhập bằng
                  </span>
                </div>
              </div>

              {/* SSO options */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 border border-outline-variant/30 py-2.5 rounded-xl hover:bg-surface-container-low transition-all"
                >
                  <img
                    alt="Google"
                    className="w-4 h-4"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCFJzdBVJJLnQXone5fqnG-3rxK50XTsNRgWufOIalOLMI2Kq8i29w36zOQ-SeDtJOP3fE0L3-DtEtCyUhj79_fmOM6YwsCtyC4xrIlFA3RbNZ_AzeQU5rOwW38dcQo-AEw23HabKCUtGfgb5SBLpLTYfOVJpKJ3GZ33LOxwXTfCISyS6ioljVIn2uqHliPsTScKSlNUsXw8KCXpMgQPh5Au3yVJnRuqaMeW1OaZ0unxuUpjTh2yWV-Gwq5HktTTfFaXSxjDLTpHMgg"
                  />
                  <span className="text-sm font-bold">Google</span>
                </button>
                <Link
                  href="/api/auth/signin/keycloak"
                  className="flex items-center justify-center gap-2 border border-outline-variant/30 py-2.5 rounded-xl hover:bg-surface-container-low transition-all"
                >
                  <span className="material-symbols-outlined text-primary text-lg">shield_person</span>
                  <span className="text-sm font-bold">SSO</span>
                </Link>
              </div>

              {/* Register link */}
              <p className="text-center text-sm text-on-surface-variant">
                Chưa có tài khoản?{" "}
                <Link href="/register" className="text-primary font-bold hover:underline">
                  Đăng ký miễn phí
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-surface py-16 px-6">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Image src="/logo.png" alt="funchinese" width={32} height={32} className="object-contain" />
              <span className="text-xl font-extrabold text-primary">
                fun<span className="text-secondary">chinese</span>
              </span>
            </div>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Nền tảng học tiếng Trung dành cho người Việt. Đơn giản, hiệu quả, phù hợp cho người bận rộn.
            </p>
          </div>

          <div>
            <h5 className="font-bold mb-4">Sản phẩm</h5>
            <ul className="space-y-3 text-sm text-on-surface-variant">
              {["Tính năng", "Lộ trình HSK", "Kho từ vựng", "Nâng cấp Premium"].map((i) => (
                <li key={i}><Link href="#" className="hover:text-primary transition-colors">{i}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-4">Hỗ trợ</h5>
            <ul className="space-y-3 text-sm text-on-surface-variant">
              {[
                { label: "Trung tâm trợ giúp", href: "#" },
                { label: "Chính sách bảo mật", href: "/privacy" },
                { label: "Điều khoản sử dụng", href: "/terms" },
                { label: "Liên hệ", href: "/contact" },
              ].map((l) => (
                <li key={l.label}><Link href={l.href} className="hover:text-primary transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-bold mb-4">Kết nối</h5>
            <div className="flex gap-3 mb-5">
              {["public", "video_library", "alternate_email"].map((icon) => (
                <Link key={icon} href="#" className="w-9 h-9 bg-surface-container rounded-full flex items-center justify-center hover:bg-primary-fixed transition-colors">
                  <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
                </Link>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant mb-2">Tải ứng dụng trên</p>
            <div className="flex gap-2">
              <button className="bg-on-surface text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold">
                <span className="material-symbols-outlined text-sm">phone_iphone</span> App Store
              </button>
              <button className="bg-on-surface text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold">
                <span className="material-symbols-outlined text-sm">robot_2</span> Play Store
              </button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-on-surface-variant">
          <p>© 2025 funchinese. Tất cả quyền được bảo lưu.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-primary">Tiếng Việt</Link>
            <Link href="#" className="hover:text-primary">English</Link>
            <Link href="#" className="hover:text-primary">简体中文</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="bg-surface text-on-surface selection:bg-primary-fixed selection:text-on-primary-fixed-variant">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HskLevels />
        {/* <Testimonials /> */}
        <LoginCTA />
      </main>
      <Footer />
    </div>
  );
}
