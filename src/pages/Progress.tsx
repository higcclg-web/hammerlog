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
import { Card, EmptyState, Segmented, SectionTitle } from '../components/ui'
import { exerciseName, useStore, workoutVolumeKg } from '../lib/store'
import {
  addDays,
  dateKey,
  epley1RM,
  ewma,
  fmtInt,
  fmtShortDate,
  fromKg,
  parseKey,
  weekStart,
} from '../lib/util'
import { useCountUp } from '../lib/hooks'
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

// ---------- Timeframe ----------

type Range = '1M' | '3M' | '6M' | '1Y' | 'All'

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'All', label: 'All' },
]

/** Approximate day window for a range; `null` means "no cutoff / all time". */
function rangeDays(range: Range): number | null {
  switch (range) {
    case '1M':
      return 30
    case '3M':
      return 90
    case '6M':
      return 182
    case '1Y':
      return 365
    case 'All':
      return null
  }
}

/** Number of weekly buckets to show for a range (capped for readability). */
function rangeWeeks(range: Range): number {
  switch (range) {
    case '1M':
      return 5
    case '3M':
      return 13
    case '6M':
      return 26
    case '1Y':
      return 52
    case 'All':
      return 52
  }
}

/** Cutoff date-key for a range, or '' when the range is "All". */
function rangeCutoff(range: Range): string {
  const days = rangeDays(range)
  return days === null ? '' : addDays(dateKey(), -days)
}

/**
 * Least-squares slope of `ys` against `xs` (per unit of x). Returns 0 when
 * fewer than two points or x has no spread.
 */
function slope(xs: number[], ys: number[]): number {
  const n = xs.length
  if (n < 2) return 0
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i++) {
    sx += xs[i]
    sy += ys[i]
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx
    num += dx * (ys[i] - my)
    den += dx * dx
  }
  return den === 0 ? 0 : num / den
}

// ---------- Page ----------

export default function ProgressPage() {
  const unit = useStore((s) => s.settings.unit)
  const goals = useStore((s) => s.settings.goals)
  const bodyweight = useStore((s) => s.bodyweight)
  const nutrition = useStore((s) => s.nutrition)
  const history = useStore((s) => s.history)
  const customExercises = useStore((s) => s.customExercises)

  const [range, setRange] = useState<Range>('3M')

  return (
    <div className="py-2">
      <div className="px-1 mb-3">
        <Segmented options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>
      <BodyweightCard bodyweight={bodyweight} unit={unit} range={range} />
      <CaloriesCard nutrition={nutrition} goalKcal={goals.kcal} range={range} />
      <VolumeCard history={history} unit={unit} range={range} />
      <OneRepMaxCard
        history={history}
        customExercises={customExercises}
        unit={unit}
        range={range}
      />
    </div>
  )
}

// ---------- 1. Bodyweight ----------

