"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * Theme toggle button — switches between light and dark Rutina themes.
 * Renders a neutral placeholder until mounted to avoid hydration mismatch
 * (next-themes reads localStorage, which is unavailable during SSR).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Mark as mounted so we can read `resolvedTheme` without causing a
  // hydration mismatch (next-themes reads localStorage, unavailable during SSR).
  // The setState-in-effect pattern here is intentional and matches the
  // documented next-themes usage; the single-fire mount guard is cheap.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        type="button"
        className="theme-toggle"
        aria-label="Ganti tema"
        disabled
        // Reserve space so the topbar does not shift on mount.
        style={{ visibility: "hidden" }}
      />
    );
  }

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={isDark}
      aria-label={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
      title={isDark ? "Tema terang" : "Tema gelap"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
