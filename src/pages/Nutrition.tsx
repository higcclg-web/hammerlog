import { useEffect, useMemo, useState } from 'react'
import type { Food, FoodEntry, MealKey } from '../lib/types'
import { addDays, dateKey, fmtDay, fmtInt, haptic, parseKey, parseNum } from '../lib/util'
import { mostRecentLoggedDay, sortFoodsByRecentUse, useStore } from '../lib/store'
import { Button, Card, EmptyState, Field, SectionTitle, Segmented, Sheet } from '../components/ui'
import { MacroBar, Ring } from '../components/Ring'
import { useCountUp } from '../lib/hooks'

const MEALS: { key: MealKey; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
]

const mealLabel = (m: MealKey) => MEALS.find((x) => x.key === m)!.label

/** Latest day strictly before `date` that contains entries for `meal`. */
function mealCopySource(
  nutrition: Record<string, FoodEntry[]>,
  date: string,
  meal: MealKey,
): string | null {
  let best: string | null = null
  for (const [d, list] of Object.entries(nutrition)) {
    if (d >= date) continue
    if (!list.some((e) => e.meal === meal)) continue
    if (best === null || d > best) best = d
  }
  return best
}

// Stable reference for days with no entries. Returning a fresh `[]` from the
// zustand selector makes every render look like a state change -> infinite loop.
const NO_ENTRIES: FoodEntry[] = []

function fmtQty(q: number): string {
  // Round to 2 decimals, then strip any trailing zeros (1.50 -> "1.5", 2.00 -> "2").
  const r = Math.round(q * 100) / 100
  return Number.isInteger(r) ? String(r) : String(r).replace(/\.?0+$/, '')
}

/** Stepper + editable numeric qty. Shared by add + edit flows. */
function QtyEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const num = parseNum(value)
  const step = (delta: number) => {
    const next = Math.max(0.5, Math.round((num + delta) * 100) / 100)
    onChange(fmtQty(next))
  }
  return (
    <div>
      <span className="block text-[13px] text-ink-dim mb-1.5 font-medium">Quantity</span>
      <div className="flex items-stretch gap-2">
        <button
          onClick={() => step(-0.5)}
          className="w-12 shrink-0 rounded-xl bg-surface-2 border border-line text-ink text-xl font-bold active:bg-line select-none"
          aria-label="Decrease quantity"
        >
          −
        </button>
        <input
          className="flex-1 min-w-0 rounded-xl bg-surface-2 border border-line focus:border-ember/70 outline-none text-center text-ink tnum text-[17px] font-semibold py-3 transition-colors"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          onClick={() => step(0.5)}
          className="w-12 shrink-0 rounded-xl bg-surface-2 border border-line text-ink text-xl font-bold active:bg-line select-none"
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>
    </div>
  )
}

function TrashIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a1 1 0 01-1 1H7a1 1 0 01-1-1V7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function NutritionPage() {
  const [date, setDate] = useState(() => dateKey())
  const entries = useStore((s) => s.nutrition[date] ?? NO_ENTRIES)
  const nutrition = useStore((s) => s.nutrition)
  const goals = useStore((s) => s.settings.goals)
  const foods = useStore((s) => s.foods)
  const logFood = useStore((s) => s.logFood)
  const addFood = useStore((s) => s.addFood)
  const deleteFood = useStore((s) => s.deleteFood)
  const updateFoodEntry = useStore((s) => s.updateFoodEntry)
  const deleteFoodEntry = useStore((s) => s.deleteFoodEntry)
  const copyMeal = useStore((s) => s.copyMeal)
  const copyDay = useStore((s) => s.copyDay)

  const [addMeal, setAddMeal] = useState<MealKey | null>(null)
  const [editEntry, setEditEntry] = useState<FoodEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (msg: string) => {
    haptic()
    setToast(msg)
  }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1600)
    return () => clearTimeout(t)
  }, [toast])

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, e) => {
        acc.kcal += e.kcal * e.qty
        acc.protein += e.protein * e.qty
        acc.carbs += e.carbs * e.qty
        acc.fat += e.fat * e.qty
        return acc
      },
      { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }, [entries])

  const kcalLeft = goals.kcal - totals.kcal
  const over = kcalLeft < 0
  const proteinLeft = Math.max(0, Math.round(goals.protein - totals.protein))
  const proteinHit = totals.protein >= goals.protein
  const kcalCount = Math.round(useCountUp(totals.kcal))

  const recentDay = useMemo(() => mostRecentLoggedDay(nutrition, date), [nutrition, date])

  const fullDate = parseKey(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="pt-3">
      {/* Day navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setDate((d) => addDays(d, -1))}
          className="w-11 h-11 rounded-full bg-surface border border-line/60 flex items-center justify-center text-ink-dim active:bg-surface-2 select-none"
          aria-label="Previous day"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button onClick={() => setDate(dateKey())} className="flex flex-col items-center select-none px-4">
          <span className="text-[19px] font-bold leading-tight">{fmtDay(date)}</span>
          <span className="text-[12px] text-ink-faint mt-0.5">{fullDate}</span>
        </button>
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          className="w-11 h-11 rounded-full bg-surface border border-line/60 flex items-center justify-center text-ink-dim active:bg-surface-2 select-none"
          aria-label="Next day"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Summary */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <Ring value={totals.kcal} goal={goals.kcal} size={124} stroke={10}>
              <span className="text-[26px] font-extrabold tnum leading-none">{fmtInt(kcalCount)}</span>
              <span className="text-[11px] text-ink-faint mt-1 tnum">of {fmtInt(goals.kcal)}</span>
            </Ring>
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-3">
            <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color="var(--color-protein)" />
            <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color="var(--color-carbs)" />
            <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color="var(--color-fat)" />
          </div>
        </div>
        {/* Protein is the hero macro — serious users track it hardest. */}
        <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0 self-center"
              style={{ background: 'var(--color-protein)' }}
            />
            {proteinHit ? (
              <span className="text-[14px] font-bold tnum text-protein">Protein goal hit</span>
            ) : (
              <span className="text-[14px] tnum text-ink-dim">
                <span className="text-[17px] font-extrabold text-protein">{proteinLeft}g</span> protein left
              </span>
            )}
          </div>
          <span className={`text-[13px] tnum shrink-0 ${over ? 'text-bad font-semibold' : 'text-ink-dim'}`}>
            {over ? `${fmtInt(-kcalLeft)} kcal over` : `${fmtInt(kcalLeft)} kcal left`}
          </span>
        </div>
      </Card>

      {entries.length === 0 &&
        (recentDay ? (
          <div className="mt-3">
            <EmptyState
              icon="📋"
              text="Nothing logged yet. Start fresh, or copy your last logged day."
              action={
                <Button
                  variant="surface"
                  onClick={() => {
                    const n = copyDay(recentDay, date)
                    if (n > 0) flash(`Copied ${n} item${n === 1 ? '' : 's'} from ${fmtDay(recentDay)}`)
                  }}
                >
                  Copy {fmtDay(recentDay)}
                </Button>
              }
            />
          </div>
        ) : (
          <p className="text-center text-[13px] text-ink-faint mt-3">Log your first food of the day</p>
        ))}

      {/* Meals */}
      {MEALS.map(({ key, label }) => {
        const mealEntries = entries.filter((e) => e.meal === key)
        const m = mealEntries.reduce(
          (acc, e) => {
            acc.kcal += e.kcal * e.qty
            acc.protein += e.protein * e.qty
            acc.carbs += e.carbs * e.qty
            acc.fat += e.fat * e.qty
            return acc
          },
          { kcal: 0, protein: 0, carbs: 0, fat: 0 },
        )
        // Most recent prior day that has this meal — source for a one-tap "Copy".
        const copySrc = mealCopySource(nutrition, date, key)
        return (
          <div key={key}>
            <SectionTitle
              action={
                m.kcal > 0 ? (
                  <span className="text-[13px] font-semibold tnum text-ink-dim">{fmtInt(m.kcal)} kcal</span>
                ) : copySrc ? (
                  <button
                    onClick={() => {
                      const n = copyMeal(copySrc, date, key)
                      if (n > 0) flash(`Copied ${label} from ${fmtDay(copySrc)}`)
                    }}
                    className="text-[12px] font-semibold text-ember active:opacity-70 select-none tnum"
                  >
                    Copy {fmtDay(copySrc)}
                  </button>
                ) : undefined
              }
            >
              {label}
            </SectionTitle>
            <Card>
              {m.kcal > 0 && (
                <div className="px-4 pt-2.5 pb-1.5 text-[12px] text-ink-faint tnum border-b border-line/60">
                  P {Math.round(m.protein)} · C {Math.round(m.carbs)} · F {Math.round(m.fat)}
                </div>
              )}
              {mealEntries.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setEditEntry(e)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-line/60 active:bg-surface-2 tap transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium truncate">
                      {e.qty !== 1 && <span className="text-ember font-semibold tnum">{fmtQty(e.qty)}× </span>}
                      {e.name}
                    </div>
                    <div className="text-[12px] text-ink-faint tnum mt-0.5">
                      P {Math.round(e.protein * e.qty)} · C {Math.round(e.carbs * e.qty)} · F {Math.round(e.fat * e.qty)}
                    </div>
                  </div>
                  <span className="text-[15px] font-bold tnum shrink-0">{fmtInt(e.kcal * e.qty)}</span>
                </button>
              ))}
              <button
                onClick={() => setAddMeal(key)}
                className="w-full text-left px-4 py-3 text-[15px] text-ember font-semibold active:bg-surface-2 rounded-b-2xl first:rounded-t-2xl transition-colors select-none tap"
              >
                + Add food
              </button>
            </Card>
          </div>
        )
      })}

      {addMeal && (
        <AddSheet
          meal={addMeal}
          foods={foods}
          nutrition={nutrition}
          onClose={() => setAddMeal(null)}
          onLog={(entry) => {
            logFood(date, entry)
            haptic()
          }}
          onSaveFood={addFood}
          onDeleteFood={deleteFood}
        />
      )}

      {editEntry && (
        <EditSheet
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSave={(qty) => updateFoodEntry(date, editEntry.id, { qty })}
          onAddAgain={() => {
            const { id: _id, ...rest } = editEntry
            void _id
            logFood(date, rest)
            haptic()
            flash('Added again ✓')
          }}
          onDelete={() => deleteFoodEntry(date, editEntry.id)}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 pointer-events-none">
          <div className="ember-in rounded-full bg-surface-2 border border-line px-4 py-2 text-[13px] font-semibold text-ink shadow-lg tnum">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------- Add sheet ----------------

function AddSheet({
  meal,
  foods,
  nutrition,
  onClose,
  onLog,
  onSaveFood,
  onDeleteFood,
}: {
  meal: MealKey
  foods: Food[]
  nutrition: Record<string, FoodEntry[]>
  onClose: () => void
  onLog: (entry: Omit<FoodEntry, 'id'>) => void
  onSaveFood: (food: Omit<Food, 'id'>) => Food
  onDeleteFood: (id: string) => void
}) {
  const [tab, setTab] = useState<'my' | 'new'>('my')
  // Running tally + last-added name so the sheet can stay open across adds.
  const [logged, setLogged] = useState(0)
  const [lastAdded, setLastAdded] = useState<string | null>(null)

  const confirm = (name: string) => {
    setLogged((n) => n + 1)
    setLastAdded(name)
  }

  const doneLabel = logged > 0 ? `Done · ${logged} logged` : 'Done'

  return (
    <Sheet open onClose={onClose} title={`Add to ${mealLabel(meal)}`}>
      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'my', label: 'My Foods' },
            { value: 'new', label: 'New' },
          ]}
        />
      </div>
      {tab === 'my' ? (
        <>
          <MyFoods
            foods={foods}
            nutrition={nutrition}
            lastAdded={lastAdded}
            onAdd={(food, qty) => {
              onLog({
                name: food.name,
                meal,
                qty,
                kcal: food.kcal,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
              })
              confirm(food.name)
            }}
            onDeleteFood={onDeleteFood}
          />
          <Button className="w-full mt-4" onClick={onClose}>
            {doneLabel}
          </Button>
        </>
      ) : (
        <NewFood
          onSubmit={({ save, food, qty }) => {
            if (save) onSaveFood(food)
            onLog({ ...food, meal, qty })
            onClose()
          }}
        />
      )}
    </Sheet>
  )
}

