/**
 * The Voulti mark and lockup.
 *
 * The mark is drawn inline rather than pulled from /logo.svg so it inherits
 * `currentColor` — the same shape works green on the light header and white on
 * a dark surface, and it never flashes in late the way an <img> does.
 *
 * The vector lives in assets/brand/voulti-mark.svg. Change it there first.
 */

const ARMS =
  "M102.2 184L104.1 180.6L107.9 177.9L111.4 176.1L114.8 175.6L155.2 175.7L161.2 177.5L166.7 181.2L204.5 236.2L209.4 244.4L222.8 262.4L234.3 279.7L277.5 341.1L295 365.4L298 368.9L298.7 370.6L298.6 372.5L285.6 397.4L278.8 406.4L273.8 410.5L266.2 413.3L260 413.5L249.7 410.8L243.3 406.7L216 367.3L200.5 343.5L188.5 326.8L165.6 292.1L149.3 269.2L142 258.2L139.8 253.8L128.3 237.8L118.1 221.9L106.7 205.9L102 196.2L102 185ZM267 300.4L268.3 297.7L299.9 250.9L316.7 224.5L332.1 201.9L334.3 197.6L346.5 179.7L348.7 175.4L353 170.5L355.2 166.2L362.1 156.1L365.7 151.9L371.6 148.6L377.8 146.9L385.2 147.1L391 149.2L394.9 151.8L398.9 155.6L403.2 161.8L403.8 165.1L403.5 175.3L400.3 183.8L394.7 193.9L375 234.4L352.1 278.2L332.6 317.5L326.7 327.3L321.4 337.7L318.4 341.3L316.1 342.9L313.3 344L304.4 344.2L298.1 342.8L294 340.3L287.1 332.8L273.8 313.4L269.6 308.5L267.1 304.4L266.8 301.4Z"

/** Give the mark a `label` when it stands alone; leave it out beside a wordmark. */
export function VoultiMark({ className = "w-7 h-7", label }: { className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <circle cx="256" cy="256" r="218.4" stroke="currentColor" strokeWidth="43.2" />
      <path fill="currentColor" d={ARMS} />
    </svg>
  )
}

/** Mark plus wordmark, the way it appears in the header. */
export function VoultiLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <VoultiMark className="w-7 h-7 flex-shrink-0 text-[#288E5B]" />
      <span className="text-lg font-bold text-foreground">Voulti</span>
    </span>
  )
}
