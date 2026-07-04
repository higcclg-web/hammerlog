import { useRef, useState } from 'react'
import { Card, Field, SectionTitle, Segmented } from '../components/ui'
import { exportPayload, useStore } from '../lib/store'
import { dateKey, parseNum } from '../lib/util'
import type { Unit } from '../lib/types'
import { LegalPage } from './Legal'

const REST_OPTIONS = [
  { value: '0', label: 'Off' },
  { value: '60', label: '60s' },
  { value: '90', label: '90s' },
  { value: '120', label: '2m' },
  { value: '180', label: '3m' },
] as const

function Row({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="w-full flex justify-between items-center px-4 py-3.5 text-left disabled:cursor-default"
    >
      {children}
    </button>
  )
}

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-ink-faint shrink-0">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const foods = useStore((s) => s.foods)
  const setSettings = useStore((s) => s.setSettings)
  const deleteFood = useStore((s) => s.deleteFood)
  const importData = useStore((s) => s.importData)
  const resetAll = useStore((s) => s.resetAll)

  const [goals, setGoals] = useState({
    kcal: String(settings.goals.kcal),
    protein: String(settings.goals.protein),
    carbs: String(settings.goals.carbs),
    fat: String(settings.goals.fat),
  })
  const [showAllFoods, setShowAllFoods] = useState(false)
  const [legal, setLegal] = useState<'privacy' | 'terms' | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)

  function commitGoal(key: keyof typeof goals, fallbackAllowed: boolean) {
    const parsed = parseNum(goals[key])
    // kcal must never fall to 0/blank; the others may be 0.
    const value = parsed > 0 || fallbackAllowed ? parsed : settings.goals[key]
    setGoals((g) => ({ ...g, [key]: String(value) }))
    setSettings({ goals: { ...settings.goals, [key]: value } })
  }

  function handleExport() {
    const blob = new Blob([exportPayload()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hammerlog-export-${dateKey()}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      alert('That file is not valid JSON.')
      return
    }
    if (!window.confirm('This replaces ALL current data. Continue?')) return
    const err = importData(parsed)
    if (err) alert(err)
    else alert('Import complete.')
  }

  function handleReset() {
    if (!window.confirm('Reset all data? This clears every workout, log, and setting.')) return
    if (
      !window.confirm(
        'Are you absolutely sure? This is permanent and cannot be undone. Export first if you want a backup.',
      )
    )
      return
    resetAll()
  }

  const visibleFoods = showAllFoods ? foods : foods.slice(0, 8)

  return (
    <div>
      <SectionTitle>Units</SectionTitle>
      <Card className="p-4">
        <Segmented<Unit>
          options={[
            { value: 'lb', label: 'Pounds (lb)' },
            { value: 'kg', label: 'Kilograms (kg)' },
          ]}
          value={settings.unit}
          onChange={(unit) => setSettings({ unit })}
        />
        <p className="text-[13px] text-ink-faint mt-2.5 leading-relaxed">
          Weights are stored in kilograms, so existing data converts automatically when you switch.
        </p>
      </Card>

      <SectionTitle>Daily Goals</SectionTitle>
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Calories"
            suffix="kcal"
            value={goals.kcal}
            onChange={(v) => setGoals((g) => ({ ...g, kcal: v }))}
            onBlur={() => commitGoal('kcal', false)}
          />
          <Field
            label="Protein"
            suffix="g"
            value={goals.protein}
            onChange={(v) => setGoals((g) => ({ ...g, protein: v }))}
            onBlur={() => commitGoal('protein', true)}
          />
          <Field
            label="Carbs"
            suffix="g"
            value={goals.carbs}
            onChange={(v) => setGoals((g) => ({ ...g, carbs: v }))}
            onBlur={() => commitGoal('carbs', true)}
          />
          <Field
            label="Fat"
            suffix="g"
            value={goals.fat}
            onChange={(v) => setGoals((g) => ({ ...g, fat: v }))}
            onBlur={() => commitGoal('fat', true)}
          />
        </div>
      </Card>

      <SectionTitle>Rest Timer</SectionTitle>
      <Card className="p-4">
        <Segmented
          options={REST_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          value={String(settings.restSec)}
          onChange={(v) => setSettings({ restSec: Number(v) })}
        />
        <p className="text-[13px] text-ink-faint mt-2.5 leading-relaxed">
          Automatically starts after you complete a set.
        </p>
      </Card>

      <SectionTitle>My Foods</SectionTitle>
      <Card>
        {foods.length === 0 ? (
          <p className="px-4 py-3.5 text-[14px] text-ink-faint">
            No saved foods yet. Foods you save while logging nutrition appear here.
          </p>
        ) : (
          <>
            {visibleFoods.map((f, i) => (
              <div
                key={f.id}
                className={`flex justify-between items-center px-4 py-3 ${
                  i > 0 ? 'border-t border-line/60' : ''
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="text-[15px] text-ink truncate">{f.name}</div>
                  <div className="text-[13px] text-ink-faint truncate">
                    {f.serving} · <span className="tnum">{Math.round(f.kcal)}</span> kcal
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Delete ${f.name}`}
                  onClick={() => {
                    if (window.confirm(`Delete "${f.name}" from your saved foods?`)) deleteFood(f.id)
                  }}
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-bad active:bg-bad/15"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M4 7h16M9 7V4h6v3m-8 0v13a1 1 0 001 1h8a1 1 0 001-1V7M10 11v6M14 11v6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
            {foods.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllFoods((v) => !v)}
                className="w-full px-4 py-3 text-[14px] font-semibold text-ember border-t border-line/60 text-left"
              >
                {showAllFoods ? 'Show less' : `Show all ${foods.length}`}
              </button>
            )}
          </>
        )}
      </Card>

      <SectionTitle>Data</SectionTitle>
      <Card>
        <Row onClick={handleExport}>
          <span className="text-[15px] text-ink">Export data</span>
          <Chevron />
        </Row>
        <div className="border-t border-line/60">
          <Row onClick={() => fileRef.current?.click()}>
            <span className="text-[15px] text-ink">Import data</span>
            <Chevron />
          </Row>
        </div>
        <div className="border-t border-line/60">
          <Row onClick={handleReset}>
            <span className="text-[15px] text-bad">Reset all data</span>
          </Row>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </Card>

      <SectionTitle>About &amp; Legal</SectionTitle>
      <Card>
        <Row onClick={() => setLegal('privacy')}>
          <span className="text-[15px] text-ink">Privacy Policy</span>
          <Chevron />
        </Row>
        <div className="border-t border-line/60">
          <Row onClick={() => setLegal('terms')}>
            <span className="text-[15px] text-ink">Terms of Use</span>
            <Chevron />
          </Row>
        </div>
        <div className="border-t border-line/60">
          <Row>
            <span className="text-[15px] text-ink-dim">Version</span>
            <span className="text-[15px] text-ink-faint tnum">Hammerlog 1.0.0</span>
          </Row>
        </div>
      </Card>

      <p className="text-center text-ink-faint text-[13px] mt-8">
        Forged locally. All data stays on this device.
      </p>

      {legal && <LegalPage kind={legal} onBack={() => setLegal(null)} />}
    </div>
  )
}
