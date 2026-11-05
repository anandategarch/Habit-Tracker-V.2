"use client";

// Cerita Minggu (Fase 3) — rekap minggu kalender terakhir bergaya "story":
// kartu pintasan di dashboard + pemutar layar penuh (progress bar, auto-
// advance, tap zone kiri/kanan, pause, keyboard). Viewer dirender via portal
// ke document.body agar bebas dari stacking context halaman.

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpenText, ChevronRight, History, Pause, Play, X } from "lucide-react";
import type { DailyCheckin } from "@/lib/module-types";
import type { Transaction } from "@/lib/types";
import { formatCompactRupiah, todayISO } from "@/lib/format";
import { getBloomDays, getSeedBank } from "@/lib/garden-rewards";
import { RichText } from "@/components/ui/rich-text";
import {
  buildStorySlides, buildWeeklyStoryMetrics, formatStoryRangeLabel, getStoryWeeks, isStorySeen, markStorySeen,
  type StoryHabitRecord, type StoryProgressRecord, type StorySlide, type StoryWeekRange, type WeeklyStoryMetrics,
} from "@/lib/weekly-story";

const SLIDE_MS: Record<StorySlide["kind"], number> = {
  cover: 6000,
  rhythm: 8500,
  bloom: 7500,
  finance: 8500,
  checkin: 7500,
  time: 7500,
  closing: 9000,
};

const CHAPTER_LABEL: Record<StorySlide["kind"], string> = {
  cover: "Pembuka",
  rhythm: "Ritme",
  bloom: "Kebun",
  finance: "Keuangan",
  checkin: "Dirimu",
  time: "Waktu",
  closing: "Penutup",
};

// ---------------------------------------------------------------------------
// Ilustrasi slide — SVG flat bergaya PEDOMAN UI (hijau/koral/amber/krem).
// ---------------------------------------------------------------------------

