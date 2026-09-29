/** Decorative contour lines echo routes and the circular life of materials. */
export default function RouteArtwork({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 520 400"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g stroke="currentColor" opacity=".15" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path
            key={i}
            d={`M${-90 + i * 22} 410C${-30 + i * 20} 230 ${160 + i * 12} 350 ${215 + i * 13} 180S${440 + i * 16} 170 560 ${-80 + i * 26}`}
          />
        ))}
        <circle cx="330" cy="175" r="135" />
        <circle cx="330" cy="175" r="162" />
        <circle cx="330" cy="175" r="189" />
      </g>
      <path
        d="M76 289h75c56 0 58-79 115-79h78c73 0 71-113 0-113h-25"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="5 7"
        opacity=".65"
      />
      <circle
        cx="76"
        cy="289"
        r="19"
        fill="var(--color-canopy)"
        stroke="currentColor"
      />
      <circle cx="76" cy="289" r="5" fill="currentColor" />
      <g transform="translate(285 65)">
        <rect width="64" height="64" rx="18" fill="var(--color-leaf)" />
        <path
          d="M46 18C24 15 15 26 20 39c6 11 25 3 26-21ZM19 46l17-17m-9 9v-8m0 8h8"
          stroke="var(--color-paper)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <circle cx="227" cy="226" r="6" fill="currentColor" />
      <circle cx="227" cy="226" r="13" stroke="currentColor" opacity=".4" />
    </svg>
  )
}
