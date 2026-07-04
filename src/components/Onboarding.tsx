import { useState } from 'react'
import { useStore } from '../lib/store'
import { Button, Field, Segmented } from './ui'
import { dateKey, parseNum, toKg } from '../lib/util'
import type { Unit } from '../lib/types'

const STEPS = 4

export function Onboarding() {
  const setSettings = useStore((s) => s.setSettings)
  const logBodyweight = useStore((s) => s.logBodyweight)
  const [step, setStep] = useState(0)
  const [unit, setUnit] = useState<Unit>('lb')
  const [kcal, setKcal] = useState('2200')
  const [protein, setProtein] = useState('150')
  const [carbs, setCarbs] = useState('250')
  const [fat, setFat] = useState('70')
  const [weight, setWeight] = useState('')

  function finish() {
    setSettings({
      unit,
      goals: {
        kcal: parseNum(kcal) || 2200,
        protein: parseNum(protein) || 150,
        carbs: parseNum(carbs) || 250,
        fat: parseNum(fat) || 70,
      },
      onboarded: true,
    })
    const w = parseNum(weight)
    if (w > 0) logBodyweight(dateKey(), toKg(w, unit))
  }

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : finish())

  return (
    <div className="fixed inset-0 z-[60] bg-bg flex flex-col safe-top safe-bottom">
      <div className="flex items-center justify-between px-6 pt-6">
        <div className="flex gap-1.5">
          {Array.from({ length: STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? 'w-6 bg-ember' : 'w-1.5 bg-surface-2'
              }`}
            />
          ))}
        </div>
        <button onClick={finish} className="text-ink-faint font-semibold text-[14px]">
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 max-w-md w-full mx-auto">
        <div className="mb-8">
          <div className="text-4xl mb-3">{['🏋️', '🔥', '🥩', '⚖️'][step]}</div>
          <h1 className="text-2xl font-extrabold mb-1.5">
            {
              [
                'Which units do you lift in?',
                'Daily calorie target?',
                'Macro targets?',
                'Current bodyweight?',
              ][step]
            }
          </h1>
          <p className="text-ink-dim text-[15px]">
            {
              [
                'You can switch anytime — your data converts automatically.',
                'A rough number is fine. Edit it later in Settings.',
                'Grams per day. Defaults are a sensible starting point.',
                'Optional — used for your bodyweight trend chart.',
              ][step]
            }
          </p>
        </div>

        {step === 0 && (
          <Segmented
            options={[
              { value: 'lb', label: 'Pounds (lb)' },
              { value: 'kg', label: 'Kilograms (kg)' },
            ]}
            value={unit}
            onChange={setUnit}
          />
        )}
        {step === 1 && <Field value={kcal} onChange={setKcal} suffix="kcal" />}
        {step === 2 && (
          <div className="space-y-3">
            <Field label="Protein" value={protein} onChange={setProtein} suffix="g" />
            <Field label="Carbs" value={carbs} onChange={setCarbs} suffix="g" />
            <Field label="Fat" value={fat} onChange={setFat} suffix="g" />
          </div>
        )}
        {step === 3 && (
          <Field value={weight} onChange={setWeight} suffix={unit} placeholder="Optional" />
        )}
      </div>

      <div className="px-6 pb-8 max-w-md w-full mx-auto">
        <Button onClick={next} className="w-full py-4 text-[16px]">
          {step < STEPS - 1 ? 'Continue' : 'Start forging'}
        </Button>
      </div>
    </div>
  )
}