function StoryArt({ kind }: { kind: StorySlide["kind"] }) {
  if (kind === "cover") {
    return (
      <svg className="story-art" viewBox="0 0 200 130" aria-hidden="true">
        <ellipse cx="100" cy="118" rx="62" ry="7" fill="#e3d9bd" opacity=".55" />
        <path d="M100 84 C100 70 99 58 101 46" stroke="#5e8b5a" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M100 66 C82 66 72 56 74 42 C90 43 100 52 100 66Z" fill="#7fb069" />
        <path d="M101 55 C102 38 114 29 129 32 C131 47 119 56 101 55Z" fill="#5c9a69" />
        <path d="M52 88 C68 82 84 82 98 88 L98 100 C84 95 68 95 52 100Z" fill="#f6f1e4" stroke="#d9cba6" strokeWidth="1.6" />
        <path d="M102 88 C116 82 132 82 148 88 L148 100 C132 95 116 95 102 100Z" fill="#fbf7ec" stroke="#d9cba6" strokeWidth="1.6" />
        <path d="M100 87 L100 99" stroke="#d9cba6" strokeWidth="1.6" />
        <g fill="#f2a48c">
          <circle cx="36" cy="34" r="3.4" />
          <circle cx="164" cy="26" r="4.2" />
          <circle cx="172" cy="70" r="2.6" />
        </g>
        <path d="M48 30 l2.6 5.4 5.8.8 -4.2 4 1 5.7 -5.2-2.8 -5.2 2.8 1-5.7 -4.2-4 5.8-.8Z" fill="#f5d9a8" />
      </svg>
    );
  }
  if (kind === "rhythm") {
    return (
      <svg className="story-art" viewBox="0 0 200 130" aria-hidden="true">
        <ellipse cx="100" cy="116" rx="70" ry="7" fill="#e3d9bd" opacity=".55" />
        <path d="M40 112 L160 112" stroke="#cdbf9d" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="56" y="76" width="16" height="36" rx="8" fill="#a8c98f" />
        <rect x="84" y="52" width="16" height="60" rx="8" fill="#7fb069" />
        <rect x="112" y="64" width="16" height="48" rx="8" fill="#8fbd77" />
        <rect x="140" y="34" width="16" height="78" rx="8" fill="#417a57" />
        <path d="M148 34 C148 22 156 16 166 18 C166 28 158 34 148 34Z" fill="#5c9a69" />
        <g fill="#f5d9a8">
          <circle cx="46" cy="36" r="3" />
          <circle cx="60" cy="24" r="2.2" />
        </g>
      </svg>
    );
  }
  if (kind === "bloom") {
    return (
      <svg className="story-art" viewBox="0 0 200 130" aria-hidden="true">
        <ellipse cx="100" cy="118" rx="58" ry="7" fill="#e3d9bd" opacity=".55" />
        <g transform="translate(100 58)">
          {[0, 60, 120, 180, 240, 300].map((angle, index) => (
            <ellipse key={angle} transform={`rotate(${angle})`} cx="0" cy="-24" rx="11" ry="19"
              fill={index % 3 === 2 ? "#f5d9a8" : "#f2a48c"} stroke={index % 3 === 2 ? "#d9a28a" : "#c97e5e"} strokeWidth="1.5" />
          ))}
          <circle r="12" fill="#f5d9a8" stroke="#d9a28a" strokeWidth="1.5" />
          <circle cx="-3.4" cy="-2.6" r="1.6" fill="#7a5b40" />
          <circle cx="3.4" cy="-2.6" r="1.6" fill="#7a5b40" />
        </g>
        <path d="M100 82 Q90 100 78 106 Q94 102 102 88Z" fill="#7fb069" />
        <path d="M100 82 Q110 100 122 106 Q106 102 98 88Z" fill="#5e8b5a" />
        <path d="M100 82 L100 112" stroke="#5e8b5a" strokeWidth="3" strokeLinecap="round" />
        <g fill="#f2a48c">
          <circle cx="40" cy="30" r="3.2" />
          <circle cx="160" cy="38" r="2.6" />
        </g>
        <path d="M156 18 l2.4 5 5.4.7 -3.9 3.7 .9 5.3 -4.8-2.6 -4.8 2.6 .9-5.3 -3.9-3.7 5.4-.7Z" fill="#f5d9a8" />
      </svg>
    );
  }
  if (kind === "finance") {
    return (
      <svg className="story-art" viewBox="0 0 200 130" aria-hidden="true">
        <ellipse cx="100" cy="118" rx="64" ry="7" fill="#e3d9bd" opacity=".55" />
        <path d="M92 112 C92 88 92 66 92 46" stroke="#5e8b5a" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M92 84 C66 86 52 72 55 52 C76 53 92 64 92 84Z" fill="#7fb069" />
        <path d="M93 68 C94 44 110 32 130 35 C132 56 116 68 93 68Z" fill="#5c9a69" />
        <g stroke="#d9a28a" strokeWidth="1.6" fill="#f5d9a8">
          <circle cx="140" cy="94" r="12" />
          <circle cx="158" cy="102" r="12" />
        </g>
        <path d="M140 88 a7 7 0 0 1 6.8 5.4" stroke="#c98a4b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M137 93 h8 M137 97 h5" stroke="#c98a4b" strokeWidth="1.6" strokeLinecap="round" />
        <g fill="#f2a48c">
          <circle cx="42" cy="36" r="3" />
          <circle cx="54" cy="24" r="2.2" />
        </g>
      </svg>
    );
  }
  if (kind === "checkin") {
    return (
      <svg className="story-art" viewBox="0 0 200 130" aria-hidden="true">
        <ellipse cx="100" cy="118" rx="60" ry="7" fill="#e3d9bd" opacity=".55" />
        <path d="M118 26 C102 30 92 44 92 60 C92 62 92.2 64 92.6 66 C76 64 62 74 58 90 C74 96 92 90 100 76 C106 66 118 58 130 56 C132 46 128 32 118 26Z" fill="#f5d9a8" stroke="#d9a28a" strokeWidth="1.6" />
        <circle cx="112" cy="44" r="2.8" fill="#7a5b40" />
        <path d="M104 52 q4 3.6 8.5 1.4" stroke="#7a5b40" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <path d="M58 40 l2.4 5 5.4.7 -3.9 3.7 .9 5.3 -4.8-2.6 -4.8 2.6 .9-5.3 -3.9-3.7 5.4-.7Z" fill="#f2a48c" />
        <circle cx="146" cy="66" r="2.4" fill="#f2a48c" />
        <circle cx="44" cy="80" r="2" fill="#f5d9a8" />
        <path d="M148 92 C148 82 156 76 164 78 C164 86 158 92 148 92Z" fill="#7fb069" />
      </svg>
    );
  }
  if (kind === "time") {
    return (
      <svg className="story-art" viewBox="0 0 200 130" aria-hidden="true">
        <ellipse cx="100" cy="118" rx="58" ry="7" fill="#e3d9bd" opacity=".55" />
        <path d="M100 84 C100 66 99 48 101 32" stroke="#5e8b5a" strokeWidth="3.2" fill="none" strokeLinecap="round" />
        <path d="M100 62 C80 62 68 50 71 34 C89 35 100 46 100 62Z" fill="#7fb069" />
        <path d="M101 50 C102 30 116 20 133 24 C135 44 120 52 101 50Z" fill="#5c9a69" />
        <path d="M100 84 L100 114" stroke="#5e8b5a" strokeWidth="3" strokeLinecap="round" />
        <path d="M100 92 C88 96 80 104 78 112 Q92 108 100 100Z" fill="#8fbd77" />
        <path d="M142 66 C142 44 128 28 108 24" stroke="#d9a28a" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeDasharray="2 7" />
        <circle cx="108" cy="24" r="4.6" fill="#f5d9a8" stroke="#d9a28a" strokeWidth="1.5" />
        <path d="M156 44 l2.2 4.6 5 .7 -3.6 3.4 .8 4.9 -4.4-2.4 -4.4 2.4 .8-4.9 -3.6-3.4 5-.7Z" fill="#f5d9a8" />
        <g fill="#f2a48c">
          <circle cx="44" cy="30" r="3" />
          <circle cx="58" cy="18" r="2.2" />
        </g>
      </svg>
    );
  }
  // closing
  return (
    <svg className="story-art" viewBox="0 0 200 130" aria-hidden="true">
      <circle cx="150" cy="30" r="16" fill="#f5d9a8" />
      <circle cx="150" cy="30" r="22" fill="none" stroke="#f5d9a8" strokeOpacity=".45" strokeWidth="2" strokeDasharray="3 6" />
      <path d="M0 108 C36 86 66 96 100 102 C134 108 164 94 200 104 L200 130 L0 130Z" fill="#a8c98f" />
      <path d="M0 116 C40 102 80 110 120 114 C152 117 176 110 200 116 L200 130 L0 130Z" fill="#7fb069" />
      <path d="M100 96 C100 82 99 70 101 58" stroke="#5e8b5a" strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M100 80 C82 80 72 70 74 56 C90 57 100 66 100 80Z" fill="#5c9a69" />
      <path d="M101 68 C102 50 114 41 129 44 C131 59 119 68 101 68Z" fill="#7fb069" />
      <g fill="#f2a48c">
        <circle cx="42" cy="34" r="3" />
        <circle cx="60" cy="22" r="2.2" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Slide renderer.
// ---------------------------------------------------------------------------

function StorySlideView({ slide, onCta }: { slide: StorySlide; onCta: () => void }) {
  if (slide.kind === "cover") {
    return (
      <div className="story-view cover">
        <StoryArt kind="cover" />
        <span className="story-kicker">CERITA MINGGUMU</span>
        <h2 className="story-title">Pekan yang telah kamu rawat</h2>
        <p className="story-range">{slide.rangeLabel}</p>
        <p className="story-note">{slide.preview}. Ketuk sisi kanan untuk melanjutkan.</p>
      </div>
    );
  }
  if (slide.kind === "rhythm") {
    const max = Math.max(1, ...slide.daily.map((day) => day.count));
    return (
      <div className="story-view rhythm">
        <StoryArt kind="rhythm" />
        <span className="story-kicker">RITME KEBIASAAN</span>
        <h2 className="story-title">{slide.headline}</h2>
        <div className="story-hero-number">
          <strong>{slide.steps}</strong>
          <span>langkah tercatat</span>
        </div>
        <div className="story-week-bars" aria-hidden="true">
          {slide.daily.map((day) => (
            <div className="story-week-bar" key={day.date}>
              <div className="story-week-bar-track">
                <span style={{ height: day.count > 0 ? `${Math.max(10, Math.round(day.count / max * 100))}%` : "0%" }} />
              </div>
              <small>{day.label}</small>
            </div>
          ))}
        </div>
        <div className="story-chip-row">
          <span className="story-chip">{slide.activeDays}/7 hari aktif</span>
          {slide.strongestLabel && <span className="story-chip is-strong">🌿 {slide.strongestLabel}</span>}
          {slide.compare && (
            <span className={`story-chip delta-${slide.compare.tone}`}><RichText text={slide.compare.label} /></span>
          )}
        </div>
        <p className="story-note">{slide.message}</p>
      </div>
    );
  }
  if (slide.kind === "bloom") {
    return (
      <div className="story-view bloom">
        <StoryArt kind="bloom" />
        <span className="story-kicker">KEBUN &amp; BENIH</span>
        <h2 className="story-title">{slide.headline}</h2>
        <p className="story-note">{slide.message}</p>
        {slide.seeds.length > 0 ? (
          <div className="story-seeds">
            {slide.seeds.slice(0, 3).map((seed) => (
              <span className="story-seed" data-rarity={seed.rarity} key={seed.id}>🌱 {seed.name}</span>
            ))}
            {slide.seeds.length > 3 && <span className="story-seed more">+{slide.seeds.length - 3} benih lain</span>}
          </div>
        ) : (
          <span className="story-chip">Koleksi benihmu menunggu hari penuh 🌸</span>
        )}
      </div>
    );
  }
  if (slide.kind === "finance") {
    return (
      <div className="story-view finance">
        <StoryArt kind="finance" />
        <span className="story-kicker">KEUANGAN PEKAN LALU</span>
        <h2 className="story-title">{slide.headline}</h2>
        <div className="story-finance-grid">
          <div><small>Pemasukan</small><strong className="is-income">+{formatCompactRupiah(slide.income)}</strong></div>
          <div><small>Pengeluaran</small><strong className="is-expense">−{formatCompactRupiah(slide.expense)}</strong></div>
          <div><small>Sisa pekan</small><strong>{formatCompactRupiah(slide.net)}</strong></div>
        </div>
        {slide.topCategory && (
          <span className="story-chip">Terbesar: {slide.topCategory} · {formatCompactRupiah(slide.topCategoryAmount)}</span>
        )}
        {slide.compare && (
          <span className={`story-chip delta-${slide.compare.tone}`}><RichText text={slide.compare.label} /></span>
        )}
        <p className="story-note">{slide.message}</p>
      </div>
    );
  }
  if (slide.kind === "checkin") {
    return (
      <div className="story-view checkin">
        <StoryArt kind="checkin" />
        <span className="story-kicker">CHECK-IN DIRI</span>
        <h2 className="story-title">{slide.headline}</h2>
        <div className="story-hero-number">
          <strong>{slide.avgMood.toLocaleString("id-ID", { maximumFractionDigits: 1 })}<em>/5</em></strong>
          <span>mood rata-rata · terasa {slide.moodWord}</span>
        </div>
        <span className="story-chip">Tidur rata-rata {slide.avgSleep.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jam/hari</span>
        {slide.compare && (
          <span className={`story-chip delta-${slide.compare.tone}`}><RichText text={slide.compare.label} /></span>
        )}
        <p className="story-note">{slide.message}</p>
      </div>
    );
  }
  if (slide.kind === "time") {
    return (
      <div className="story-view time">
        <StoryArt kind="time" />
        <span className="story-kicker">WAKTU UNTUK DIRMU</span>
        <h2 className="story-title">{slide.headline}</h2>
        <div className="story-hero-number">
          <strong>{slide.minutes}</strong>
          <span>menit tercatat pekan lalu</span>
        </div>
        <div className="story-chip-row">
          {slide.hoursLabel && <span className="story-chip">{slide.hoursLabel}</span>}
          <span className="story-chip">{slide.days} hari berdurasi</span>
        </div>
        <p className="story-note"><RichText text={slide.message} /></p>
      </div>
    );
  }
  return (
    <div className="story-view closing">
      <StoryArt kind="closing" />
      <span className="story-kicker">PENUTUP</span>
      <h2 className="story-title">Minggu baru telah dimulai</h2>
      <p className="story-range">{slide.rangeLabel} · {slide.recap}</p>
      <p className="story-note">Apa pun yang pekan lalu berikan, kamu tumbuh karenanya. Tanam satu langkah pertama untuk pekan ini.</p>
      <button type="button" className="story-cta" onClick={onCta}>Mulai minggu ini 🌱</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Viewer layar penuh.
// ---------------------------------------------------------------------------

function StoryViewer({ slides, weekKey, onClose }: {
  slides: StorySlide[];
  weekKey: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);
  const remainingRef = useRef(-1); // -1 = mulai fresh untuk slide aktif.
  const skipSaveRef = useRef(false); // true saat navigasi: cleanup tidak boleh menimpa sisa waktu.
  const activeBarRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const apiRef = useRef<{ next: () => void; prev: () => void; finish: () => void }>({
    next: () => {}, prev: () => {}, finish: () => {},
  });

  const slide = slides[index];
  const duration = SLIDE_MS[slide.kind];

  useEffect(() => { setMounted(true); }, []);

  const finish = () => { markStorySeen(weekKey); onClose(); };
  const next = () => {
    if (index >= slides.length - 1) { finish(); return; }
    skipSaveRef.current = true;
    remainingRef.current = -1;
    setIndex(index + 1);
  };
  const prev = () => {
    if (index <= 0) { remainingRef.current = -1; return; }
    skipSaveRef.current = true;
    remainingRef.current = -1;
    setIndex(index - 1);
  };
  // Selarukan API navigasi untuk loop rAF & keyboard (assignment ref hanya
  // boleh terjadi di dalam effect, bukan saat render).
  useEffect(() => {
    apiRef.current = { next, prev, finish };
  });

  // rAF progress loop — sinkron sempurna dengan timer (satu sumber waktu).
  useEffect(() => {
    if (paused) return;
    if (remainingRef.current < 0) remainingRef.current = duration;
    const startedAt = performance.now() - (duration - remainingRef.current);
    let frame = 0;
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - startedAt) / duration);
      if (activeBarRef.current) activeBarRef.current.style.width = `${ratio * 100}%`;
      if (ratio >= 1) { apiRef.current.next(); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      // Simpan sisa waktu hanya untuk pause (bukan navigasi antar slide):
      // saat navigasi, remainingRef sudah di-reset ke -1 oleh next/prev.
      if (!skipSaveRef.current) {
        remainingRef.current = Math.max(0, duration - (performance.now() - startedAt));
      }
      skipSaveRef.current = false;
    };
  }, [index, paused, duration]);

  // Keyboard + fokus awal + kunci scroll body.
  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") apiRef.current.finish();
      else if (event.key === "ArrowRight") apiRef.current.next();
      else if (event.key === "ArrowLeft") apiRef.current.prev();
      else if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        setPaused((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="story-viewer" role="dialog" aria-modal="true" aria-label={`Cerita minggu lalu, slide ${index + 1} dari ${slides.length}`}>
      <div className="story-frame" data-kind={slide.kind}>
        <header className="story-topbar">
          <div
            className="story-progress"
            role="progressbar"
            aria-label={`Progres slide ${index + 1} dari ${slides.length}`}
            aria-valuenow={index + 1}
            aria-valuemin={1}
            aria-valuemax={slides.length}
          >
            {slides.map((item, slideIndex) => (
              <span className={`story-seg${slideIndex === index ? " is-active" : slideIndex < index ? " is-done" : ""}`} key={slideIndex}>
                <i ref={slideIndex === index ? activeBarRef : undefined} style={{ width: slideIndex < index ? "100%" : "0%" }} />
              </span>
            ))}
          </div>
          <div className="story-topbar-row">
            <span className="story-chapter">{CHAPTER_LABEL[slide.kind]}</span>
            <div className="story-topbar-actions">
              <button
                type="button"
                className="story-icon-button"
                onClick={() => setPaused((value) => !value)}
                aria-pressed={paused}
                aria-label={paused ? "Lanjutkan cerita" : "Jeda cerita"}
              >
                {paused ? <Play size={15} /> : <Pause size={15} />}
              </button>
              <button type="button" className="story-icon-button" ref={closeRef} onClick={finish} aria-label="Tutup cerita">
                <X size={16} />
              </button>
            </div>
          </div>
        </header>
        <div className="story-stage" key={index}>
          <StorySlideView slide={slide} onCta={finish} />
        </div>
        <button type="button" className="story-tapzone is-left" onClick={prev} aria-label="Slide sebelumnya" tabIndex={-1} />
        <button type="button" className="story-tapzone is-right" onClick={next} aria-label="Slide berikutnya" tabIndex={-1} />
        <span className="story-nav-hint" aria-hidden="true">
          <small>‹</small>
          <small>ketuk untuk lanjut</small>
          <small>›</small>
        </span>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Kartu pintasan di dashboard + pengumpul data + arsip cerita.
// ---------------------------------------------------------------------------

const ARCHIVE_DEPTH = 4; // pekan lalu + 3 pekan arsip; pekan ke-5 hanya pembanding.

type RecordsState = { records: StoryHabitRecord[]; progress: StoryProgressRecord[]; ok: boolean } | null;

function isHabitRecord(item: unknown): item is StoryHabitRecord {
  return Boolean(item && typeof item === "object" &&
    typeof (item as StoryHabitRecord).habitId === "string" &&
    typeof (item as StoryHabitRecord).title === "string" &&
    typeof (item as StoryHabitRecord).date === "string");
}

function isProgressRecord(item: unknown): item is StoryProgressRecord {
  return Boolean(item && typeof item === "object" &&
    typeof (item as StoryProgressRecord).habitId === "string" &&
    typeof (item as StoryProgressRecord).title === "string" &&
    typeof (item as StoryProgressRecord).date === "string" &&
    typeof (item as StoryProgressRecord).timeSpentMinutes === "number");
}

export function WeeklyStorySection({ transactions, checkins }: {
  transactions: Transaction[];
  checkins: DailyCheckin[];
}) {
  // 5 rentang: [pekan lalu, 3 pekan arsip, 1 pembanding arsip terakhir].
  const [ranges] = useState<StoryWeekRange[]>(() => getStoryWeeks(todayISO(), ARCHIVE_DEPTH + 1));
  const [recordsState, setRecordsState] = useState<RecordsState>(null);
  const [seenKeys, setSeenKeys] = useState<Record<string, boolean>>({});
  const [viewingKey, setViewingKey] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [seedVersion, setSeedVersion] = useState(0);

  // Riwayat habit + durasi dari server — mencakup SEMUA rentang arsip
  // (biasanya berbagi bulan kalender yang sama, jadi tetap hemat permintaan).
  useEffect(() => {
    let cancelled = false;
    const months = [...new Set(ranges.flatMap((range) => [range.start.slice(0, 7), range.end.slice(0, 7)]))];
    void Promise.all(months.map(async (month) => {
      const response = await fetch(`/api/history?month=${encodeURIComponent(month)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("history unavailable");
      const payload = await response.json() as { records?: unknown; progress?: unknown };
      return {
        records: Array.isArray(payload.records) ? payload.records.filter(isHabitRecord) : [],
        progress: Array.isArray(payload.progress) ? payload.progress.filter(isProgressRecord) : [],
      };
    }))
      .then((byMonth) => {
        if (cancelled) return;
        setRecordsState({
          records: byMonth.flatMap((month) => month.records),
          progress: byMonth.flatMap((month) => month.progress),
          ok: true,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setRecordsState({ records: [], progress: [], ok: false });
      });
    return () => { cancelled = true; };
  }, [ranges]);

  // Benih baru bisa masuk saat aplikasi terbuka — segarkan pratinjau kartu.
  useEffect(() => {
    const onSeedAdded = () => setSeedVersion((value) => value + 1);
    window.addEventListener("rutina:seed-added", onSeedAdded);
    return () => window.removeEventListener("rutina:seed-added", onSeedAdded);
  }, []);

  const metricsByKey = useMemo(() => {
    if (!recordsState) return null;
    const map = new Map<string, WeeklyStoryMetrics>();
    ranges.forEach((range) => {
      const inRange = (date: string) => date >= range.start && date <= range.end;
      map.set(range.weekKey, buildWeeklyStoryMetrics({
        range,
        habitRecords: recordsState.records.filter((record) => inRange(record.date)),
        historyAvailable: recordsState.ok,
        transactions,
        seeds: getSeedBank(),
        bloomDays: getBloomDays(),
        checkins,
        progress: recordsState.progress.filter((record) => inRange(record.date)),
      }));
    });
    return map;
    // seedVersion memaksa pembacaan ulang seed bank (localStorage).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordsState, transactions, checkins, ranges, seedVersion]);

  useEffect(() => {
    if (!metricsByKey) return;
    const next: Record<string, boolean> = {};
    metricsByKey.forEach((metrics, key) => { next[key] = isStorySeen(key); });
    setSeenKeys(next);
  }, [metricsByKey]);

  const primaryRange = ranges[0];
  const archiveRanges = ranges.slice(1, ARCHIVE_DEPTH);
  const primaryMetrics = metricsByKey?.get(primaryRange.weekKey) ?? null;

  const slidesFor = (key: string): StorySlide[] => {
    const metrics = metricsByKey?.get(key);
    if (!metrics) return [];
    const index = ranges.findIndex((range) => range.weekKey === key);
    const previous = index >= 0 && index + 1 < ranges.length
      ? metricsByKey?.get(ranges[index + 1].weekKey)
      : undefined;
    return buildStorySlides(metrics, previous);
  };

  const watch = (key: string) => {
    markStorySeen(key);
    setSeenKeys((current) => ({ ...current, [key]: true }));
    setArchiveOpen(false);
    setViewingKey(key);
  };

  if (!primaryMetrics || !primaryMetrics.hasActivity) return null;

  const previewBits = [
    primaryMetrics.steps > 0 ? `${primaryMetrics.steps} langkah` : "",
    primaryMetrics.seeds.length > 0 ? `${primaryMetrics.seeds.length} benih` : "",
    primaryMetrics.finance.count > 0 ? `${primaryMetrics.finance.count} catatan uang` : "",
    primaryMetrics.checkin.count > 0 ? `${primaryMetrics.checkin.count} check-in` : "",
  ].filter(Boolean).join(" · ");

  const archiveHasContent = archiveRanges.some((range) => metricsByKey?.get(range.weekKey)?.hasActivity);

  return (
    <>
      <section className="story-card" aria-label="Cerita minggu lalu">
        <span className="story-card-icon"><BookOpenText size={20} /></span>
        <div className="story-card-copy">
          <span className="small-label">CERITA MINGGU LALU</span>
          <strong>{primaryMetrics.rangeLabel}</strong>
          <p>{previewBits}. Tonton ringkasan singkat pekanmu.</p>
        </div>
        {!seenKeys[primaryRange.weekKey] && <span className="story-card-badge">Baru</span>}
        <button
          type="button"
          className="story-card-open"
          onClick={() => watch(primaryRange.weekKey)}
        >
          Tonton <ChevronRight size={14} />
        </button>
      </section>
      {archiveHasContent && (
        <button type="button" className="story-archive-link" onClick={() => setArchiveOpen(true)}>
          <History size={14} /> Arsip cerita · {archiveRanges.length} pekan sebelumnya
        </button>
      )}
      {archiveOpen && metricsByKey && (
        <StoryArchiveOverlay
          ranges={archiveRanges}
          metricsByKey={metricsByKey}
          seenKeys={seenKeys}
          onWatch={watch}
          onClose={() => setArchiveOpen(false)}
        />
      )}
      {viewingKey && (
        <StoryViewer
          slides={slidesFor(viewingKey)}
          weekKey={viewingKey}
          onClose={() => setViewingKey(null)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Overlay arsip — daftar pekan-pekan sebelumnya yang bisa ditonton ulang.
// ---------------------------------------------------------------------------

function StoryArchiveOverlay({ ranges, metricsByKey, seenKeys, onWatch, onClose }: {
  ranges: StoryWeekRange[];
  metricsByKey: Map<string, WeeklyStoryMetrics>;
  seenKeys: Record<string, boolean>;
  onWatch: (weekKey: string) => void;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);
  if (!mounted) return null;
  return createPortal(
    <div className="story-archive" role="dialog" aria-modal="true" aria-label="Arsip cerita minggu">
      <button type="button" className="story-archive-scrim" aria-label="Tutup arsip" tabIndex={-1} onClick={onClose} />
      <div className="story-archive-panel">
        <header className="story-archive-head">
          <div>
            <span className="story-archive-kicker">ARSIP CERITAMU</span>
            <strong>Tonton ulang pekan-pekanmu</strong>
          </div>
          <button type="button" className="story-icon-button" ref={closeRef} onClick={onClose} aria-label="Tutup arsip">
            <X size={16} />
          </button>
        </header>
        <p className="story-archive-note">Setiap pekan dirangkai ulang dari catatan aslimu — pekan sepi pun boleh ditonton.</p>
        <div className="story-archive-list">
          {ranges.map((range) => {
            const metrics = metricsByKey.get(range.weekKey);
            const preview = metrics
              ? [
                metrics.steps > 0 ? `${metrics.steps} langkah` : "",
                metrics.finance.count > 0 ? `${metrics.finance.count} catatan uang` : "",
                metrics.checkin.count > 0 ? `${metrics.checkin.count} check-in` : "",
              ].filter(Boolean).join(" · ")
              : "";
            return (
              <button type="button" className="story-archive-row" key={range.weekKey} onClick={() => onWatch(range.weekKey)}>
                <span className="story-archive-date">{metrics?.rangeLabel ?? formatStoryRangeLabel(range)}</span>
                {!seenKeys[range.weekKey] && <span className="story-archive-badge">Baru</span>}
                <span className="story-archive-preview">{metrics?.hasActivity ? preview || "pekan dengan catatan minim" : "sepi — belum ada catatan"}</span>
                <span className="story-archive-action">Tonton <ChevronRight size={13} /></span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
