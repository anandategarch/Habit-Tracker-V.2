"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Wraps the app with next-themes so dark mode is reachable. We use the
 * `data-theme` attribute (rather than the default `class`) so it lines up
 * with the existing CSS in rutina-botanical.css which uses
 * `html[data-theme="dark"]` selectors.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
