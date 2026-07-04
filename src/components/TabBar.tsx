export type Tab = 'home' | 'workout' | 'nutrition' | 'progress' | 'settings'

const TABS: { id: Tab; label: string; icon: (active: boolean) => JSX.Element }[] = [
  {
    id: 'home',
    label: 'Home',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill={a ? 'currentColor' : 'none'}
          fillOpacity={a ? 0.25 : 0}
        />
      </svg>
    ),
  },
  {
    id: 'workout',
    label: 'Train',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M7 8v8M4.5 9.5v5M17 8v8M19.5 9.5v5" />
          <path d="M7 12h10" strokeWidth={a ? 2.6 : 1.8} />
        </g>
      </svg>
    ),
  },
  {
    id: 'nutrition',
    label: 'Eat',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 21c-4.5 0-7.5-3-7.5-7 0-3.5 2.5-6 5-6 1.2 0 1.9.4 2.5.8.6-.4 1.3-.8 2.5-.8 2.5 0 5 2.5 5 6 0 4-3 7-7.5 7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          fill={a ? 'currentColor' : 'none'}
          fillOpacity={a ? 0.25 : 0}
        />
        <path d="M12 8c0-2 1-3.5 3-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M4 20h16" />
          <path d="M6 16.5v-3M11 16.5v-7M16 16.5v-5M21 16.5v-10" opacity={a ? 1 : 0.9} strokeWidth={a ? 2.4 : 1.8} />
        </g>
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (a) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" fill={a ? 'currentColor' : 'none'} fillOpacity={a ? 0.3 : 0} />
        <path
          d="M12 3.5l1.2 2.2 2.5.4 1.8-1.8 1.8 1.8-1.8 1.8.4 2.5 2.2 1.2-2.2 1.2-.4 2.5 1.8 1.8-1.8 1.8-1.8-1.8-2.5.4-1.2 2.2-1.2-2.2-2.5-.4-1.8 1.8-1.8-1.8 1.8-1.8-.4-2.5-2.2-1.2 2.2-1.2.4-2.5-1.8-1.8 1.8-1.8 1.8 1.8 2.5-.4L12 3.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-bg/90 backdrop-blur-xl border-t border-line/60 safe-bottom">
      <div className="flex max-w-lg mx-auto">
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5 select-none transition-colors ${
                active ? 'text-ember' : 'text-ink-faint active:text-ink-dim'
              }`}
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
            >
              {t.icon(active)}
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
