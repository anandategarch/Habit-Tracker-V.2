"use client";

// Full Bloom — perayaan layar penuh saat semua habit hari ini selesai (Fase 1)
// sekaligus panggung reveal "benih kejutan" (Fase 2, variable reward).

import { useEffect, useRef } from "react";
import { Sprout } from "lucide-react";
import type { GardenSeed, SeedRarity } from "@/lib/garden-rewards";

const RARITY_COPY: Record<SeedRarity, string> = {
  umum: "Benih umum · tumbuh di hampir semua kebun",
  langka: "Benih langka · jarang muncul, simpan baik-baik ✨",
  legendaris: "Benih legendaris · sangat jarang — kebunmu beruntung 🌟",
};

const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];

export function FullBloomOverlay({ seed, bloomStreak, onClose }: {
  seed: GardenSeed;
  bloomStreak: number;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(onClose, 9000);
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fx-bloom-layer" role="status" aria-live="polite" onClick={onClose}>
      <span className="fx-bloom-glow" aria-hidden="true" />
      <div className="fx-bloom-panel" onClick={(event) => event.stopPropagation()}>
        <span className="fx-bloom-fall" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i />
        </span>
        <div className="fx-bloom-flower" aria-hidden="true">
          <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
            <circle className="fx-bloom-halo" style={{ animationDelay: "80ms" }} cx="60" cy="60" r="40" fill="none" stroke="#f5d9a8" strokeOpacity="0.55" strokeWidth="2" strokeDasharray="3 7" strokeLinecap="round" />
            {PETAL_ANGLES.map((angle, index) => (
              <g key={angle} transform={`rotate(${angle} 60 60)`}>
                <ellipse
                  className="fx-bloom-petal"
                  style={{ animationDelay: `${140 + index * 70}ms` }}
                  cx="60" cy="27" rx="12" ry="20"
                  fill={index % 3 === 2 ? "#f5d9a8" : "#f2a48c"}
                  stroke={index % 3 === 2 ? "#d9a28a" : "#c97e5e"}
                  strokeWidth="1.6"
                />
              </g>
            ))}
            <circle className="fx-bloom-core" style={{ animationDelay: "560ms" }} cx="60" cy="60" r="13" fill="#f5d9a8" stroke="#d9a28a" strokeWidth="1.6" />
            <circle cx="56" cy="57" r="1.7" fill="#7a5b40" />
            <circle cx="64" cy="57" r="1.7" fill="#7a5b40" />
            <path className="fx-bloom-leafone" style={{ animationDelay: "640ms" }} d="M60 86 Q50 102 38 108 Q54 104 62 90 Z" fill="#7fb069" />
            <path className="fx-bloom-leaftwo" style={{ animationDelay: "720ms" }} d="M60 86 Q70 102 82 108 Q66 104 58 90 Z" fill="#5e8b5a" />
          </svg>
        </div>
        <div className="fx-bloom-copy">
          <span className="fx-bloom-kicker">SEMUA RITUAL SELESAI</span>
          <h2>Tamanmu berbunga hari ini 🌸</h2>
          <p>Setiap kebiasaan terjadwal sudah kamu rawat. Nikmati sejenak, lalu biarkan badanmu beristirahat.</p>
        </div>
        <div className="fx-bloom-seed" data-rarity={seed.rarity}>
          <span className="fx-bloom-seed-icon"><Sprout size={22} /></span>
          <div className="fx-bloom-seed-copy">
            <small>BENIH BARU DITEMUKAN</small>
            <strong>{seed.name}</strong>
            <span>{RARITY_COPY[seed.rarity]}</span>
          </div>
          {bloomStreak > 1 && <em className="fx-bloom-seed-streak">{bloomStreak} hari berbunga berturut-turut</em>}
        </div>
        <button ref={closeRef} type="button" className="fx-bloom-close" onClick={onClose}>
          Simpan ke kebun &amp; lanjutkan
        </button>
      </div>
    </div>
  );
}
