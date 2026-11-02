export function RutinaMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <path d="M16 28.2c.2-6.2.1-11.4-.2-16.4" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M15.8 19.2C8.8 19.2 5 15 5.2 7.3c7.2-.2 11 3.5 11.2 11.1-.2.3-.4.6-.6.8Z" fill="currentColor" />
      <path d="M16.7 14.5c.3-7.1 4.2-10.9 11-10.9.2 7.1-3.4 11-10.7 11.5" fill="currentColor" opacity=".82" />
      <path d="M15.5 10.5c-3.7-2.8-3.9-6-.1-9 3.8 2.8 3.8 6 .1 9Z" fill="#E8B765" />
      <path d="M16 20.2c-2.5 2.3-4.7 3.8-7.5 4.8M16 22.2c2.4 1.1 4.7 2.2 7.1 4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".68" />
      <circle cx="16" cy="28.2" r="2.2" fill="#E8B765" />
    </svg>
  );
}
