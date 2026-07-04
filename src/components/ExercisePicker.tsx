import { useMemo, useState } from 'react'
import { useAllExercises, useStore } from '../lib/store'
import { MUSCLE_GROUPS } from '../lib/exercises'
import { Sheet } from './ui'
import type { MuscleGroup } from '../lib/types'

export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (exerciseId: string) => void
}) {
  const all = useAllExercises()
  const addCustomExercise = useStore((s) => s.addCustomExercise)
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (e) =>
        (muscle === 'all' || e.muscle === muscle) &&
        (q === '' || e.name.toLowerCase().includes(q)),
    )
  }, [all, query, muscle])

  const canCreate =
    query.trim().length > 1 &&
    !all.some((e) => e.name.toLowerCase() === query.trim().toLowerCase())

  function pick(id: string) {
    onPick(id)
    setQuery('')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add Exercise">
      <input
        className="w-full rounded-xl bg-surface-2 border border-line px-3.5 py-3 outline-none placeholder:text-ink-faint focus:border-ember/70 mb-3"
        placeholder="Search exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 -mx-5 px-5">
        {(['all', ...MUSCLE_GROUPS] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMuscle(m as MuscleGroup | 'all')}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
              muscle === m ? 'bg-ember text-black' : 'bg-surface-2 text-ink-dim'
            }`}
          >
            {m}
          </button>
        ))}
      </div>
      <div className="space-y-1 min-h-[40dvh]">
        {canCreate && (
          <button
            onClick={() => {
              const ex = addCustomExercise(query, muscle === 'all' ? 'other' : muscle)
              pick(ex.id)
            }}
            className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 bg-ember/10 text-ember font-semibold text-left"
          >
            <span className="text-lg leading-none">＋</span>
            Create “{query.trim()}”
          </button>
        )}
        {filtered.map((e) => (
          <button
            key={e.id}
            onClick={() => pick(e.id)}
            className="w-full flex items-center justify-between rounded-xl px-3.5 py-3 bg-surface-2/60 active:bg-surface-2 text-left"
          >
            <span className="font-medium text-[15px]">
              {e.name}
              {e.custom && <span className="ml-2 text-[11px] text-ember font-semibold">CUSTOM</span>}
            </span>
            <span className="text-[12px] text-ink-faint capitalize">{e.muscle}</span>
          </button>
        ))}
        {filtered.length === 0 && !canCreate && (
          <p className="text-center text-ink-faint py-8 text-[14px]">No exercises found.</p>
        )}
      </div>
    </Sheet>
  )
}
