"use client";
import type { ReactNode } from "react";

const links = [["home","Beranda"],["habits","Kebiasaan"],["finance","Keuangan"],["calendar","Kalender"],["insights","Insight"],["personal","Ruang personal"],["settings","Pengaturan"]] as const;

export function LabShell({ children, variant, active = "home" }: { children: ReactNode; variant: string; active?: "home" | "finance" }) {
  return <div className={"lab-app lab-app--" + variant}>
    <aside className="lab-sidebar">
      <div className="lab-brand"><span className="lab-brand-mark">r</span><span><strong>Rutina</strong><small>grow at your pace</small></span></div>
      <div className="lab-nav-label">RUANG UTAMA</div>
      <nav className="lab-nav" aria-label="Navigasi contoh">
        {links.map(([id,label]) => <div className={"lab-nav-item " + ((active === "finance" ? id === "finance" : id === "home") ? "is-active" : "")} key={id}><span className="lab-nav-glyph">{id === "home" ? "⌂" : id === "habits" ? "✓" : id === "finance" ? "↗" : id === "calendar" ? "▦" : id === "insights" ? "⌁" : id === "personal" ? "✳" : "⚙"}</span><span>{label}</span></div>)}
      </nav>
      <div className="lab-sidebar-foot"><span className="lab-avatar">A</span><span><strong>Ruang pribadimu</strong><small>Personal workspace</small></span></div>
    </aside>
    <div className="lab-main"><header className="lab-topbar"><div className="lab-breadcrumb"><span>Ruang pribadi</span><b>/</b><strong>{active === "finance" ? "Keuangan" : "Beranda"}</strong></div><div className="lab-top-actions"><span className="lab-search">⌕ <small>Cari sesuatu…</small><kbd>Ctrl K</kbd></span><span className="lab-sync">● Tersinkron</span><span className="lab-avatar small">A</span></div></header><div className="lab-content">{children}</div></div>
    <div className="lab-mobile-bar"><span>⌂ <small>Beranda</small></span><span>✓ <small>Habit</small></span><b>＋</b><span>↗ <small>Uang</small></span><span>▦ <small>Kalender</small></span></div>
  </div>;
}
