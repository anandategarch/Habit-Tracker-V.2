"use client";

import type { CSSProperties } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";

export const FOCUS_SESSION_SECONDS = 25 * 60;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function FocusTimer({
  remainingSeconds,
  running,
  onToggle,
  onReset,
}: {
  remainingSeconds: number;
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
}) {
  const remaining = Math.max(0, Math.min(FOCUS_SESSION_SECONDS, remainingSeconds));
  const elapsed = FOCUS_SESSION_SECONDS - remaining;
  const progress = Math.round((elapsed / FOCUS_SESSION_SECONDS) * 100);
  const isComplete = remaining === 0;

  return (
    <section className="card focus-card" data-running={running ? "true" : "false"}>
      <div className="focus-card-heading">
        <div>
          <div className="small-label">RUANG FOKUS</div>
          <h2 className="section-title">Satu hal dalam satu waktu.</h2>
          <p className="section-caption">Fokus 25 menit. Beri ruang untuk hal yang penting.</p>
        </div>
        <span className="focus-icon"><Timer size={18} /></span>
      </div>
      <div className="focus-timer-layout">
        <div className="focus-ring" style={{ "--progress": `${progress}%` } as CSSProperties} role="timer" aria-label={`Sisa waktu ${formatTime(remaining)}`}>
          <div className="focus-ring-inner">
            <strong>{formatTime(remaining)}</strong>
            <span>{isComplete ? "SELESAI" : running ? "SEDANG FOKUS" : "SESI 25 MENIT"}</span>
          </div>
        </div>
        <div className="focus-actions">
          <button className="primary-button" type="button" onClick={onToggle} disabled={isComplete}>
            <span className="focus-toggle-icons" aria-hidden="true">
              <Play className="focus-play-icon" size={14} />
              <Pause className="focus-pause-icon" size={14} />
            </span>
            {running ? "Jeda" : isComplete ? "Selesai" : "Mulai fokus"}
          </button>
          <button className="secondary-button" type="button" onClick={onReset}><RotateCcw size={13} /> Ulangi</button>
        </div>
      </div>
      <p className="focus-timer-foot">
        {isComplete
          ? "Sesi fokus selesai. Beri ruang untuk jeda sebelum memilih langkah berikutnya."
          : running
            ? "Timer tetap berjalan saat kamu menjelajahi Rutina."
            : "Mulai kapan pun siap. Sesi tetap tersimpan saat kamu berpindah halaman."}
      </p>
    </section>
  );
}
