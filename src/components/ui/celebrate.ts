"use client";

// Perayaan kecil (Fase 1): leaf burst botani + angka roll-up.
// Dipisah sebagai modul UI murni agar bisa dipakai primitives & view sekaligus.

import { useEffect, useRef, useState } from "react";

const LEAF_COLORS = ["#7fb069", "#a3c585", "#5e8b5a", "#f2a48c", "#f5d9a8", "#8eae86"];
const PARTICLE_COUNT = 8;
const SPARKLE_COUNT = 3;
const LIFETIME_MS = 1050;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Ledakan daun & kelopak dari elemen (mis. tombol centang habit).
 * Aman dipanggil berulang; tidak melakukan apa pun bila reduce-motion aktif.
 */
export function burstLeaves(source: HTMLElement | null): void {
  if (!source || typeof document === "undefined" || prefersReducedMotion()) return;
  const rect = source.getBoundingClientRect();
  const host = document.createElement("span");
  host.className = "fx-leaf-burst";
  host.setAttribute("aria-hidden", "true");
  host.style.left = `${rect.left + rect.width / 2}px`;
  host.style.top = `${rect.top + rect.height / 2}px`;

  const total = PARTICLE_COUNT + SPARKLE_COUNT;
  for (let index = 0; index < total; index += 1) {
    const sparkle = index >= PARTICLE_COUNT;
    const particle = document.createElement("i");
    const angle = (Math.PI * 2 * index) / total + (Math.random() - 0.5) * 0.6;
    const distance = 34 + Math.random() * 46;
    particle.className = sparkle ? "fx-spark" : Math.random() > 0.55 ? "fx-petal" : "fx-leaf";
    particle.style.setProperty("--fx-x", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--fx-y", `${Math.sin(angle) * distance - 26}px`);
    particle.style.setProperty("--fx-r", `${Math.round((Math.random() - 0.5) * 260)}deg`);
    particle.style.setProperty("--fx-d", `${Math.round(40 + Math.random() * 90)}ms`);
    particle.style.setProperty("--fx-s", `${(0.8 + Math.random() * 0.5).toFixed(2)}`);
    if (!sparkle) particle.style.background = LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)];
    host.appendChild(particle);
  }

  document.body.appendChild(host);
  window.setTimeout(() => host.remove(), LIFETIME_MS);
}

/**
 * Angka roll-up (count-up) untuk statistik & rupiah.
 * Animasi dari nilai tampil sebelumnya ke target; snap saat reduce-motion.
 */
export function useCountUp(target: number, durationMs = 820, delayMs = 140): number {
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    if (prefersReducedMotion() || durationMs <= 0) {
      displayRef.current = target;
      setDisplay(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const from = displayRef.current;
    const step = (time: number) => {
      if (!start) start = time;
      const elapsed = Math.max(0, time - start - delayMs);
      const progress = Math.min(1, durationMs > 0 ? elapsed / durationMs : 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (target - from) * eased);
      if (value !== displayRef.current) {
        displayRef.current = value;
        setDisplay(value);
      }
      if (progress < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [target, durationMs, delayMs]);

  return display;
}
