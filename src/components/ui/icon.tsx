export function Icon({
  name,
}: {
  name:
    | 'sun'
    | 'moon'
    | 'menu'
    | 'close'
    | 'arrow'
    | 'phone'
    | 'instagram'
    | 'map-pin'
    | 'external'
    | 'down'
    | 'camera'
    | 'play'
    | 'grid'
    | 'editorial';
}) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`ui-icon ui-icon--${name}`}
      focusable="false"
    >
      {name === 'moon' && (
        <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />
      )}
      {name === 'sun' && (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
        </>
      )}
      {name === 'menu' && <path d="M4 7h16M4 12h16M4 17h16" />}
      {name === 'close' && <path d="m6 6 12 12M6 18 18 6" />}
      {name === 'arrow' && <path d="M3 12h18m-6-6 6 6-6 6" />}
      {name === 'phone' && (
        <path d="M8 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-4l-5-2-2 3a14 14 0 0 1-7-7l3-2-2-5Z" />
      )}
      {name === 'instagram' && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle
            cx="17.5"
            cy="6.5"
            r=".75"
            fill="currentColor"
            stroke="none"
          />
        </>
      )}
      {name === 'map-pin' && (
        <>
          <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.5" />
        </>
      )}
      {name === 'external' && <path d="M7 17 19 5M7 5h12v12" />}
      {name === 'down' && <path d="M12 3v18m-6-6 6 6 6-6" />}
      {name === 'camera' && (
        <>
          <path d="m8 5 1.5-2h5L16 5h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2Z" />
          <circle cx="12" cy="12" r="4" />
        </>
      )}
      {name === 'play' && <path d="m8 4 12 8-12 8V4Z" />}
      {name === 'grid' && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      )}
      {name === 'editorial' && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <path d="M13 3v18M3 13h10M13 9h8" />
        </>
      )}
    </svg>
  );
}
