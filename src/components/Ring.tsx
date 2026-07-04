import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Ring({
  value,
  goal,
  size = 150,
  stroke = 11,
  color = 'var(--color-ember)',
  overColor = 'var(--color-bad)',
  children,
}: {
  value: number
  goal: number
  size?: number
  stroke?: number
  color?: string
  overColor?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = goal > 0 ? Math.min(value / goal, 1) : 0
  const over = goal > 0 && value > goal
  const complete = goal > 0 && value >= goal

  // One-shot forge flare the moment the goal is first reached.
  const wasComplete = useRef(complete)
  const [flare, setFlare] = useState(false)
  useEffect(() => {
    if (complete && !wasComplete.current) {
      setFlare(true)
      const t = setTimeout(() => setFlare(false), 560)
      wasComplete.current = complete
      return () => clearTimeout(t)
    }
    wasComplete.current = complete
  }, [complete])

  const glow = complete && !over ? `drop-shadow(0 0 7px ${color})` : undefined

  return (
    <div
      className={`relative inline-flex items-center justify-center ${flare ? 'forge-flare' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? overColor : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.2,0.9,0.3,1), stroke 0.3s',
            filter: glow,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

export function MacroBar({
  label,
  value,
  goal,
  color,
}: {
  label: string
  value: number
  goal: number
  color: string
}) {
  const pct = goal > 0 ? Math.min((value / goal) * 100, 100) : 0
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] font-semibold text-ink-dim">{label}</span>
        <span className="text-[12px] tnum text-ink-faint">
          <span className="text-ink font-semibold">{Math.round(value)}</span>/{goal}g
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
