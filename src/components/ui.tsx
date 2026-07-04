import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-surface border border-line/60 ${className}`}>{children}</div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 mb-2 mt-6 first:mt-0">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-ink-faint">
        {children}
      </h2>
      {action}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'surface'
  className?: string
  disabled?: boolean
}) {
  const styles = {
    primary:
      'bg-gradient-to-b from-ember-hi to-ember text-black font-bold active:opacity-80 disabled:opacity-40',
    surface: 'bg-surface-2 text-ink font-semibold active:bg-line disabled:opacity-40',
    ghost: 'bg-transparent text-ink-dim font-semibold active:text-ink disabled:opacity-40',
    danger: 'bg-bad/15 text-bad font-semibold active:bg-bad/25 disabled:opacity-40',
  }[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-3 text-[15px] transition-colors select-none ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

/** Bottom sheet. Rendered only when open. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70 animate-fade" onClick={onClose} />
      <div className="relative animate-sheet rounded-t-3xl bg-surface border-t border-line max-h-[88dvh] flex flex-col safe-bottom">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-surface-2 text-ink-dim flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-6 no-scrollbar">{children}</div>
      </div>
    </div>
  )
}

/** Full-screen overlay page (routine editor, legal pages, workout detail). */
export function FullScreen({
  title,
  onBack,
  children,
  action,
}: {
  title: string
  onBack: () => void
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 bg-bg flex flex-col animate-fade">
      <div className="safe-top shrink-0 bg-bg/95 backdrop-blur border-b border-line/60">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={onBack}
            className="text-ember font-semibold text-[15px] flex items-center gap-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
          <h2 className="font-bold text-[16px] absolute left-1/2 -translate-x-1/2 max-w-[55%] truncate">
            {title}
          </h2>
          <div>{action}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 no-scrollbar">{children}</div>
    </div>
  )
}

export function Field({
  label,
  suffix,
  value,
  onChange,
  onBlur,
  placeholder,
  type = 'decimal',
}: {
  label?: string
  suffix?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  placeholder?: string
  type?: 'decimal' | 'text'
}) {
  return (
    <label className="block">
      {label && <span className="block text-[13px] text-ink-dim mb-1.5 font-medium">{label}</span>}
      <div className="flex items-center rounded-xl bg-surface-2 border border-line focus-within:border-ember/70 transition-colors">
        <input
          className="w-full bg-transparent px-3.5 py-3 outline-none text-ink placeholder:text-ink-faint tnum"
          inputMode={type === 'decimal' ? 'decimal' : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
        />
        {suffix && <span className="pr-3.5 text-ink-faint text-[14px] shrink-0">{suffix}</span>}
      </div>
    </label>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-xl bg-surface-2 p-1 border border-line">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg py-2 text-[14px] font-semibold transition-colors ${
            value === o.value ? 'bg-ember text-black' : 'text-ink-dim'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="text-center py-10 text-ink-faint">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-[14px]">{text}</p>
    </div>
  )
}
