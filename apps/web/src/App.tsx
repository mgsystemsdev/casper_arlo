import { useCallback, useEffect, useState } from 'react'
import {
  api,
  clearToken,
  getActiveAnimalId,
  getToken,
  setActiveAnimalId,
  setToken,
  type AnimalOverview,
  type AnimalSummary,
  type Feed,
  type Reminder,
} from './api/client'
import { JournalTab, LocalTab, PhotosTab, SettingsTab } from './components/ExtrasTabs'
import { FeedingTab } from './components/FeedingTab'
import { HabitatTab } from './components/HabitatTab'
import { HandlingTab } from './components/HandlingTab'
import { HealthTab } from './components/HealthTab'
import { OverviewTab } from './components/OverviewTab'
import { PreyTab, SpeciesTab } from './components/StaticTabs'
import { Btn, Field, Input } from './components/ui'
import { useCountdown } from './hooks/useCountdown'

type TabId =
  | 'overview'
  | 'feeding'
  | 'handling'
  | 'prey'
  | 'habitat'
  | 'health'
  | 'journal'
  | 'photos'
  | 'species'
  | 'settings'
  | 'local'

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="w-full max-w-md px-6 py-10 sm:px-0">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Care log</p>
      <h1 className="mt-2 font-display text-[2.25rem] font-semibold tracking-tight text-ink">
        Casper & Arlo
      </h1>
      <form
        className="mt-8 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          try {
            const { token } = await api.login(password)
            setToken(token)
            onOk()
          } catch {
            setError('Invalid password')
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
        </Field>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <Btn type="submit" disabled={busy}>
          Enter
        </Btn>
      </form>
    </div>
  )
}

