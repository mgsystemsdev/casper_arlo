import type { ReactNode } from 'react'

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 mb-3 flex items-center gap-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted first:mt-0">
      {children}
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}

/** Use only for interactive groups or true object containers — not static copy. */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border bg-surface p-3.5 ${className}`}>{children}</div>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
      {children}
    </div>
  )
}

/** Key/value list without a card chrome — for facts, targets, tips. */
export function FactList({
  rows,
}: {
  rows: [string, string][]
}) {
  return (
    <div className="divide-y divide-border">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-2.5 text-[13px]">
          <span className="shrink-0 text-muted">{k}</span>
          <span className="max-w-[65%] text-right font-mono text-[12px] text-ink">{v}</span>
        </div>
      ))}
    </div>
  )
}

export function Btn({
  children,
  onClick,
  type = 'button',
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="min-h-11 cursor-pointer rounded-md bg-rose-deep px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-white transition hover:brightness-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  )
}

export function BtnSm({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-md border border-border bg-surface px-2 font-mono text-[11px] text-muted transition hover:border-rose hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {children}
    </button>
  )
}

export function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`flex min-w-[120px] flex-1 flex-col gap-1 ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-md border border-border bg-surface px-2.5 py-2.5 text-[13px] text-ink outline-none transition focus:border-rose-deep focus:ring-2 focus:ring-rose-deep/20'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className || ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className || ''}`} />
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="py-10 text-center text-[13px] text-muted">{children}</div>
}

/** Action surface only — logging forms. */
export function LogForm({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5 rounded-lg border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(74,59,59,0.06)]">
      <div className="mb-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-rose-deep">
        {title}
      </div>
      {children}
    </div>
  )
}

type AlertTone = 'ok' | 'warn' | 'danger' | 'neutral' | 'accent'

const ALERT: Record<AlertTone, string> = {
  ok: 'border-ok-bg bg-ok-bg/45 text-ok',
  warn: 'border-warn-bg bg-warn-bg/40 text-warn',
  danger: 'border-danger-bg bg-danger-bg/50 text-danger',
  neutral: 'border-border bg-surface text-ink',
  accent: 'border-blush bg-accent-bg text-ink',
}

export function Alert({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: AlertTone
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-md border px-3 py-2.5 text-[13px] ${ALERT[tone]} ${className}`}>
      {children}
    </div>
  )
}

/** Compact history row — no heavy card chrome. */
export function ListRow({
  primary,
  secondary,
  onRemove,
  tone = 'default',
}: {
  primary: ReactNode
  secondary?: ReactNode
  onRemove?: () => void | Promise<void>
  tone?: 'default' | 'danger'
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-b border-border py-2.5 text-[13px] last:border-0">
      <div className="min-w-0">
        <div className={`font-medium ${tone === 'danger' ? 'text-danger' : 'text-ink'}`}>{primary}</div>
        {secondary != null && <div className="mt-0.5 text-[12px] text-muted">{secondary}</div>}
      </div>
      {onRemove && (
        <BtnSm
          onClick={() => {
            void onRemove()
          }}
        >
          ✕
        </BtnSm>
      )}
    </li>
  )
}

export function DataTable({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`-mx-1 overflow-x-auto ${className}`}>
      <table className="w-full min-w-[520px] border-collapse text-left">{children}</table>
    </div>
  )
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`px-2.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-muted ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  className = '',
  mono,
}: {
  children?: ReactNode
  className?: string
  mono?: boolean
}) {
  return (
    <td className={`px-2.5 py-2.5 text-[12px] text-ink ${mono ? 'font-mono text-[11px]' : ''} ${className}`}>
      {children}
    </td>
  )
}
