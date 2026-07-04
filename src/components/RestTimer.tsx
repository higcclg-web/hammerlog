import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { fmtClock } from '../lib/util'

export function RestTimer() {
  const rest = useStore((s) => s.rest)
  const clearRest = useStore((s) => s.clearRest)
  const startRest = useStore((s) => s.startRest)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!rest.endsAt) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [rest.endsAt])

  useEffect(() => {
    if (rest.endsAt && now >= rest.endsAt) {
      if ('vibrate' in navigator) navigator.vibrate?.([80, 60, 80])
      clearRest()
    }
  }, [now, rest.endsAt, clearRest])

  if (!rest.endsAt) return null
  const leftSec = Math.max(0, Math.ceil((rest.endsAt - now) / 1000))
  const pct = rest.total > 0 ? leftSec / rest.total : 0

  return (
    <div className="fixed left-4 right-4 z-30 bottom-[calc(env(safe-area-inset-bottom)+72px)]">
      <div className="max-w-lg mx-auto flex items-center gap-3 rounded-2xl bg-surface-2/95 backdrop-blur border border-ember/40 px-4 py-2.5 shadow-lg shadow-black/40 pulse-ember">
        <svg width="30" height="30" viewBox="0 0 30 30" className="-rotate-90 shrink-0">
          <circle cx="15" cy="15" r="12" fill="none" stroke="var(--color-line)" strokeWidth="3" />
          <circle
            cx="15"
            cy="15"
            r="12"
            fill="none"
            stroke="var(--color-ember)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 12}
            strokeDashoffset={2 * Math.PI * 12 * (1 - pct)}
          />
        </svg>
        <div className="flex-1">
          <div className="text-[11px] font-semibold text-ink-dim uppercase tracking-wide">Rest</div>
          <div className="text-xl font-bold tnum leading-none">{fmtClock(leftSec)}</div>
        </div>
        <button
          onClick={() => startRest(leftSec + 15)}
          className="rounded-lg bg-surface px-3 py-1.5 text-[13px] font-bold text-ink-dim active:text-ink"
        >
          +15s
        </button>
        <button
          onClick={clearRest}
          className="rounded-lg bg-ember/15 px-3 py-1.5 text-[13px] font-bold text-ember active:bg-ember/25"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
