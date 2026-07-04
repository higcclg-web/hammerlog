import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, EmptyState, SectionTitle } from '../components/ui'
import { exerciseName, useStore, workoutVolumeKg } from '../lib/store'
import {
  addDays,
  dateKey,
  epley1RM,
  fmtInt,
  fmtShortDate,
  fromKg,
  weekStart,
} from '../lib/util'
import type { Unit } from '../lib/types'

// ---------- Shared recharts dark styling ----------

const AXIS_TICK = { fill: 'var(--color-ink-faint)', fontSize: 11 } as const
const CHART_MARGIN = { top: 8, right: 8, bottom: 0, left: 0 } as const

const TOOLTIP_PROPS = {
  contentStyle: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-line)',
    borderRadius: 12,
    color: 'var(--color-ink)',
    fontSize: 13,
  },
  labelStyle: { color: 'var(--color-ink-dim)' },
  cursor: { fill: 'rgba(255,255,255,0.04)' } as const,
} as const

function Grid() {
  return (
    <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
  )
}

const xAxisProps = {
  tick: AXIS_TICK,
  axisLine: false as const,
  tickLine: false as const,
}
const yAxisProps = {
  tick: AXIS_TICK,
  axisLine: false as const,
  tickLine: false as const,
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Compact "12k" style formatting for large axis values. */
function compact(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return `${k >= 10 ? Math.round(k) : round1(k)}k`
  }
  return String(Math.round(n))
}

// ---------- Page ----------

export default function ProgressPage() {
  const unit = useStore((s) => s.settings.unit)
  const goals = useStore((s) => s.settings.goals)
  const bodyweight = useStore((s) => s.bodyweight)
  const nutrition = useStore((s) => s.nutrition)
  const history = useStore((s) => s.history)
  const customExercises = useStore((s) => s.customExercises)

  return (
    <div className="py-2">
      <BodyweightCard bodyweight={bodyweight} unit={unit} />
      <CaloriesCard nutrition={nutrition} goalKcal={goals.kcal} />
      <VolumeCard history={history} unit={unit} />
      <OneRepMaxCard history={history} customExercises={customExercises} unit={unit} />
    </div>
  )
}

// ---------- 1. Bodyweight ----------

