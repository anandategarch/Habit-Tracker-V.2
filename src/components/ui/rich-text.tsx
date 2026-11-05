import type { ReactNode } from "react";

/**
 * <RichText/> — merender penanda **bold** pada string cerita dari
 * lib/storytelling jadi elemen <strong>, sehingga kata kunci mudah
 * dipindai dalam 3 detik tanpa membebani copy dengan JSX.
 *
 * "Hampir mekar! **Satu langkah lagi** 🌸" →
 *  Hampir mekar! <strong>Satu langkah lagi</strong> 🌸
 *
 * matchAll dipakai agar tidak ada state modul yang dimutasi (regex
 * literal baru per panggilan — aman untuk concurrent rendering).
 */

export function RichText({ text, className }: { text: string; className?: string }): ReactNode {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;
  for (const match of text.matchAll(/\*\*(.+?)\*\*/g)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));
    nodes.push(<strong key={`b-${key++}`}>{match[1]}</strong>);
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return <span className={className}>{nodes}</span>;
}
