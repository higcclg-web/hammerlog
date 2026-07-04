import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BodyweightEntry,
  Exercise,
  Food,
  FoodEntry,
  Routine,
  SetEntry,
  Settings,
  Workout,
  WorkoutExercise,
} from './types'
import { EXERCISE_LIBRARY } from './exercises'
import { uid } from './util'

export interface ForgeState {
  settings: Settings
  customExercises: Exercise[]
  routines: Routine[]
  history: Workout[]
  active: Workout | null
  foods: Food[]
  nutrition: Record<string, FoodEntry[]>
  bodyweight: BodyweightEntry[]
  rest: { endsAt: number | null; total: number }

  setSettings: (patch: Partial<Settings>) => void
  addCustomExercise: (name: string, muscle: Exercise['muscle']) => Exercise
  saveRoutine: (routine: Routine) => void
  deleteRoutine: (id: string) => void

  startWorkout: (routineId?: string) => void
  renameActive: (name: string) => void
  addExerciseToActive: (exerciseId: string) => void
  removeExerciseFromActive: (weId: string) => void
  addSet: (weId: string) => void
  updateSet: (weId: string, setId: string, patch: Partial<SetEntry>) => void
  removeSet: (weId: string, setId: string) => void
  toggleSetDone: (weId: string, setId: string) => void
  finishWorkout: () => Workout | null
  discardWorkout: () => void
  deleteWorkout: (id: string) => void

  startRest: (seconds: number) => void
  clearRest: () => void

  addFood: (food: Omit<Food, 'id'>) => Food
  deleteFood: (id: string) => void
  logFood: (date: string, entry: Omit<FoodEntry, 'id'>) => void
  updateFoodEntry: (date: string, id: string, patch: Partial<FoodEntry>) => void
  deleteFoodEntry: (date: string, id: string) => void

  logBodyweight: (date: string, kg: number) => void
  deleteBodyweight: (date: string) => void

  importData: (data: unknown) => string | null
  resetAll: () => void
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'lb',
  goals: { kcal: 2200, protein: 150, carbs: 250, fat: 70 },
  restSec: 90,
  onboarded: false,
}

const emptyData = {
  settings: DEFAULT_SETTINGS,
  customExercises: [] as Exercise[],
  routines: [] as Routine[],
  history: [] as Workout[],
  active: null as Workout | null,
  foods: [] as Food[],
  nutrition: {} as Record<string, FoodEntry[]>,
  bodyweight: [] as BodyweightEntry[],
  rest: { endsAt: null as number | null, total: 90 },
}

const PERSIST_KEYS = [
  'settings',
  'customExercises',
  'routines',
  'history',
  'active',
  'foods',
  'nutrition',
  'bodyweight',
] as const