function BodyweightCard({
  bodyweight,
  unit,
  range,
}: {
  bodyweight: { date: string; kg: number }[]
  unit: Unit
  range: Range
}) {
  const { data, current, ratePerWeek } = useMemo(() => {
    const cutoff = rangeCutoff(range)
    const sorted = [...bodyweight]
      .filter((b) => (cutoff ? b.date >= cutoff : true))
      .sort((a, b) => a.date.localeCompare(b.date))

    const weights = sorted.map((b) => fromKg(b.kg, unit))
    const trend = ewma(weights)
    const chart = sorted.map((b, i) => ({
      date: fmtShortDate(b.date),
      raw: round1(weights[i]),
      trend: round1(trend[i]),
    }))

    // rate of change from the smoothed series: slope per day → per week
    let rate: number | null = null
    if (sorted.length >= 2) {
      const day0 = parseKey(sorted[0].date).getTime()
      const days = sorted.map((b) => (parseKey(b.date).getTime() - day0) / 86_400_000)
      rate = slope(days, trend) * 7
    }

    const last = trend.length ? trend[trend.length - 1] : null
    return {
      data: chart,
      current: last === null ? null : round1(last),
      ratePerWeek: rate,
    }
  }, [bodyweight, unit, range])

  const animated = useCountUp(current ?? 0)
  const hasData = data.length >= 2

  return (
    <>
      <SectionTitle>Bodyweight</SectionTitle>
      <Card className="p-4">
        {!hasData ? (
          <EmptyState
            icon="⚖️"
            title="Track your trend"
            text="Log your bodyweight from the Home tab to see a smoothed weight-change trend."
          />
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-extrabold text-2xl tnum">{round1(animated)}</span>
              <span className="text-ink-dim text-sm font-medium">{unit} trend</span>
              {ratePerWeek !== null && Math.abs(ratePerWeek) >= 0.05 && (
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold tnum ${
                    ratePerWeek < 0 ? 'bg-good/15 text-good' : 'bg-ember-hi/15 text-ember-hi'
                  }`}
                >
                  {ratePerWeek > 0 ? '+' : ''}
                  {round1(ratePerWeek)} {unit}/wk
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={CHART_MARGIN}>
                {Grid()}
                <XAxis dataKey="date" {...xAxisProps} minTickGap={20} />
                <YAxis {...yAxisProps} domain={['auto', 'auto']} width={40} />
                <Tooltip
                  {...TOOLTIP_PROPS}
                  formatter={(v: number, name) => [
                    `${v} ${unit}`,
                    name === 'trend' ? 'Trend' : 'Weigh-in',
                  ]}
                />
                {/* faint raw daily weigh-ins */}
                <Line
                  type="monotone"
                  dataKey="raw"
                  stroke="var(--color-ink-faint)"
                  strokeWidth={1}
                  strokeOpacity={0.35}
                  dot={{ r: 1.5, fill: 'var(--color-ink-faint)', opacity: 0.5 }}
                  activeDot={{ r: 3 }}
                  isAnimationActive={false}
                />
                {/* prominent smoothed EWMA trend */}
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="var(--color-ember)"
                  strokeWidth={2.5}
                  dot={false}
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
  range,
}: {
  nutrition: Record<string, import('../lib/types').FoodEntry[]>
  goalKcal: number
  range: Range
}) {
  const { data, hasAny, yMax, avg, loggedDays, totalDays, tickInterval } = useMemo(() => {
    const today = dateKey()
    // window length in days: capped at 90 daily bars for readability
    const win = Math.min(rangeDays(range) ?? 90, 90)
    const rows: { label: string; kcal: number; logged: boolean }[] = []
    let any = false
    let max = goalKcal
    let sumLogged = 0
    let logged = 0
    for (let i = win - 1; i >= 0; i--) {
      const key = addDays(today, -i)
      const entries = nutrition[key] ?? []
      const total = entries.reduce((sum, e) => sum + e.kcal * e.qty, 0)
      const isLogged = total > 0
      if (isLogged) {
        any = true
        sumLogged += total
        logged++
      }
      if (total > max) max = total
      rows.push({ label: fmtShortDate(key), kcal: Math.round(total), logged: isLogged })
    }
    const average = logged > 0 ? Math.round(sumLogged / logged) : 0
    if (average > max) max = average
    // round the axis ceiling up to a clean 200 above the tallest bar / goal line
    // keep at most ~10 x-axis labels to avoid crowding on long ranges
    const interval = Math.max(0, Math.ceil(rows.length / 10) - 1)
    return {
      data: rows,
      hasAny: any,
      yMax: Math.ceil((max * 1.08) / 200) * 200,
      avg: average,
      loggedDays: logged,
      totalDays: win,
      tickInterval: interval,
    }
  }, [nutrition, goalKcal, range])

  const animatedAvg = useCountUp(avg)
  const diff = avg - goalKcal

  return (
    <>
      <SectionTitle>Calories vs Goal</SectionTitle>
      <Card className="p-4">
        {!hasAny ? (
          <EmptyState
            icon="🍽️"
            title="See your intake"
            text="Log meals in the Nutrition tab to track calories against your goal."
          />
        ) : (
          <>
            <div className="mb-3">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-extrabold text-2xl tnum">{fmtInt(animatedAvg)}</span>
                <span className="text-ink-dim text-sm font-medium">avg kcal</span>
                {Math.abs(diff) >= 1 && (
                  <span
                    className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold tnum ${
                      diff <= 0 ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'
                    }`}
                  >
                    {diff > 0 ? '+' : ''}
                    {fmtInt(diff)} vs goal
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-faint mt-1 tnum">
                logged {loggedDays}/{totalDays} days
              </p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={CHART_MARGIN}>
                {Grid()}
                <XAxis dataKey="label" {...xAxisProps} interval={tickInterval} />
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
                <ReferenceLine
                  y={avg}
                  stroke="var(--color-ember-hi)"
                  strokeDasharray="2 3"
                  ifOverflow="extendDomain"
                  label={{
                    value: 'avg',
                    position: 'insideBottomRight',
                    fill: 'var(--color-ember-hi)',
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
          </>
        )}
      </Card>
    </>
  )
}

// ---------- 3. Weekly volume ----------

function VolumeCard({
  history,
  unit,
  range,
}: {
  history: import('../lib/types').Workout[]
  unit: Unit
  range: Range
}) {
  const { data, thisWeek, tickInterval } = useMemo(() => {
    const start = weekStart(new Date())
    const weeks = rangeWeeks(range)
    // weekly buckets keyed by week-start date, oldest first
    const buckets: { key: string; vol: number }[] = []
    for (let i = weeks - 1; i >= 0; i--) {
      const d = new Date(start)
      d.setDate(d.getDate() - i * 7)
      buckets.push({ key: dateKey(d), vol: 0 })
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
    const interval = Math.max(0, Math.ceil(rows.length / 10) - 1)
    return {
      data: rows,
      thisWeek: last ? fromKg(last.vol, unit) : 0,
      tickInterval: interval,
    }
  }, [history, unit, range])

  const animated = useCountUp(thisWeek)

  return (
    <>
      <SectionTitle>Weekly Volume</SectionTitle>
      <Card className="p-4">
        {history.length === 0 ? (
          <EmptyState
            icon="🏋️"
            title="Build your base"
            text="Finish a workout and your weekly training volume will appear here."
          />
        ) : (
          <>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="font-extrabold text-2xl tnum">{fmtInt(animated)}</span>
              <span className="text-ink-dim text-sm font-medium">{unit} this week</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data} margin={CHART_MARGIN}>
                {Grid()}
                <XAxis dataKey="label" {...xAxisProps} interval={tickInterval} />
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
  range,
}: {
  history: import('../lib/types').Workout[]
  customExercises: import('../lib/types').Exercise[]
  unit: Unit
  range: Range
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

  const { data, current, delta, pct } = useMemo(() => {
    const empty = {
      data: [] as { date: string; e1rm: number }[],
      current: null as number | null,
      delta: null as number | null,
      pct: null as number | null,
    }
    if (!chosenId) return empty
    const cutoffMs = (() => {
      const days = rangeDays(range)
      return days === null ? 0 : parseKey(addDays(dateKey(), -days)).getTime()
    })()
    // per workout, oldest -> newest, best epley 1RM across its working-ish sets
    const rows: { date: string; e1rm: number }[] = []
    const ordered = [...history].sort((a, b) => a.startedAt - b.startedAt)
    for (const w of ordered) {
      if (w.startedAt < cutoffMs) continue
      let best = 0
      for (const e of w.exercises) {
        if (e.exerciseId !== chosenId) continue
        for (const st of e.sets) {
          // filter to working-ish sets so the estimate isn't jumpy
          if (st.reps > 12) continue
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
    if (rows.length === 0) return empty
    const first = rows[0].e1rm
    const last = rows[rows.length - 1].e1rm
    const d = rows.length >= 2 ? last - first : null
    const p = d !== null && first > 0 ? (d / first) * 100 : null
    return { data: rows, current: last, delta: d, pct: p }
  }, [chosenId, history, unit, range])

  const animated = useCountUp(current ?? 0)

  return (
    <>
      <SectionTitle>Estimated 1RM</SectionTitle>
      <Card className="p-4">
        {history.length === 0 ? (
          <EmptyState
            icon="📈"
            title="Chart your strength"
            text="Finish a workout to see your estimated one-rep max climb over time."
          />
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
              <EmptyState
                icon="📈"
                title="No sets in range"
                text="No working sets logged for this exercise in the selected timeframe."
              />
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-3 flex-wrap">
                  <span className="font-extrabold text-2xl tnum">{round1(animated)}</span>
                  <span className="text-ink-dim text-sm font-medium">{unit} est. 1RM</span>
                  {delta !== null && Math.abs(delta) >= 0.05 && (
                    <span
                      className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold tnum ${
                        delta >= 0 ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad'
                      }`}
                    >
                      {delta >= 0 ? '▲' : '▼'} {round1(Math.abs(delta))} {unit}
                      {pct !== null && ` · ${Math.abs(Math.round(pct))}%`}
                    </span>
                  )}
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
