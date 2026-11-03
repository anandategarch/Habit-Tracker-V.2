// Audit satu tampilan: overflow, elemen terpotong, tap target, kontras teks utama.
// Jalankan lewat: agent-browser eval "$(cat audit-view.js)"
(() => {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const out = {
    viewport: vw,
    scrollWidth: sw,
    hOverflow: sw > vw + 1,
    offenders: [],
    smallTaps: [],
    tinyTexts: [],
    footer: null,
    version: null,
  };

  // Elemen yang menyebabkan overflow horizontal (melebihi viewport)
  const seen = new Set();
  document.querySelectorAll("body *").forEach((el) => {
    if (out.offenders.length >= 12) return;
    if (!(el instanceof HTMLElement)) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const overRight = r.right - vw;
    const overLeft = -r.left;
    if (overRight > 2 || overLeft > 2) {
      const key = el.tagName.toLowerCase() + "." + String(el.className && el.className.toString().split(" ")[0] || "").slice(0, 40);
      if (seen.has(key)) return;
      seen.add(key);
      out.offenders.push(`${key} | L${Math.round(r.left)} R${Math.round(r.right)} w${Math.round(r.width)} over:${Math.round(Math.max(overRight, overLeft))}px`);
    }
  });

  // Tap target kecil (<40px) pada elemen interaktif terlihat
  document.querySelectorAll("button, a[href], input, select, [role=button], [onclick]").forEach((el) => {
    if (out.smallTaps.length >= 10) return;
    if (!(el instanceof HTMLElement)) return;
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.height < 40 || r.width < 40) {
      const label = (el.textContent || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "?").trim().slice(0, 18);
      out.smallTaps.push(`${el.tagName.toLowerCase()}"${label}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  });

  // Teks terlalu kecil (<11px) — sulit dibaca di mobile
  document.querySelectorAll("body p, body span, body small, body a, body button, body strong, body b").forEach((el) => {
    if (out.tinyTexts.length >= 8) return;
    if (!(el instanceof HTMLElement)) return;
    if (!el.textContent.trim()) return;
    if (el.children.length > 0) return;
    const st = getComputedStyle(el);
    if (st.display === "none") return;
    const fs = parseFloat(st.fontSize);
    if (fs < 11) {
      out.tinyTexts.push(`${el.tagName.toLowerCase()}"${el.textContent.trim().slice(0, 16)}" ${fs.toFixed(1)}px`);
    }
  });

  // Footer & versi
  const footer = document.querySelector("footer, .site-footer, [class*=footer]:last-of-type");
  if (footer) {
    const fr = footer.getBoundingClientRect();
    out.footer = {
      cls: String(footer.className).slice(0, 40),
      bottom: Math.round(fr.bottom),
      innerH: window.innerHeight,
      sticky: Math.round(fr.bottom) <= window.innerHeight,
    };
  }
  const ver = document.querySelector(".site-footer-version, [class*=version]");
  out.version = ver ? ver.textContent.trim() : null;

  return JSON.stringify(out);
})()