export const useStore = create<ForgeState>()(
  persist(
    (set, get) => ({
      ...structuredClone(emptyData),

      setSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      addCustomExercise: (name, muscle) => {
        const ex: Exercise = { id: 'custom-' + uid(), name: name.trim(), muscle, custom: true }
        set((s) => ({ customExercises: [...s.customExercises, ex] }))
        return ex
      },

      saveRoutine: (routine) =>
        set((s) => {
          const i = s.routines.findIndex((r) => r.id === routine.id)
          const routines = [...s.routines]
          if (i >= 0) routines[i] = routine
          else routines.push(routine)
          return { routines }
        }),

      deleteRoutine: (id) =>
        set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),

      startWorkout: (routineId) => {
        if (get().active) return
        const routine = routineId
          ? get().routines.find((r) => r.id === routineId)
          : undefined
        const exercises: WorkoutExercise[] = routine
          ? routine.exercises.map((re) => ({
              id: uid(),
              exerciseId: re.exerciseId,
              sets: re.sets.map((st) => ({
                id: uid(),
                reps: st.reps,
                weightKg: st.weightKg,
                done: false,
              })),
            }))
          : []
        set({
          active: {
            id: uid(),
            name: routine?.name ?? defaultWorkoutName(),
            startedAt: Date.now(),
            exercises,
          },
        })
      },

      renameActive: (name) =>
        set((s) => (s.active ? { active: { ...s.active, name } } : {})),

      addExerciseToActive: (exerciseId) =>
        set((s) => {
          if (!s.active) return {}
          const we: WorkoutExercise = {
            id: uid(),
            exerciseId,
            sets: [{ id: uid(), reps: 0, weightKg: 0, done: false }],
          }
          return { active: { ...s.active, exercises: [...s.active.exercises, we] } }
        }),

      removeExerciseFromActive: (weId) =>
        set((s) =>
          s.active
            ? { active: { ...s.active, exercises: s.active.exercises.filter((e) => e.id !== weId) } }
            : {},
        ),

      addSet: (weId) =>
        set((s) => {
          if (!s.active) return {}
          return {
            active: {
              ...s.active,
              exercises: s.active.exercises.map((e) => {
                if (e.id !== weId) return e
                const last = e.sets[e.sets.length - 1]
                return {
                  ...e,
                  sets: [
                    ...e.sets,
                    {
                      id: uid(),
                      reps: last?.reps ?? 0,
                      weightKg: last?.weightKg ?? 0,
                      done: false,
                    },
                  ],
                }
              }),
            },
          }
        }),

      updateSet: (weId, setId, patch) =>
        set((s) => {
          if (!s.active) return {}
          return {
            active: {
              ...s.active,
              exercises: s.active.exercises.map((e) =>
                e.id === weId
                  ? { ...e, sets: e.sets.map((st) => (st.id === setId ? { ...st, ...patch } : st)) }
                  : e,
              ),
            },
          }
        }),

      removeSet: (weId, setId) =>
        set((s) => {
          if (!s.active) return {}
          return {
            active: {
              ...s.active,
              exercises: s.active.exercises.map((e) =>
                e.id === weId ? { ...e, sets: e.sets.filter((st) => st.id !== setId) } : e,
              ),
            },
          }
        }),

      toggleSetDone: (weId, setId) => {
        const s = get()
        if (!s.active) return
        const we = s.active.exercises.find((e) => e.id === weId)
        const st = we?.sets.find((x) => x.id === setId)
        if (!st) return
        const nowDone = !st.done
        s.updateSet(weId, setId, { done: nowDone })
        if (nowDone && s.settings.restSec > 0) {
          s.startRest(s.settings.restSec)
          if ('vibrate' in navigator) navigator.vibrate?.(20)
        }
      },

      finishWorkout: () => {
        const s = get()
        if (!s.active) return null
        // keep only sets with actual work logged
        const exercises = s.active.exercises
          .map((e) => ({ ...e, sets: e.sets.filter((st) => st.reps > 0 || st.weightKg > 0) }))
          .filter((e) => e.sets.length > 0)
        const finished: Workout = { ...s.active, exercises, endedAt: Date.now() }
        set({
          history: [finished, ...s.history],
          active: null,
          rest: { endsAt: null, total: s.settings.restSec },
        })
        return finished
      },

      discardWorkout: () =>
        set((s) => ({ active: null, rest: { endsAt: null, total: s.settings.restSec } })),

      deleteWorkout: (id) =>
        set((s) => ({ history: s.history.filter((w) => w.id !== id) })),

      startRest: (seconds) =>
        set({ rest: { endsAt: Date.now() + seconds * 1000, total: seconds } }),

      clearRest: () => set((s) => ({ rest: { endsAt: null, total: s.rest.total } })),

      addFood: (food) => {
        const f: Food = { ...food, id: uid() }
        set((s) => ({ foods: [f, ...s.foods] }))
        return f
      },

      deleteFood: (id) => set((s) => ({ foods: s.foods.filter((f) => f.id !== id) })),

      logFood: (date, entry) =>
        set((s) => ({
          nutrition: {
            ...s.nutrition,
            [date]: [...(s.nutrition[date] ?? []), { ...entry, id: uid() }],
          },
        })),

      updateFoodEntry: (date, id, patch) =>
        set((s) => ({
          nutrition: {
            ...s.nutrition,
            [date]: (s.nutrition[date] ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
          },
        })),

      deleteFoodEntry: (date, id) =>
        set((s) => ({
          nutrition: {
            ...s.nutrition,
            [date]: (s.nutrition[date] ?? []).filter((e) => e.id !== id),
          },
        })),

      logBodyweight: (date, kg) =>
        set((s) => {
          const rest = s.bodyweight.filter((b) => b.date !== date)
          return { bodyweight: [...rest, { date, kg }].sort((a, b) => a.date.localeCompare(b.date)) }
        }),

      deleteBodyweight: (date) =>
        set((s) => ({ bodyweight: s.bodyweight.filter((b) => b.date !== date) })),

      importData: (data) => {
        if (typeof data !== 'object' || data === null) return 'Invalid file.'
        const d = data as Record<string, unknown>
        if ((d.app !== 'hammerlog' && d.app !== 'forgelog') || typeof d.data !== 'object' || d.data === null)
          return 'Not a Hammerlog export file.'
        const payload = d.data as Record<string, unknown>
        const next: Record<string, unknown> = {}
        for (const key of PERSIST_KEYS) {
          if (key in payload) next[key] = payload[key]
        }
        if (!('settings' in next)) return 'Export file is missing settings.'
        set({ ...structuredClone(emptyData), ...(next as Partial<ForgeState>) })
        return null
      },

      resetAll: () => set(structuredClone(emptyData)),
    }),
    {
      name: 'forgelog-data',
      version: 1,
      partialize: (s) => Object.fromEntries(PERSIST_KEYS.map((k) => [k, s[k]])),
    },
  ),
)

function defaultWorkoutName(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Morning Workout'
  if (h < 17) return 'Afternoon Workout'
  return 'Evening Workout'
}

// ---------- Derived helpers ----------

export function useAllExercises(): Exercise[] {
  const custom = useStore((s) => s.customExercises)
  return [...EXERCISE_LIBRARY, ...custom].sort((a, b) => a.name.localeCompare(b.name))
}

export function exerciseName(id: string, custom: Exercise[]): string {
  return (
    EXERCISE_LIBRARY.find((e) => e.id === id)?.name ??
    custom.find((e) => e.id === id)?.name ??
    'Unknown exercise'
  )
}

export function workoutVolumeKg(w: Workout): number {
  return w.exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s2, st) => s2 + st.reps * st.weightKg, 0),
    0,
  )
}

export function workoutSetCount(w: Workout): number {
  return w.exercises.reduce((sum, e) => sum + e.sets.length, 0)
}

/** Most recent logged sets for an exercise, from history. */
export function lastPerformance(history: Workout[], exerciseId: string): SetEntry[] | null {
  for (const w of history) {
    for (const e of w.exercises) {
      if (e.exerciseId === exerciseId && e.sets.length > 0) return e.sets
    }
  }
  return null
}

export function exportPayload(): string {
  const s = useStore.getState()
  const data = Object.fromEntries(PERSIST_KEYS.map((k) => [k, s[k]]))
  return JSON.stringify(
    { app: 'hammerlog', version: 1, exportedAt: new Date().toISOString(), data },
    null,
    2,
  )
}
