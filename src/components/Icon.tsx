interface IconProps {
  name: 'arrow' | 'arrow-up-right' | 'lock' | 'keyboard' | 'expand' | 'collapse' | 'close' | 'crosshair' | 'mouse' | 'check' | 'device' | 'pause' | 'rotate' | 'kick' | 'bolt' | 'swap';
  size?: number;
  className?: string;
}

export function Icon({ name, size = 20, className }: IconProps) {
  const shapes = {
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    'arrow-up-right': <path d="M6 18 18 6M6 6h12v12" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10" /></>,
    expand: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
    collapse: <path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    crosshair: <><circle cx="12" cy="12" r="7" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    mouse: <><rect x="5" y="2" width="14" height="20" rx="7" /><path d="M12 2v7M5 10h14" /></>,
    device: <><rect x="6" y="2" width="12" height="20" rx="2.5" /><path d="M10 5h4m-3 14h2" /></>,
    pause: <><path d="M8 5v14m8-14v14" strokeWidth="3" /></>,
    rotate: <><rect x="8" y="6" width="8" height="13" rx="1.5" transform="rotate(-25 12 12)" /><path d="M3 10a9 9 0 0 1 15-6m0-3v4h-4M21 14a9 9 0 0 1-15 6m0 3v-4h4" /></>,
    kick: <path d="m9 3 1 8 5 2 5 1 1 4-1 2H8l-3-4 2-6-1-7m2 13h5" />,
    bolt: <path d="m14 2-9 12h6l-1 8 9-12h-6l1-8Z" />,
    swap: <path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4" />,
    check: <path d="m5 12 4 4L19 6" />,
  };

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {shapes[name]}
    </svg>
  );
}
