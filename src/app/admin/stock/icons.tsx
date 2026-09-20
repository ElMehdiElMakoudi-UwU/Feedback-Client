type IconProps = { className?: string };

const base = "h-5 w-5";

export function IconGrid({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="3.75" y="3.75" width="7" height="7" rx="1.5" />
      <rect x="13.25" y="3.75" width="7" height="7" rx="1.5" />
      <rect x="3.75" y="13.25" width="7" height="7" rx="1.5" />
      <rect x="13.25" y="13.25" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function IconSettings({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path
        strokeLinecap="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.14.6.62 1.06 1.22 1.2h.09a2 2 0 1 1 0 4h-.09c-.6.14-1.08.6-1.22 1.2Z"
      />
    </svg>
  );
}

export function IconUsers({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <circle cx="9" cy="8" r="3.25" />
      <path strokeLinecap="round" d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path strokeLinecap="round" d="M16 4.75a3.25 3.25 0 0 1 0 6.4" />
      <path strokeLinecap="round" d="M15 14.25c2.9.4 5 2.2 5 5.25" />
    </svg>
  );
}

export function IconClipboard({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="5.25" y="4.75" width="13.5" height="16" rx="2" />
      <path strokeLinecap="round" d="M9 4.75V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v.75" />
      <path strokeLinecap="round" d="M8.5 11h7M8.5 14.5h7M8.5 18h4.5" />
    </svg>
  );
}

export function IconCart({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h2l2.2 11.1a2 2 0 0 0 2 1.65h7.1a2 2 0 0 0 1.96-1.6L20 8.5H6" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </svg>
  );
}

export function IconScale({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" d="M12 3v18M7 21h10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5 5 8l3.5 6.5a4 4 0 0 0 7 0L19 8l-7-3Z" />
    </svg>
  );
}

export function IconSearch({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path strokeLinecap="round" d="M20 20l-4.8-4.8" />
    </svg>
  );
}

export function IconFilter({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5Z" />
    </svg>
  );
}

export function IconBuilding({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="4.5" y="3.5" width="11" height="17" rx="1" />
      <path strokeLinecap="round" d="M15.5 9.5H19a1 1 0 0 1 1 1V20a.5.5 0 0 1-.5.5h-4" />
      <path strokeLinecap="round" d="M8 7.5h.01M11.5 7.5h.01M8 11h.01M11.5 11h.01M8 14.5h.01M11.5 14.5h.01M17.25 13h.01M17.25 16.5h.01" />
    </svg>
  );
}

export function IconFlame({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2.5c1 2.5-2.5 4-2.5 7A2.5 2.5 0 0 0 12 12a2 2 0 0 0 2-2c1.5 1 2.5 3 2.5 4.75A4.5 4.5 0 0 1 12 21a5 5 0 0 1-5-5c0-3 2.5-4.5 2-6.5.9.5 1.5 1.3 1.8 2.2.5-2 .2-6 1.2-9.2Z"
      />
    </svg>
  );
}

export function IconPackage({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 8 8.25-4.5L20.25 8v8L12 20.5 3.75 16Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 8 12 12.5l8.25-4.5M12 12.5v8" />
    </svg>
  );
}

export function IconPlus({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconTrash({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M18 7l-.7 12.1a2 2 0 0 1-2 1.9H8.7a2 2 0 0 1-2-1.9L6 7" />
      <path strokeLinecap="round" d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconAlertTriangle({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.5 22 20H2Z" />
      <path strokeLinecap="round" d="M12 9.5v4.25M12 16.75h.01" />
    </svg>
  );
}

export function IconCheckCircle({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 12.5 2.5 2.5 5-5.5" />
    </svg>
  );
}

export function IconChevronDown({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconX({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function IconStar({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m12 3 2.7 5.7 6.3.85-4.6 4.35 1.15 6.2L12 17.1l-5.55 2.9 1.15-6.2L3 9.55l6.3-.85Z" />
    </svg>
  );
}

export function IconGift({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <rect x="3.5" y="8.5" width="17" height="4" rx="1" />
      <path strokeLinecap="round" d="M5 12.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7.5M12 8.5V21" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5c-1-3-2.7-4.5-4.2-4.5A2 2 0 0 0 6 6c0 1.6 2.3 2.5 6 2.5Zm0 0c1-3 2.7-4.5 4.2-4.5A2 2 0 0 1 18 6c0 1.6-2.3 2.5-6 2.5Z" />
    </svg>
  );
}

export function IconHeart({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.5s-7.5-4.6-9.8-9.2C.8 8 2.2 4.7 5.4 4a4.7 4.7 0 0 1 6.6 2 4.7 4.7 0 0 1 6.6-2c3.2.7 4.6 4 3.2 7.3-2.3 4.6-9.8 9.2-9.8 9.2Z" />
    </svg>
  );
}

export function IconLogout({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 16.5 21 12l-5-4.5" />
      <path strokeLinecap="round" d="M21 12H9" />
    </svg>
  );
}

export function IconChevronRight({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function IconSunrise({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path strokeLinecap="round" d="M12 3v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a4.5 4.5 0 0 0-4.5-4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5A4.5 4.5 0 0 0 12 15" />
      <path strokeLinecap="round" d="m5.5 7 2 2M18.5 7l-2 2" />
      <path strokeLinecap="round" d="M2.5 15h19M4.5 19h15" />
    </svg>
  );
}

export function IconMoonStars({ className = base }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 14.5A7.5 7.5 0 1 1 9.5 4a6 6 0 0 0 10.5 10.5Z"
      />
      <path strokeLinecap="round" d="M18 3v2.5M16.75 4.25h2.5" />
    </svg>
  );
}
