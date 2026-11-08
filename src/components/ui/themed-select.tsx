"use client";

/**
 * Dropdown tematik — pengganti <select> native.
 *
 * Popup <select> bawaan browser digambar oleh OS (hitam/polos seperti Google
 * Form di banyak perangkat) dan tidak bisa distyling. ThemedSelect merender
 * tombol combobox + daftar opsi botanical (kartu krem, check hijau, chevron
 * hutan) lewat portal ke <body> supaya tidak terpotong overflow modal.
 * Di layar <=560px daftar berubah menjadi bottom-sheet ala pedoman UI.
 *
 * Kompatibel drop-in dengan pola lama:
 * - children tetap <option> (nilai tanpa atribut value ikut nilai teksnya);
 * - form tetap membaca nilai lewat FormData — komponen menyisipkan
 *   <input type="hidden" name={name}> yang selalu sinkron;
 * - event `reset` form (event.currentTarget.reset() di handler) mengembalikan
 *   nilai internal ke defaultValue.
 */

import {
  useCallback, useEffect, useId, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from "react";
import { Children, isValidElement } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

interface SelectOption { value: string; label: string; }

/**
 * Ubah ReactNode menjadi teks tampilan tanpa koma penggabung array.
 * String([3, " · ", "Biasa"]) menghasilkan "3, · ,Biasa" (join koma bawaan
 * JavaScript) — flatten rekursif menjaga spasi & teks apa adanya.
 */
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function readOptions(children: ReactNode): SelectOption[] {
  const list: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const props = child.props as { value?: string | number; children?: ReactNode };
    const rawValue = props.value === undefined ? props.children : props.value;
    if (rawValue === undefined || rawValue === null) return;
    const value = String(rawValue);
    const label = nodeToText(props.children ?? value).trim() || value;
    list.push({ value, label });
  });
  return list;
}

export function ThemedSelect({ name, value, defaultValue, onChange, className = "", ariaLabel, labelledby, id, disabled = false, autoFocus = false, children }: {
  /** Nama field untuk FormData (input tersembunyi). */
  name?: string;
  /** Mode terkendali: bila diberikan, komponen tidak menyimpan nilai sendiri. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Kelas visual trigger, mis. "form-control" / "module-status-select". */
  className?: string;
  ariaLabel?: string;
  /** Id elemen <label> yang menjadi label aksesibel untuk trigger. */
  labelledby?: string;
  /** Id trigger — pasangkan dengan <label htmlFor={id}> bila Field tidak membungkus. */
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  children: ReactNode;
}) {
  const options = readOptions(children);
  const listboxId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const selected = value !== undefined ? value : internalValue;
  const selectedLabel = options.find((option) => option.value === selected)?.label ?? "";
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Bayangan nilai terpilih: dibaca oleh penangan klik opsi agar tidak
  // bergantung pada state yang bisa basi saat daftar diperbarui induk.
  const selectedRef = useRef(selected);
  useEffect(() => { selectedRef.current = selected; }, [selected]);

  const computePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const estimateHeight = Math.min(300, options.length * 44 + 22);
    const spaceBelow = window.innerHeight - rect.bottom;
    const below = spaceBelow >= estimateHeight || spaceBelow >= rect.top;
    return {
      left: Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - rect.width - 8)),
      top: below
        ? rect.bottom + 6
        : Math.max(8, rect.top - estimateHeight - 6),
      width: rect.width,
    };
  }, [options.length]);

  const openMenu = () => {
    const next = computePosition();
    if (!next) return;
    setPosition(next);
    const currentIndex = options.findIndex((option) => option.value === selectedRef.current);
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    setOpen(true);
  };

  const selectOption = (option: SelectOption) => {
    if (value === undefined) setInternalValue(option.value);
    onChange?.(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  // Selama terbuka: popover mengikuti posisi trigger saat halaman discroll
  // (termasuk momentum/momentum-smooth scroll — menutup paksa akan membuat
  // popup langsung hilang saat pengguna menget di tengah animasi). Scroll
  // di dalam daftar sendiri diabaikan; resize menutup menu.
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const handleScroll = (event: Event) => {
      if (listRef.current?.contains(event.target as Node)) return;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const next = computePosition();
        if (next) setPosition(next);
      });
    };
    const handleResize = () => { if (frame) cancelAnimationFrame(frame); setOpen(false); };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, computePosition]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  // form.reset() (dipakai handler tambah tugas/dompet/dll.) mengembalikan
  // input tersembunyi ke defaultValue — samakan label trigger-nya.
  useEffect(() => {
    const form = hiddenRef.current?.form;
    if (!form) return;
    const handleReset = () => setInternalValue(defaultValue ?? options[0]?.value ?? "");
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [defaultValue, options]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) openMenu();
        else setActiveIndex((current) => (current + 1) % Math.max(1, options.length));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) openMenu();
        else setActiveIndex((current) => (current - 1 + options.length) % Math.max(1, options.length));
        break;
      case "Home":
        if (open) { event.preventDefault(); setActiveIndex(0); }
        break;
      case "End":
        if (open) { event.preventDefault(); setActiveIndex(Math.max(0, options.length - 1)); }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (open) { const option = options[activeIndex]; if (option) selectOption(option); }
        else openMenu();
        break;
      case "Escape":
        if (open) {
          // Cegah modal induk (EntryModal, dst.) ikut tertutup.
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
        break;
      case "Tab":
        if (open) setOpen(false);
        break;
    }
  }

  return <>
    <input ref={hiddenRef} type="hidden" name={name} value={selected} aria-hidden="true" />
    <button
      ref={triggerRef}
      id={id}
      type="button"
      className={`themed-select-trigger ${className}`.trim()}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-controls={open ? listboxId : undefined}
      aria-label={ariaLabel}
      aria-labelledby={labelledby}
      aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
      disabled={disabled}
      autoFocus={autoFocus}
      onClick={() => { if (open) setOpen(false); else openMenu(); }}
      onKeyDown={handleKeyDown}
    >
      <span className="themed-select-value">{selectedLabel}</span>
      <ChevronDown size={14} className={`themed-select-chevron${open ? " is-open" : ""}`} aria-hidden="true" />
    </button>
    {open && position && createPortal(<>
      <div className="themed-select-backdrop" onMouseDown={() => {
        setOpen(false);
        // Kembalikan fokus ke trigger seperti pola WAI-ARIA combobox:
        // dismiss (click luar / Escape) selalu mengembalikan fokus.
        triggerRef.current?.focus();
      }} />
      <div ref={listRef} id={listboxId} className="themed-select-popover" role="listbox" aria-label={ariaLabel} style={position}>
        <span className="themed-select-grip" aria-hidden="true" />
        {options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="option"
            id={`${listboxId}-option-${index}`}
            data-index={index}
            aria-selected={option.value === selected}
            className={`themed-select-option${option.value === selected ? " is-selected" : ""}${index === activeIndex ? " is-active" : ""}`}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => selectOption(option)}
          >
            <span className="themed-select-option-label">{option.label}</span>
            {option.value === selected && <Check size={14} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </>, document.body)}
  </>;
}