function MyFoods({
  foods,
  nutrition,
  lastAdded,
  onAdd,
  onDeleteFood,
}: {
  foods: Food[]
  nutrition: Record<string, FoodEntry[]>
  lastAdded: string | null
  onAdd: (food: Food, qty: number) => void
  onDeleteFood: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [qty, setQty] = useState('1')

  // Recency-sorted first (most-recently-logged floats up), then search-filtered.
  const sorted = useMemo(() => sortFoodsByRecentUse(foods, nutrition), [foods, nutrition])
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return sorted
    return sorted.filter((f) => f.name.toLowerCase().includes(needle))
  }, [sorted, q])

  if (foods.length === 0) {
    return <EmptyState icon="🥗" text="Foods you add are saved here for instant reuse" />
  }

  const openRow = (id: string) => {
    setOpenId((cur) => (cur === id ? null : id))
    setQty('1')
  }

  return (
    <div>
      <div className="mb-3">
        <Field type="text" value={q} onChange={setQ} placeholder="Search foods" />
      </div>
      {lastAdded && (
        <p className="ember-in text-[13px] font-semibold text-good text-center mb-2 tnum">
          Added {lastAdded} ✓
        </p>
      )}
      <div className="flex flex-col gap-1">
        {filtered.map((f) => {
          const open = openId === f.id
          return (
            <div key={f.id} className="rounded-xl bg-surface-2 border border-line overflow-hidden">
              <div className="flex items-center">
                <button
                  onClick={() => openRow(f.id)}
                  className="flex-1 min-w-0 text-left px-3.5 py-3 active:opacity-70 tap"
                >
                  <div className="text-[15px] font-medium truncate">{f.name}</div>
                  <div className="text-[12px] text-ink-faint tnum mt-0.5">
                    {f.serving} · {fmtInt(f.kcal)} kcal
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${f.name}" from My Foods?`)) {
                      if (openId === f.id) setOpenId(null)
                      onDeleteFood(f.id)
                    }
                  }}
                  className="w-11 h-11 shrink-0 flex items-center justify-center text-ink-faint active:text-bad"
                  aria-label={`Delete ${f.name}`}
                >
                  <TrashIcon />
                </button>
              </div>
              {open && (
                <div className="px-3.5 pb-3.5 pt-1 flex flex-col gap-3 border-t border-line">
                  <QtyEditor value={qty} onChange={setQty} />
                  <Button
                    onClick={() => {
                      onAdd(f, parseNum(qty) || 1)
                      // Collapse the expanded row and reset qty for the next rapid add.
                      setOpenId(null)
                      setQty('1')
                    }}
                  >
                    Add {fmtInt(f.kcal * (parseNum(qty) || 1))} kcal
                  </Button>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-[13px] text-ink-faint py-6">No foods match "{q}"</p>
        )}
      </div>
    </div>
  )
}

