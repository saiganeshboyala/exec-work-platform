/**
 * Inline SVG rather than emoji. Emoji glyphs depend on a font being present and
 * fall back to an empty box when it is not, which reads as a broken control.
 * These inherit currentColor, so they follow the button they sit in.
 */
export function CalendarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="3.5" width="12" height="11" rx="2" />
      <path d="M2 6.75h12M5.5 2v3M10.5 2v3" />
    </svg>
  );
}

export function WarningIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 2.5 1.8 13.2h12.4L8 2.5Z" strokeLinejoin="round" />
      <path d="M8 6.6v3.1M8 11.6v.05" />
    </svg>
  );
}
