"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";

const SESSION_SECONDS = 25 * 60;

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function FocusTimer() {
  const [remaining, setRemaining] = useState(SESSION_SECONDS);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining === 0) return;
    const interval = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, remaining]);

  const elapsed = SESSION_SECONDS - remaining;
  const progress = Math.round((elapsed / SESSION_SECONDS) * 100);
  const isComplete = remaining === 0;

  function reset() {
    setRunning(false);
    setRemaining(SESSION_SECONDS);
  }

  return (
    <section className="card focus-card">
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
          <button className="primary-button" type="button" onClick={() => setRunning((current) => !current)} disabled={isComplete}>
            {running ? <Pause size={14} /> : <Play size={14} />}
            {running ? "Jeda" : isComplete ? "Selesai" : "Mulai fokus"}
          </button>
          <button className="secondary-button" type="button" onClick={reset}><RotateCcw size={13} /> Ulangi</button>
        </div>
      </div>
      <p className="focus-timer-foot">{isComplete ? "Sesi fokus selesai. Istirahat sejenak sebelum mulai lagi." : running ? "Jauhkan distraksi dan fokus pada satu hal." : "Timer berjalan selama halaman tetap terbuka."}</p>
    </section>
  );
}