function BodyweightCard({
  bodyweight,
  unit,
}: {
  bodyweight: { date: string; kg: number }[]
  unit: Unit
}) {
  const { data, current, delta } = useMemo(() => {
    const cutoff = addDays(dateKey(), -90)
    const sorted = [...bodyweight]
      .filter((b) => b.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
    const chart = sorted.map((b) => ({
      date: fmtShortDate(b.date),
      weight: round1(fromKg(b.kg, unit)),
    }))

    const all = [...bodyweight].sort((a, b) => a.date.localeCompare(b.date))
    const currentEntry = all[all.length - 1]
    let deltaVal: number | null = null
    if (currentEntry) {
      const target = addDays(currentEntry.date, -30)
      // closest entry at or before ~30 days ago
      let ref = all[0]
      for (const b of all) {
        if (b.date <= target) ref = b
        else break
      }
      if (ref && ref.date !== currentEntry.date) {
        deltaVal = fromKg(currentEntry.kg, unit) - fromKg(ref.kg, unit)
      }
    }
    return {
      data: chart,
      current: currentEntry ? round1(fromKg(currentEntry.kg, unit)) : null,
      delta: deltaVal,
    }
  }, [bodyweight, unit])

  return (
    <>
      <SectionTitle>Bodyweight</SectionTitle>
      <Card className="p-4">
        {data.length < 2 ? (
          <EmptyState icon="⚖️" text="Log your bodyweight from the Home tab" />
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-extrabold text-2xl tnum">{current}</span>
              <span className="text-ink-dim text-sm font-medium">{unit}</span>
              {delta !== null && Math.abs(delta) >= 0.05 && (
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold tnum ${
                    delta < 0 ? 'bg-good/15 text-good' : 'bg-ember-hi/15 text-ember-hi'
                  }`}
                >
                  {delta > 0 ? '+' : ''}
                  {round1(delta)} {unit}
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={CHART_MARGIN}>
                {Grid()}
                <XAxis dataKey="date" {...xAxisProps} minTickGap={20} />
                <YAxis {...yAxisProps} domain={['auto', 'auto']} width={40} />
                <Tooltip {...TOOLTIP_PROPS} formatter={(v: number) => [`${v} ${unit}`, 'Weight']} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="var(--color-ember)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: 'var(--color-ember)' }}
                  activeDot={{ r: 4 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>
    </>
  )
}

// ---------- 2. Calories vs goal ----------

function CaloriesCard({
  nutrition,
  goalKcal,
}: {
  nutrition: Record<string, import('../lib/types').FoodEntry[]>
  goalKcal: number
}) {
  const { data, hasAny, yMax } = useMemo(() => {
    const today = dateKey()
    const rows: { label: string; kcal: number }[] = []
    let any = false
    let max = goalKcal
    for (let i = 13; i >= 0; i--) {
      const key = addDays(today, -i)
      const entries = nutrition[key] ?? []
      const total = entries.reduce((sum, e) => sum + e.kcal * e.qty, 0)
      if (total > 0) any = true
      if (total > max) max = total
      rows.push({ label: fmtShortDate(key), kcal: Math.round(total) })
    }
    // round the axis ceiling up to a clean 200 above the tallest bar / goal line
    return { data: rows, hasAny: any, yMax: Math.ceil((max * 1.08) / 200) * 200 }
  }, [nutrition, goalKcal])

  return (
    <>
      <SectionTitle>Calories vs Goal</SectionTitle>
      <Card className="p-4">
        {!hasAny ? (
          <EmptyState icon="🍽️" text="Log meals in the Nutrition tab to track calories" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} margin={CHART_MARGIN}>
              {Grid()}
              <XAxis dataKey="label" {...xAxisProps} interval={1} />
              <YAxis {...yAxisProps} width={40} domain={[0, yMax]} tickFormatter={compact} />
              <Tooltip
                {...TOOLTIP_PROPS}
                formatter={(v: number) => [`${fmtInt(v)} kcal`, 'Total']}
              />
              <ReferenceLine
                y={goalKcal}
                stroke="var(--color-ink-dim)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
                label={{
                  value: 'goal',
                  position: 'insideTopRight',
                  fill: 'var(--color-ink-faint)',
                  fontSize: 10,
                }}
              />
              <Bar dataKey="kcal" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.kcal > goalKcal ? 'var(--color-bad)' : 'var(--color-ember)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </>
  )
}

// ---------- 3. Weekly volume ----------

function VolumeCard({
  history,
  unit,
}: {
  history: import('../lib/types').Workout[]
  unit: Unit
}) {
  const { data, thisWeek } = useMemo(() => {
    const start = weekStart(new Date())
    // 8 buckets keyed by week-start date, oldest first
    const buckets: { key: string; date: Date; vol: number }[] = []
    for (let i = 7; i >= 0; i--) {
      const d = new Date(start)
      d.setDate(d.getDate() - i * 7)
      buckets.push({ key: dateKey(d), date: d, vol: 0 })
    }
    const index = new Map(buckets.map((b) => [b.key, b]))
    for (const w of history) {
      const wk = dateKey(weekStart(new Date(w.startedAt)))
      const bucket = index.get(wk)
      if (bucket) bucket.vol += workoutVolumeKg(w)
    }
    const rows = buckets.map((b) => ({
      label: fmtShortDate(b.key),
      volume: Math.round(fromKg(b.vol, unit)),
    }))
    const last = buckets[buckets.length - 1]
    return { data: rows, thisWeek: last ? fromKg(last.vol, unit) : 0 }
  }, [history, unit])

  return (
    <>
      <SectionTitle>Weekly Volume</SectionTitle>
      <Card className="p-4">
        {history.length === 0 ? (
          <EmptyState icon="🏋️" text="Finish a workout to see your training volume" />
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-extrabold text-2xl tnum">{fmtInt(thisWeek)}</span>
              <span className="text-ink-dim text-sm font-medium">{unit} this week</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={CHART_MARGIN}>
                {Grid()}
                <XAxis dataKey="label" {...xAxisProps} />
                <YAxis {...yAxisProps} width={40} tickFormatter={compact} />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  formatter={(v: number) => [`${fmtInt(v)} ${unit}`, 'Volume']}
                />
                <Bar
                  dataKey="volume"
                  fill="var(--color-ember)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>
    </>
  )
}

// ---------- 4. Estimated 1RM ----------

function OneRepMaxCard({
  history,
  customExercises,
  unit,
}: {
  history: import('../lib/types').Workout[]
  customExercises: import('../lib/types').Exercise[]
  unit: Unit
}) {
  // exercises that appear in history, with a count of logged sets
  const exercises = useMemo(() => {
    const counts = new Map<string, number>()
    for (const w of history) {
      for (const e of w.exercises) {
        counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + e.sets.length)
      }
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, count, name: exerciseName(id, customExercises) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [history, customExercises])

  const defaultId = useMemo(() => {
    let best: { id: string; count: number } | null = null
    for (const e of exercises) {
      if (!best || e.count > best.count) best = { id: e.id, count: e.count }
    }
    return best?.id ?? ''
  }, [exercises])

  const [selected, setSelected] = useState<string | null>(null)
  const chosenId = selected && exercises.some((e) => e.id === selected) ? selected : defaultId

  const { data, current } = useMemo(() => {
    if (!chosenId) return { data: [] as { date: string; e1rm: number }[], current: null }
    // per workout, oldest -> newest, best epley 1RM across its sets
    const rows: { date: string; e1rm: number }[] = []
    const ordered = [...history].sort((a, b) => a.startedAt - b.startedAt)
    for (const w of ordered) {
      let best = 0
      for (const e of w.exercises) {
        if (e.exerciseId !== chosenId) continue
        for (const st of e.sets) {
          const v = epley1RM(st.weightKg, st.reps)
          if (v > best) best = v
        }
      }
      if (best > 0) {
        rows.push({
          date: fmtShortDate(dateKey(new Date(w.startedAt))),
          e1rm: round1(fromKg(best, unit)),
        })
      }
    }
    return { data: rows, current: rows.length ? rows[rows.length - 1].e1rm : null }
  }, [chosenId, history, unit])

  return (
    <>
      <SectionTitle>Estimated 1RM</SectionTitle>
      <Card className="p-4">
        {history.length === 0 ? (
          <EmptyState icon="📈" text="Finish a workout to see strength trends" />
        ) : (
          <>
            <select
              className="w-full rounded-xl bg-surface-2 border border-line px-3 py-2.5 text-ink mb-3"
              value={chosenId}
              onChange={(e) => setSelected(e.target.value)}
            >
              {exercises.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {data.length === 0 ? (
              <EmptyState icon="📈" text="No completed sets logged for this exercise yet" />
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-extrabold text-2xl tnum">{current}</span>
                  <span className="text-ink-dim text-sm font-medium">{unit} est. 1RM</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data} margin={CHART_MARGIN}>
                    {Grid()}
                    <XAxis dataKey="date" {...xAxisProps} minTickGap={20} />
                    <YAxis {...yAxisProps} domain={['auto', 'auto']} width={40} tickFormatter={compact} />
                    <Tooltip
                      {...TOOLTIP_PROPS}
                      formatter={(v: number) => [`${v} ${unit}`, 'e1RM']}
                    />
                    <Line
                      type="monotone"
                      dataKey="e1rm"
                      stroke="var(--color-ember-hi)"
                      strokeWidth={2.5}
                      dot={{ r: 2.5, fill: 'var(--color-ember-hi)' }}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </>
            )}
          </>
        )}
      </Card>
    </>
  )
}
