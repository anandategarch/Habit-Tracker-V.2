"use client";

import { useEffect, useState } from "react";

export function TreeSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!isStandalone || prefersReducedMotion) return;

    const showTimeout = window.setTimeout(() => setVisible(true), 0);
    const hideTimeout = window.setTimeout(() => setVisible(false), 2600);
    return () => {
      window.clearTimeout(showTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="tree-splash" role="status" aria-label="Rutina sedang dibuka">
      <div className="tree-splash-content">
        <svg className="tree-splash-art" viewBox="0 0 360 360" role="img" aria-label="Ilustrasi pohon Rutina">
          <path className="tree-splash-ground" d="M54 310 C112 304 242 304 306 310" />
          <g className="tree-splash-seed">
            <ellipse cx="180" cy="302" rx="10" ry="13" fill="#b97942" />
            <path d="M179 294 C184 298 184 305 180 310" fill="none" stroke="#e8b765" strokeWidth="2" strokeLinecap="round" />
          </g>
          <path className="tree-splash-trunk" d="M176 310 C178 282 177 254 180 226 C181 211 177 193 175 174 C188 194 191 210 190 227 C198 205 213 185 233 169 C221 193 207 216 193 242 C192 268 195 289 198 310 Z" />
          <g className="tree-splash-branches">
            <path d="M182 248 C164 222 146 211 126 203" />
            <path d="M188 226 C204 209 220 201 239 198" />
            <path d="M180 269 C163 251 146 244 132 242" />
          </g>
          <g className="tree-splash-canopy">
            <ellipse cx="128" cy="176" rx="38" ry="34" fill="#b9d2bd" />
            <ellipse cx="158" cy="137" rx="48" ry="45" fill="#d9e9dd" />
            <ellipse cx="205" cy="133" rx="51" ry="48" fill="#edf3ec" />
            <ellipse cx="244" cy="167" rx="43" ry="39" fill="#c6dbc9" />
            <ellipse cx="111" cy="216" rx="34" ry="29" fill="#d9e9dd" />
            <ellipse cx="184" cy="190" rx="49" ry="43" fill="#f5f7f2" />
            <ellipse cx="254" cy="213" rx="34" ry="31" fill="#b9d2bd" />
            <ellipse cx="205" cy="91" rx="28" ry="26" fill="#d9e9dd" />
          </g>
          <path className="tree-splash-leaf-detail" d="M145 173 C154 163 160 153 164 141 M205 160 C217 148 226 135 231 119 M113 215 C124 207 130 198 134 190" />
        </svg>

        <div className="tree-splash-copy">
          <span className="tree-splash-kicker">PELACAK KEBIASAAN &amp; KEUANGAN</span>
          <h1>Rutina<span>.</span></h1>
        </div>
      </div>

      <button className="tree-splash-skip" type="button" onClick={() => setVisible(false)}>
        Lewati
      </button>
    </div>
  );
}
