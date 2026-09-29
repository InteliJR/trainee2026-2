import type { SVGProps } from 'react'

const paths = {
  leaf: 'M20 4C10 2 3 6 4 13c.7 5 6 7 10 4 4-3 5-8 6-13ZM4 21l10-10M8 17v-5m0 5h5',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  back: 'M20 12H4m6-6-6 6 6 6',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  logout: 'M9 4H4v16h5m5-13 5 5-5 5M9 12h10',
  check: 'm5 12 4 4L19 6',
  plus: 'M12 5v14M5 12h14',
  clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6',
  truck:
    'M3 5h11v12H3zM14 9h4l3 4v4h-7M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  award: 'M17 8A5 5 0 1 1 7 8a5 5 0 0 1 10 0ZM8 12 6 22l6-3 6 3-2-10',
  route:
    'M7 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM21 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9',
  recycle:
    'm8 5 3-3 4 7m-7-4 2 4M18 10l4 1-4 7h-5m5-8-4 1M8 20l-4-1-3-6 4-6m3 13-1-5',
  lock: 'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4M12 14v3',
  info: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6M12 7v.1',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4m8-4v4M8 14h2m4 0h2m-8 3h2',
  box: 'm12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7 5l9 5',
} as const

export type IconName = keyof typeof paths

export default function Icon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  )
}