function formatDob(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Days until next birthday (0 = today). */
function daysUntilBirthday(dobIso: string): number {
  const dob = new Date(dobIso + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
  if (next < today) {
    next = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate())
  }
  return Math.round((next.getTime() - today.getTime()) / 86400000)
}

function reminderLabel(severity: string) {
  if (severity === 'high') return 'Needs attention'
  if (severity === 'medium') return 'Due soon'
  return 'Note'
}

function ReminderList({ reminders }: { reminders: Reminder[] }) {
  if (!reminders.length) return null
  return (
    <section className="mt-5 space-y-1" aria-label="Care reminders">
      {reminders.map((r) => {
        const tone =
          r.severity === 'high' ? 'reminder-high' : r.severity === 'medium' ? 'reminder-medium' : 'reminder-low'
        return (
          <div key={r.kind + r.message} className={`reminder ${tone}`}>
            <div
              className={`font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${
                r.severity === 'high' ? 'text-warn' : r.severity === 'medium' ? 'text-rose-deep' : 'text-muted'
              }`}
            >
              {reminderLabel(r.severity)}
            </div>
            <div className={`mt-0.5 text-[13px] leading-snug ${r.severity === 'high' ? 'text-warn' : 'text-ink'}`}>
              {r.message}
            </div>
            {r.why && <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{r.why}</div>}
          </div>
        )
      })}
    </section>
  )
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken())
  const [tab, setTab] = useState<TabId>('overview')
  const [animals, setAnimals] = useState<AnimalSummary[]>([])
  const [animal, setAnimal] = useState<AnimalOverview | null>(null)
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [clock, setClock] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const list = await api.animals()
      setAnimals(list)
      if (!list.length) {
        setError('No animals seeded')
        return
      }
      const stored = getActiveAnimalId()
      const pick = list.find((a) => a.id === stored) || list[0]
      setActiveAnimalId(pick.id)
      const [a, f] = await Promise.all([api.animal(), api.feeds.list()])
      setAnimal(a)
      setFeeds(f)
      setError('')
    } catch (e) {
      if (String(e).includes('Unauthorized')) {
        setAuthed(false)
        return
      }
      setError(String(e))
    }
  }, [])

  useEffect(() => {
    if (authed) void refresh()
  }, [authed, refresh])

  async function switchPet(id: number) {
    setActiveAnimalId(id)
    setAnimal(null)
    setTab('overview')
    try {
      const [a, f] = await Promise.all([api.animal(), api.feeds.list()])
      setAnimal(a)
      setFeeds(f)
      setError('')
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setClock(
        now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
          ' · ' +
          now.toLocaleTimeString('en-GB', { hour12: false }),
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const handleTimer = useCountdown(
    animal?.clear_to_handle.clear_at,
    animal?.clear_to_handle.ready ?? true,
  )

  useEffect(() => {
    if (!animal) return
    if (!animal.clear_to_handle.ready && handleTimer.done && animal.clear_to_handle.clear_at) {
      void refresh()
    }
  }, [handleTimer.done, animal, refresh])

  if (!authed) {
    return <Login onOk={() => setAuthed(true)} />
  }

  if (!animal) {
    return (
      <div className="w-full max-w-[1100px] px-6 py-10 text-muted sm:px-0">
        {error || 'Loading…'}
      </div>
    )
  }

  const bdayIn = daysUntilBirthday(animal.dob)
  const pack = animal.species_pack
  const primaryTabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'feeding', label: 'Feeding' },
    { id: 'handling', label: 'Handling' },
    { id: 'prey', label: pack.guide_label },
    { id: 'habitat', label: 'Habitat' },
    { id: 'health', label: 'Health' },
  ]
  const secondaryTabs: { id: TabId; label: string }[] = [
    { id: 'journal', label: 'Journal' },
    { id: 'photos', label: 'Photos' },
    { id: 'species', label: 'Species' },
    { id: 'settings', label: 'Settings' },
    ...(import.meta.env.DEV ? [{ id: 'local' as const, label: 'Local' }] : []),
  ]
  const tabs = [...primaryTabs, ...secondaryTabs]

  const feedUrgency =
    animal.next_feed == null
      ? 'muted'
      : animal.next_feed.days_until < 0
        ? 'danger'
        : animal.next_feed.days_until <= 2
          ? 'warn'
          : 'ok'

  const feedLabel = animal.next_feed
    ? animal.next_feed.days_until < 0
      ? `${Math.abs(animal.next_feed.days_until)}d overdue`
      : animal.next_feed.days_until === 0
        ? 'Due today'
        : `In ${animal.next_feed.days_until}d`
    : 'Log a feed'

  const feedToneClass =
    feedUrgency === 'danger'
      ? 'text-danger'
      : feedUrgency === 'warn'
        ? 'text-warn'
        : feedUrgency === 'ok'
          ? 'text-ink'
          : 'text-muted'

  const maintLabel = animal.next_maintenance
    ? `${animal.next_maintenance.label}${
        animal.next_maintenance.days_until < 0
          ? ` · ${Math.abs(animal.next_maintenance.days_until)}d overdue`
          : animal.next_maintenance.days_until === 0
            ? ' · today'
            : ` · in ${animal.next_maintenance.days_until}d`
      }`
    : '—'

  const handlingLabel =
    animal.handling_gap.last_date == null
      ? 'None'
      : animal.handling_gap.days_since === 0
        ? 'Today'
        : animal.handling_gap.overdue
          ? `${animal.handling_gap.days_since}d overdue`
          : `${animal.handling_gap.days_since}d ago`

  const fifthLabel = pack.supports_tail
    ? animal.tail_status?.intact
      ? 'Intact'
      : 'Dropped'
    : animal.last_shed?.date?.slice(5) || '—'

  const fifthDetail = pack.supports_tail
    ? animal.last_tail
      ? `${animal.last_tail.date.slice(5)} · ${animal.last_tail.cause || 'drop'}`
      : 'No drop'
    : animal.last_shed?.quality || 'None'

  const mastheadReminders = animal.reminders.filter((r) => r.severity === 'high' || r.severity === 'medium')

  return (
    <div className="w-full max-w-[1100px] text-ink">
      <header className="px-4 pb-6 pt-5 sm:px-7 sm:pt-8">
        <div className="flex items-start justify-between gap-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Casper & Arlo</p>
          <div className="shrink-0 text-right font-mono text-[11px] tracking-wide text-muted">{clock}</div>
        </div>

        {animals.length > 1 && (
          <div className="mt-4" role="group" aria-label="Switch pet">
            <div className="pet-toggle">
              {animals.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={a.id === animal.id ? 'active' : ''}
                  aria-pressed={a.id === animal.id}
                  onClick={() => void switchPet(a.id)}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[1.85rem] font-semibold leading-none tracking-tight text-ink sm:text-[2.15rem]">
              {animal.name}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              <span className="italic text-ink">{animal.species}</span>
              <span className="mx-1.5 text-border">·</span>
              {animal.common_name}
              <span className="mx-1.5 text-border">·</span>
              {animal.sex?.toLowerCase().startsWith('f') ? '♀' : '♂'} {animal.sex}
              <span className="mx-1.5 text-border">·</span>
              {animal.owner}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <span className="stage-badge">{animal.stage.label}</span>
              <span className="font-mono text-[11px] tracking-wide text-muted">
                {animal.stage.desc}
                {bdayIn === 0
                  ? ` · ${animal.age.months} mo · birthday today`
                  : ` · ${animal.age.months} mo · born ${formatDob(animal.dob)}`}
              </span>
            </div>
          </div>
          <div className="shrink-0 pt-1 text-right">
            <div className="text-[12px] font-medium text-ok">{animal.status}</div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-5 border-t border-border pt-5 sm:grid-cols-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              Next {pack.food_noun === 'prey' ? 'feed' : 'meal'}
            </div>
            <div className={`mt-1.5 font-display text-[1.7rem] font-semibold leading-none ${feedToneClass}`}>
              {feedLabel}
            </div>
            <div className="mt-1.5 font-mono text-[12px] text-muted">
              {animal.next_feed?.due_date || 'No schedule yet'}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Handling</div>
            <div
              className={`mt-1.5 font-display text-[1.7rem] font-semibold leading-none ${
                animal.clear_to_handle.ready ? 'text-ok' : 'text-warn'
              }`}
            >
              {animal.clear_to_handle.ready
                ? 'Clear'
                : handleTimer.label || animal.clear_to_handle.countdown || '…'}
            </div>
            <div className="mt-1.5 font-mono text-[12px] text-muted">
              {animal.clear_to_handle.ready
                ? 'Ready to handle'
                : `${animal.clear_to_handle.clear_after_hours}h post-feed wait`}
            </div>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-4">
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Maintenance</dt>
            <dd
              className={`mt-0.5 text-[12px] ${
                animal.next_maintenance && animal.next_maintenance.days_until < 0
                  ? 'text-danger'
                  : animal.next_maintenance && animal.next_maintenance.days_until <= 1
                    ? 'text-warn'
                    : 'text-ink'
              }`}
            >
              {maintLabel}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Last handled</dt>
            <dd className={`mt-0.5 text-[12px] ${animal.handling_gap.overdue ? 'text-warn' : 'text-ink'}`}>
              {handlingLabel}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {pack.supports_tail ? 'Tail' : 'Last shed'}
            </dt>
            <dd className="mt-0.5 text-[12px] text-ink">
              {fifthLabel}
              <span className="text-muted"> · {fifthDetail}</span>
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Weight</dt>
            <dd className="mt-0.5 text-[12px] text-ink">
              {animal.current_weight_g != null ? `${animal.current_weight_g}g` : '—'}
              {animal.current_weight_date ? (
                <span className="text-muted"> · {animal.current_weight_date.slice(5)}</span>
              ) : null}
            </dd>
          </div>
        </dl>

        <ReminderList reminders={mastheadReminders} />
      </header>

      <nav className="sticky top-0 z-10 flex gap-0 overflow-x-auto border-b border-border bg-bg/95 backdrop-blur-sm scrollbar-none [-webkit-overflow-scrolling:touch]">
        {tabs.map((t, i) => {
          const isSecondary = i >= primaryTabs.length
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-11 shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-[11px] uppercase tracking-[0.06em] transition sm:px-3.5 ${
                isSecondary ? 'font-medium' : 'font-bold'
              } ${
                tab === t.id
                  ? 'border-rose text-rose-deep'
                  : 'border-transparent text-muted/80 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </nav>

      <main className="px-4 pb-10 pt-5 sm:px-7 sm:pb-9 sm:pt-6">
        {tab === 'overview' && <OverviewTab animal={animal} feeds={feeds} onChange={refresh} />}
        {tab === 'feeding' && <FeedingTab animal={animal} onChange={refresh} />}
        {tab === 'handling' && <HandlingTab animal={animal} onChange={refresh} />}
        {tab === 'prey' && <PreyTab animal={animal} />}
        {tab === 'habitat' && <HabitatTab animal={animal} />}
        {tab === 'health' && <HealthTab animal={animal} onChange={refresh} />}
        {tab === 'journal' && <JournalTab animal={animal} />}
        {tab === 'photos' && <PhotosTab animal={animal} />}
        {tab === 'species' && <SpeciesTab animal={animal} />}
        {tab === 'settings' && (
          <SettingsTab
            animal={animal}
            onLogout={() => {
              clearToken()
              setAuthed(false)
            }}
          />
        )}
        {import.meta.env.DEV && tab === 'local' && <LocalTab animal={animal} />}
      </main>
    </div>
  )
}
