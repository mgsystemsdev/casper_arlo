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

function applyTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme === 'casper' ? 'casper' : 'arlo')
}

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  return (
    <div className="w-full max-w-md rounded-none border-0 bg-charcoal p-6 sm:rounded-xl sm:border sm:border-border sm:p-8">
      <h1 className="font-display text-[2rem] font-semibold tracking-tight text-bone">Casper & Arlo</h1>
      <p className="mt-1 font-mono text-[11px] tracking-[0.08em] text-muted">Care log</p>
      <form
        className="mt-7 space-y-3"
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
      applyTheme(pick.theme)
      const [a, f] = await Promise.all([api.animal(), api.feeds.list()])
      setAnimal(a)
      setFeeds(f)
      applyTheme(a.species_pack.theme)
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
    const pick = animals.find((a) => a.id === id)
    if (pick) applyTheme(pick.theme)
    try {
      const [a, f] = await Promise.all([api.animal(), api.feeds.list()])
      setAnimal(a)
      setFeeds(f)
      applyTheme(a.species_pack.theme)
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
      <div className="w-full max-w-[1100px] bg-charcoal p-8 text-muted sm:rounded-xl sm:border sm:border-border">
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
          : 'sand'

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
        : feedUrgency === 'sand'
          ? 'text-sand'
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

  return (
    <>
      {animals.length > 1 && (
        <div className="pet-toggle" role="group" aria-label="Switch pet">
          {animals.map((a) => (
            <button
              key={a.id}
              type="button"
              className={a.id === animal.id ? 'active' : ''}
              onClick={() => void switchPet(a.id)}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
    <div className="w-full max-w-[1100px] overflow-hidden bg-charcoal text-bone sm:rounded-xl sm:border sm:border-border">
      <header className="border-b border-border px-4 pb-5 pt-5 sm:px-7 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[1.75rem] font-semibold leading-none tracking-tight text-bone sm:text-[2rem]">
              {animal.name}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              <span className="italic text-bone-dark">{animal.species}</span>
              <span className="mx-1.5 text-border-hi">·</span>
              {animal.common_name}
              <span className="mx-1.5 text-border-hi">·</span>
              {animal.sex?.toLowerCase().startsWith('f') ? '♀' : '♂'} {animal.sex}
              <span className="mx-1.5 text-border-hi">·</span>
              {animal.owner}
            </p>
            <p className="mt-1.5 font-mono text-[11px] tracking-wide text-muted">
              {animal.stage.label} · {animal.stage.desc}
              {bdayIn === 0
                ? ` · ${animal.age.months} mo · birthday today`
                : ` · ${animal.age.months} mo · born ${formatDob(animal.dob)}`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-[11px] tracking-wide text-muted">{clock}</div>
            <div className="mt-1.5 text-[12px] text-sage">{animal.status}</div>
          </div>
        </div>

        {/* Primary care signals — one strong row, not five equal cards */}
        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              Next {pack.food_noun === 'prey' ? 'feed' : 'meal'}
            </div>
            <div className={`mt-1 font-display text-[1.65rem] font-semibold leading-none ${feedToneClass}`}>
              {feedLabel}
            </div>
            <div className="mt-1 font-mono text-[12px] text-muted">
              {animal.next_feed?.due_date || 'No schedule yet'}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Handling</div>
            <div
              className={`mt-1 font-display text-[1.65rem] font-semibold leading-none ${
                animal.clear_to_handle.ready ? 'text-sage' : 'text-warn'
              }`}
            >
              {animal.clear_to_handle.ready
                ? 'Clear'
                : handleTimer.label || animal.clear_to_handle.countdown || '…'}
            </div>
            <div className="mt-1 font-mono text-[12px] text-muted">
              {animal.clear_to_handle.ready ? 'Ready to handle' : `${animal.clear_to_handle.clear_after_hours}h post-feed wait`}
            </div>
          </div>
        </div>

        {/* Secondary metrics — quiet strip, no boxes */}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3.5 sm:grid-cols-4">
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Maintenance</dt>
            <dd
              className={`mt-0.5 text-[12px] ${
                animal.next_maintenance && animal.next_maintenance.days_until < 0
                  ? 'text-danger'
                  : animal.next_maintenance && animal.next_maintenance.days_until <= 1
                    ? 'text-warn'
                    : 'text-bone-dark'
              }`}
            >
              {maintLabel}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Last handled</dt>
            <dd
              className={`mt-0.5 text-[12px] ${
                animal.handling_gap.overdue ? 'text-warn' : 'text-bone-dark'
              }`}
            >
              {handlingLabel}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {pack.supports_tail ? 'Tail' : 'Last shed'}
            </dt>
            <dd className="mt-0.5 text-[12px] text-bone-dark">
              {fifthLabel}
              <span className="text-muted"> · {fifthDetail}</span>
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">Weight</dt>
            <dd className="mt-0.5 text-[12px] text-bone-dark">
              {animal.current_weight_g != null ? `${animal.current_weight_g}g` : '—'}
              {animal.current_weight_date ? (
                <span className="text-muted"> · {animal.current_weight_date.slice(5)}</span>
              ) : null}
            </dd>
          </div>
        </dl>
      </header>

      <nav className="sticky top-0 z-10 flex gap-0 overflow-x-auto border-b border-border bg-charcoal/95 backdrop-blur-sm scrollbar-none [-webkit-overflow-scrolling:touch]">
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
                  ? 'border-sand text-sand'
                  : 'border-transparent text-muted/70 hover:text-bone-dark'
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
    </>
  )
}