function NewFood({
  onSubmit,
}: {
  onSubmit: (r: { save: boolean; food: Omit<Food, 'id'>; qty: number }) => void
}) {
  const [name, setName] = useState('')
  const [serving, setServing] = useState('')
  const [kcal, setKcal] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [qty, setQty] = useState('1')
  const [save, setSave] = useState(true)

  const valid = name.trim().length > 0 && parseNum(kcal) > 0

  const submit = () => {
    if (!valid) return
    onSubmit({
      save,
      food: {
        name: name.trim(),
        serving: serving.trim() || '1 serving',
        kcal: parseNum(kcal),
        protein: parseNum(protein),
        carbs: parseNum(carbs),
        fat: parseNum(fat),
      },
      qty: parseNum(qty) || 1,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="Name" type="text" value={name} onChange={setName} placeholder="Greek yogurt" />
      <Field label="Serving size" type="text" value={serving} onChange={setServing} placeholder="1 cup / 100 g" />
      <Field label="Calories" suffix="kcal" value={kcal} onChange={setKcal} placeholder="0" />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Protein" suffix="g" value={protein} onChange={setProtein} placeholder="0" />
        <Field label="Carbs" suffix="g" value={carbs} onChange={setCarbs} placeholder="0" />
        <Field label="Fat" suffix="g" value={fat} onChange={setFat} placeholder="0" />
      </div>
      <QtyEditor value={qty} onChange={setQty} />
      <button
        onClick={() => setSave((v) => !v)}
        className="flex items-center gap-3 rounded-xl bg-surface-2 border border-line px-3.5 py-3 text-left active:opacity-80 select-none"
      >
        <span
          className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center transition-colors ${
            save ? 'bg-ember text-black' : 'bg-surface border border-line'
          }`}
        >
          {save && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="text-[15px] font-medium">Save to My Foods</span>
      </button>
      <Button onClick={submit} disabled={!valid} className="mt-1">
        Add food
      </Button>
    </div>
  )
}

// ---------------- Edit entry sheet ----------------

function EditSheet({
  entry,
  onClose,
  onSave,
  onAddAgain,
  onDelete,
}: {
  entry: FoodEntry
  onClose: () => void
  onSave: (qty: number) => void
  onAddAgain: () => void
  onDelete: () => void
}) {
  const [qty, setQty] = useState(() => fmtQty(entry.qty))
  const q = parseNum(qty) || 1

  return (
    <Sheet open onClose={onClose} title="Edit entry">
      <div className="flex flex-col gap-4">
        <div className="rounded-xl bg-surface-2 border border-line px-4 py-3">
          <div className="text-[16px] font-semibold">{entry.name}</div>
          <div className="text-[12px] text-ink-faint tnum mt-0.5">{fmtInt(entry.kcal)} kcal / serving</div>
        </div>
        <Button
          onClick={() => {
            onAddAgain()
            onClose()
          }}
        >
          Add again ({fmtQty(entry.qty)}× · {fmtInt(entry.kcal * entry.qty)} kcal)
        </Button>
        <QtyEditor value={qty} onChange={setQty} />
        <div className="text-center text-[13px] text-ink-dim tnum">
          Total <span className="text-ink font-semibold">{fmtInt(entry.kcal * q)}</span> kcal · P{' '}
          {Math.round(entry.protein * q)} · C {Math.round(entry.carbs * q)} · F {Math.round(entry.fat * q)}
        </div>
        <Button
          variant="surface"
          onClick={() => {
            onSave(q)
            onClose()
          }}
        >
          Save
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            onDelete()
            onClose()
          }}
        >
          Remove entry
        </Button>
      </div>
    </Sheet>
  )
}
