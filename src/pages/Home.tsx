import { useEffect, useState } from 'react'
import type { Tab } from '../components/TabBar'
import { Card, SectionTitle, Button } from '../components/ui'
import { Ring, MacroBar } from '../components/Ring'
import { useStore, workoutSetCount, workoutVolumeKg } from '../lib/store'
import {
  dateKey,
  fmtInt,
  fmtClock,
  fmtDay,
  fromKg,
  displayWeight,
  toKg,
  parseNum,
  weekStart,
} from '../lib/util'

export default function Home({ go }: { go: (tab: Tab) => void }) {
  const s = useStore()
  const unit = s.settings.unit
  const goals = s.settings.goals

  const today = dateKey()
  const now = new Date()

  // ---------- Today's fuel ----------
  const entries = s.nutrition[today] ?? []
  const totals = entries.reduce(
    (acc, e) => {
      acc.kcal += e.kcal * e.qty
      acc.protein += e.protein * e.qty
      acc.carbs += e.carbs * e.qty
      acc.fat += e.fat * e.qty
      return acc
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
  const kcalLeft = goals.kcal - totals.kcal
  const over = kcalLeft < 0

  // ---------- Training ----------
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!s.active) return
    const tick = () => setElapsed(Math.floor((Date.now() - s.active!.startedAt) / 1000))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [s.active])

  const activeSetsDone = s.active
    ? s.active.exercises.reduce((n, e) => n + e.sets.filter((st) => st.done).length, 0)
    : 0

  // ---------- This week ----------
  const thisWeekStart = weekStart(now).getTime()
  const weekWorkouts = s.history.filter(
    (w) => weekStart(new Date(w.startedAt)).getTime() === thisWeekStart,
  )
  const weekSets = weekWorkouts.reduce((n, w) => n + workoutSetCount(w), 0)
  const weekVolumeKg = weekWorkouts.reduce((n, w) => n + workoutVolumeKg(w), 0)

  // ---------- Bodyweight ----------
  const latestBw = s.bodyweight.length ? s.bodyweight[s.bodyweight.length - 1] : null
  const [bwInput, setBwInput] = useState('')
  const logBw = () => {
    const kg = toKg(parseNum(bwInput), unit)
    if (kg > 0) {
      s.logBodyweight(today, kg)
      setBwInput('')
    }
  }

  const dateLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div>
      {/* Header */}
      <header className="flex items-end justify-between pt-2 mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-1.5">
          <Flame />
          <span>
            Forge<span className="text-ember">log</span>
          </span>
        </h1>
        <span className="text-[13px] text-ink-dim font-medium pb-0.5">{dateLabel}</span>
      </header>

      {/* Today's fuel */}
      <SectionTitle>Today's Fuel</SectionTitle>
      <Card>
        <button
          onClick={() => go('nutrition')}
          className="w-full text-left p-4 flex items-center gap-4 active:opacity-80 transition-opacity"
        >
          <Ring value={totals.kcal} goal={goals.kcal} size={132} stroke={12}>
            <span
              className={`text-[26px] font-extrabold tnum leading-none ${
                over ? 'text-bad' : 'text-ink'
              }`}
            >
              {fmtInt(Math.abs(Math.round(kcalLeft)))}
            </span>
            <span className="text-[11px] text-ink-faint mt-1 font-medium">
              {over ? 'over' : 'kcal left'}
            </span>
          </Ring>
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <MacroBar
              label="Protein"
              value={totals.protein}
              goal={goals.protein}
              color="var(--color-protein)"
            />
            <MacroBar
              label="Carbs"
              value={totals.carbs}
              goal={goals.carbs}
              color="var(--color-carbs)"
            />
            <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color="var(--color-fat)" />
          </div>
          <Chevron />
        </button>
      </Card>

      {/* Training */}
      <SectionTitle>Training</SectionTitle>
      <Card className="p-4">
        {s.active ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-ember pulse-ember" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-ember" />
              </span>
              <span className="text-[12px] font-semibold uppercase tracking-wider text-ember">
                Workout in progress
              </span>
            </div>
            <div className="flex items-baseline justify-between mb-3">
              <span className="text-lg font-bold truncate pr-3">{s.active.name}</span>
              <span className="text-xl font-extrabold tnum text-ink shrink-0">
                {fmtClock(elapsed)}
              </span>
            </div>
            <div className="text-[13px] text-ink-dim mb-4 tnum">
              {activeSetsDone} {activeSetsDone === 1 ? 'set' : 'sets'} done
            </div>
            <Button className="w-full" onClick={() => go('workout')}>
              Resume Workout
            </Button>
          </>
        ) : (
          <>
            <Button
              className="w-full"
              onClick={() => {
                s.startWorkout()
                go('workout')
              }}
            >
              Start Workout
            </Button>
            {s.routines.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {s.routines.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      s.startWorkout(r.id)
                      go('workout')
                    }}
                    className="rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold text-ink-dim active:bg-line transition-colors"
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </Card>

      {/* This week */}
      <SectionTitle>This Week</SectionTitle>
      <Card className="flex divide-x divide-line/60">
        <WeekTile label="Workouts" value={fmtInt(weekWorkouts.length)} />
        <WeekTile label="Sets" value={fmtInt(weekSets)} />
        <WeekTile label="Volume" value={fmtInt(fromKg(weekVolumeKg, unit))} suffix={unit} />
      </Card>

      {/* Bodyweight */}
      <SectionTitle>Bodyweight</SectionTitle>
      <Card className="p-4">
        {latestBw ? (
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-3xl font-extrabold tnum">{displayWeight(latestBw.kg, unit)}</span>
            <span className="text-lg font-semibold text-ink-dim">{unit}</span>
            <span className="text-[13px] text-ink-faint ml-auto">{fmtDay(latestBw.date)}</span>
          </div>
        ) : (
          <p className="text-[14px] text-ink-dim mb-3">Log your first weigh-in to track trends.</p>
        )}
        <div className="flex items-stretch gap-2">
          <div className="flex-1 flex items-center rounded-xl bg-surface-2 border border-line focus-within:border-ember/70 transition-colors">
            <input
              className="w-full bg-transparent px-3.5 py-3 outline-none text-ink placeholder:text-ink-faint tnum"
              inputMode="decimal"
              value={bwInput}
              placeholder={latestBw ? displayWeight(latestBw.kg, unit) : unit}
              onChange={(e) => setBwInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') logBw()
              }}
            />
            <span className="pr-3.5 text-ink-faint text-[14px] shrink-0">{unit}</span>
          </div>
          <Button variant="surface" onClick={logBw} disabled={parseNum(bwInput) <= 0}>
            Log
          </Button>
        </div>
      </Card>
    </div>
  )
}

function WeekTile({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="flex-1 py-4 px-2 text-center">
      <div className="text-xl font-extrabold tnum">
        {value}
        {suffix && <span className="text-[13px] font-semibold text-ink-dim ml-0.5">{suffix}</span>}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold mt-1">
        {label}
      </div>
    </div>
  )
}

function Flame() {
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden="true">
      <path
        d="M10 1.5c.6 3.4-1.8 4.7-3.6 6.6C4.4 10.2 3 12.3 3 14.8 3 19 6.1 22 10 22s7-3 7-7.2c0-2.3-1-4.2-2.4-5.8-.5 1.3-1.4 2-2.4 2.4.7-2.3.3-6.3-2.2-9.9Z"
        fill="var(--color-ember)"
      />
      <path
        d="M10 22c-2.2 0-3.8-1.6-3.8-3.7 0-1.9 1.3-3.1 2.3-4.2.4 1 1 1.4 1.7 1.7-.3-1.6.4-2.8 1-3.6 1 .9 2.4 2.4 2.4 4.5C13.6 20.2 12.1 22 10 22Z"
        fill="var(--color-ember-hi)"
      />
    </svg>
  )
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-ink-faint shrink-0">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
