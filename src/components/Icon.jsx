// Stroke icons (Feather-inspired, custom-drawn)
export const I = {
  home: <path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M9 11h6M9 15h4"/></>,
  camera: <><path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/></>,
  chart: <><path d="M3 21h18M6 17V9M11 17V5M16 17v-6M21 17v-3"/></>,
  layers: <><path d="M12 2L2 8l10 6 10-6z"/><path d="M2 14l10 6 10-6M2 11l10 6 10-6"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  close: <path d="M6 6l12 12M6 18L18 6"/>,
  chevronRight: <path d="M9 6l6 6-6 6"/>,
  cameraBig: <><path d="M3 7h3l2-3h8l2 3h3v13H3z"/><circle cx="12" cy="13" r="4"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></>,
  map: <><path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></>,
  report: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></>,
  filter: <path d="M3 6h18M6 12h12M10 18h4"/>,
  check: <path d="M4 12l5 5L20 6"/>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 14h10l1-14M9 7V4h6v3"/></>,
  pin: <><path d="M12 2L8 6v6L4 14v2h7v6l1 0 1 0v-6h7v-2l-4-2V6z"/></>,
  cloud: <path d="M7 18a4 4 0 0 1-1-7.9A5 5 0 0 1 15 8.5 4 4 0 0 1 17 18z"/>,
  warn: <><path d="M12 2L1 21h22z"/><path d="M12 9v5M12 17h0"/></>
}

export function Icon({ name, size = 22, stroke = 'currentColor', strokeWidth = 1.8, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {I[name]}
    </svg>
  )
}
