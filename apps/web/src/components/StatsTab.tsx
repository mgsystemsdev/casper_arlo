import { useEffect, useMemo, useState } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  api,
  mediaUrl,
  type AnimalOverview,
  type EnvReading,
  type Feed,
  type Handling,
  type Maint,
  type Photo,
  type Regurg,
  type ShedCycle,
  type TailEvent,
  type Weight,
} from '../api/client'
import { Alert, Empty, FactList, SectionLabel } from './ui'

type Point = { date: string; label: string; tone?: 'ok' | 'warn' | 'muted' }

function chartColor(name: '--color-chart' | '--color-chart-grid' | '--color-surface' | '--color-ink' | '--color-border') {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface/90 p-3.5 shadow-[0_1px_2px_rgba(74,59,59,0.04)]">
      {children}
    </div>
  )
}

function Track({ label, points }: { label: string; points: Point[] }) {
  const sorted = useMemo(() => [...points].sort((a, b) => a.date.localeCompare(b.date)), [points])
  if (!sorted.length) return null
  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <Panel>
        <div className="flex gap-4 overflow-x-auto pb-0.5 scrollbar-none">
          {sorted.map((p, i) => (
            <div key={`${p.date}-${p.label}-${i}`} className="w-16 shrink-0 text-center">
              <div
                className={`mx-auto h-2 w-2 rounded-full ${
                  p.tone === 'ok' ? 'bg-ok-bg' : p.tone === 'warn' ? 'bg-warn-bg' : 'bg-rose'
                }`}
              />
              <div className="mt-1.5 font-mono text-[10px] text-muted">{p.date.slice(5)}</div>
              <div className="mt-0.5 text-[11px] leading-tight text-ink">{p.label}</div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  )
}

function daysBetween(a: string, b: string) {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()
  return Math.round(ms / 86400000)
}

function median(nums: number[]) {
  if (!nums.length) return null
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function fmtDelta(n: number, unit = 'g') {
  return `${n >= 0 ? '+' : ''}${n.toFixed(0)}${unit}`
}

function countdownLabel(days: number | null | undefined) {
  if (days == null) return '—'
  if (days < 0) return `overdue ${Math.abs(days)}d`
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days}d`
}

function inBand(v: number, lo: number, hi: number) {
  return v >= lo && v <= hi
}

const FLAG_KINDS = new Set([
  'weight_drop',
  'weight_stall',
  'shed_window',
  'env_stale',
  'regurg',
  'feed_overdue',
])

export function StatsTab({ animal, onChange }: { animal: AnimalOverview; onChange: () => void }) {
  const pack = animal.species_pack
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [weights, setWeights] = useState<Weight[]>([])
  const [handlings, setHandlings] = useState<Handling[]>([])
  const [sheds, setSheds] = useState<ShedCycle[]>([])
  const [env, setEnv] = useState<EnvReading[]>([])
  const [maint, setMaint] = useState<Maint[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [regurgs, setRegurgs] = useState<Regurg[]>([])
  const [tails, setTails] = useState<TailEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [stroke, setStroke] = useState('#E8A0B8')
  const [grid, setGrid] = useState('#C4A8AE')
  const [tipBg, setTipBg] = useState('#FFFFFF')
  const [tipFg, setTipFg] = useState('#4A3B3B')
  const [tipBorder, setTipBorder] = useState('#F5DCE4')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [f, w, h, s, e, m, p, r, t] = await Promise.all([
        api.feeds.list(),
        api.weights.list(),
        api.handlings.list(),
        api.shedCycles.list(),
        api.envReadings.list(),
        api.maintenance.list(),
        api.photos.list(),
        pack.supports_regurg ? api.regurgitations.list() : Promise.resolve([] as Regurg[]),
        pack.supports_tail ? api.tailEvents.list() : Promise.resolve([] as TailEvent[]),
      ])
      if (cancelled) return
      setFeeds(f)
      setWeights(w)
      setHandlings(h)
      setSheds(s)
      setEnv(e)
      setMaint(m)
      setPhotos([...p].sort((a, b) => a.taken_at.localeCompare(b.taken_at)))
      setRegurgs(r)
      setTails(t)
      setLoaded(true)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [animal.id, pack.supports_regurg, pack.supports_tail])

  useEffect(() => {
    setStroke(chartColor('--color-chart') || '#E8A0B8')
    setGrid(chartColor('--color-chart-grid') || '#C4A8AE')
    setTipBg(chartColor('--color-surface') || '#FFFFFF')
    setTipFg(chartColor('--color-ink') || '#4A3B3B')
    setTipBorder(chartColor('--color-border') || '#F5DCE4')
  }, [animal.id])

  const feedPoints: Point[] = useMemo(() => {
    const ordered = [...feeds].sort((a, b) => a.date.localeCompare(b.date))
    return ordered.map((f, i) => {
      const prev = ordered[i - 1]
      const gap = prev ? daysBetween(prev.date, f.date) : null
      return {
        date: f.date,
        label: f.accepted ? (gap != null ? `${gap}d ok` : 'ok') : 'refused',
        tone: f.accepted ? 'ok' : 'warn',
      }
    })
  }, [feeds])

  const handlePoints: Point[] = useMemo(() => {
    const ordered = [...handlings].sort((a, b) => a.date.localeCompare(b.date))
    return ordered.map((h, i) => {
      const prev = ordered[i - 1]
      const gap = prev ? daysBetween(prev.date, h.date) : null
      return { date: h.date, label: gap != null ? `${gap}d` : `${h.duration_min}m` }
    })
  }, [handlings])

  const shedPoints: Point[] = useMemo(
    () =>
      [...sheds]
        .sort((a, b) => a.started_at.localeCompare(b.started_at))
        .map((s) => ({ date: s.started_at, label: s.status })),
    [sheds],
  )

  const maintPoints: Point[] = useMemo(
    () =>
      [...maint]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((m) => ({
          date: m.date,
          label: m.kind === 'deep_clean' ? 'deep' : m.kind === 'substrate' ? (pack.key === 'crested_gecko' ? 'mist' : 'sub') : 'water',
        })),
    [maint, pack.key],
  )

  const envChart = useMemo(
    () =>
      [...env]
        .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
        .map((r) => ({
          date: r.recorded_at.slice(0, 10),
          hot: r.temp_hot_f,
          cool: r.temp_cool_f,
          rh: r.humidity_pct,
        })),
    [env],
  )

  const empty =
    loaded &&
    !feeds.length &&
    !weights.length &&
    !handlings.length &&
    !sheds.length &&
    !env.length &&
    !maint.length &&
    !photos.length &&
    !regurgs.length &&
    !tails.length

  const wSorted = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights])
  const fSorted = useMemo(() => [...feeds].sort((a, b) => a.date.localeCompare(b.date)), [feeds])
  const hSorted = useMemo(() => [...handlings].sort((a, b) => a.date.localeCompare(b.date)), [handlings])
  const eSorted = useMemo(
    () => [...env].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at)),
    [env],
  )

  const rhBand = animal.shed_mode.active ? pack.env.rh_shed : pack.env.rh_normal
  const isPrey = pack.food_noun === 'prey'

  const insight = useMemo(() => {
    let weightMain = animal.current_weight_g != null ? `${animal.current_weight_g}g` : '—'
    let weightSub = 'No weight logged'
    if (wSorted.length >= 2) {
      const last = wSorted[wSorted.length - 1]
      const prev = wSorted[wSorted.length - 2]
      const d = last.weight_g - prev.weight_g
      const cutoff = new Date(last.date + 'T00:00:00')
      cutoff.setDate(cutoff.getDate() - 30)
      const win = wSorted.filter((w) => new Date(w.date + 'T00:00:00') >= cutoff)
      const parts = [`${fmtDelta(d)} vs last`]
      if (win.length >= 2) parts.push(`${fmtDelta(win[win.length - 1].weight_g - win[0].weight_g)} / 30d`)
      weightSub = parts.join(' · ')
    } else if (animal.current_weight_g != null) {
      weightSub = animal.current_weight_date ? `Logged ${animal.current_weight_date}` : 'Current'
    }

    const next = animal.next_feed
    const gaps = fSorted.slice(1).map((f, i) => daysBetween(fSorted[i].date, f.date))
    const medGap = median(gaps)
    const refused = fSorted.filter((f) => !f.accepted).length
    const feedMain = next ? countdownLabel(next.days_until) : '—'
    let feedSub = next ? `every ${next.interval_days}d` : 'No forecast'
    if (next?.interval_source) feedSub += ` · ${next.interval_source}`
    if (medGap != null) feedSub += ` · med ${Math.round(medGap)}d`
    if (fSorted.length) feedSub += ` · ${Math.round((refused / fSorted.length) * 100)}% refused`

    const sp = animal.shed_prediction
    let shedMain = '—'
    let shedSub = 'Need more history'
    if (animal.shed_mode.active) {
      shedMain = animal.shed_mode.status
      shedSub = `In shed · RH ${animal.shed_mode.humidity_target}`
    } else if (sp?.estimate_date) {
      shedMain = countdownLabel(sp.days_until)
      shedSub = `~${sp.estimate_date}`
      if (sp.median_days != null) shedSub += ` · med ${sp.median_days}d`
      if (sp.in_window) shedSub += ' · window'
    } else if (sp?.why) {
      shedSub = sp.why
    }

    let habitatMain = '—'
    let habitatSub = 'No readings'
    let habitatPct: number | null = null
    if (eSorted.length) {
      const ok = eSorted.filter(
        (r) =>
          inBand(r.temp_hot_f, pack.env.hot[0], pack.env.hot[1]) &&
          inBand(r.temp_cool_f, pack.env.cool[0], pack.env.cool[1]) &&
          inBand(r.humidity_pct, rhBand[0], rhBand[1]),
      ).length
      habitatPct = Math.round((ok / eSorted.length) * 100)
      habitatMain = `${habitatPct}%`
      const last = eSorted[eSorted.length - 1]
      habitatSub = `${ok}/${eSorted.length} in band · last ${last.recorded_at.slice(0, 10)}`
    }

    const fr = animal.feeding_recommendation
    const prey = fr.suggested_prey ?? fr.recommended_prey[0]
    const hg = animal.handling_gap
    const cth = animal.clear_to_handle
    const hGaps = hSorted.slice(1).map((h, i) => daysBetween(hSorted[i].date, h.date))
    const medH = median(hGaps)
    let handleVal = cth.ready ? 'Clear' : 'Locked'
    if (hg.days_since != null) handleVal += ` · ${hg.days_since}d ago`
    else handleVal += ' · never'
    if (medH != null) handleVal += ` · med ${Math.round(medH)}d`

    const nextM = animal.next_maintenance
    const overdue = (animal.maintenance_items ?? []).filter((i) => i.overdue)
    let upkeepVal = nextM ? `${nextM.label} ${countdownLabel(nextM.days_until)}` : '—'
    if (overdue.length) upkeepVal += ` · ${overdue.length} overdue`

    const facts: [string, string][] = [
      [isPrey ? 'Feeding' : 'Meals', next ? `every ${next.interval_days}d${next.interval_why ? ` · ${next.interval_why}` : ''}` : 'No forecast'],
    ]
    if (prey) facts.push([isPrey ? 'Prey' : 'Food', prey + (fr.suggestion_why ? ` — ${fr.suggestion_why}` : '')])
    facts.push(['Handling', handleVal])
    facts.push(['Upkeep', upkeepVal])
    if (pack.supports_regurg && regurgs.length) {
      const lastR = [...regurgs].sort((a, b) => a.date.localeCompare(b.date))
      const last = lastR[lastR.length - 1]
      facts.push(['Regurg', `${regurgs.length} logged` + (last ? ` · ${last.date}` : '')])
    }
    if (pack.supports_tail) {
      const intact = animal.tail_status?.intact !== false
      const last = animal.last_tail ?? animal.tail_status?.last
      facts.push(['Tail', intact ? 'Intact' : `Dropped${last ? ` · ${last.date}` : ''}`])
    }

    return {
      kpis: [
        { label: 'Weight', main: weightMain, sub: weightSub },
        { label: isPrey ? 'Next feed' : 'Next meal', main: feedMain, sub: feedSub },
        { label: 'Shed', main: shedMain, sub: shedSub },
        { label: 'Habitat', main: habitatMain, sub: habitatSub },
      ],
      facts,
      habitatPct,
    }
  }, [
    animal,
    wSorted,
    fSorted,
    hSorted,
    eSorted,
    rhBand,
    isPrey,
    pack.env.hot,
    pack.env.cool,
    pack.supports_regurg,
    pack.supports_tail,
    regurgs,
  ])

  const flags = (animal.reminders ?? []).filter((r) => FLAG_KINDS.has(r.kind))

  return (
    <div className="space-y-1">
      <section>
        <SectionLabel>How they&apos;re doing</SectionLabel>
        <div className="overflow-hidden rounded-lg border border-border bg-accent-bg">
          <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
            {insight.kpis.map((k) => (
              <div key={k.label} className="bg-accent-bg px-3.5 py-4 sm:px-4">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{k.label}</div>
                <div className="mt-1.5 font-display text-[1.65rem] font-semibold leading-none tracking-tight text-ink sm:text-[1.85rem]">
                  {k.main}
                </div>
                <p className="mt-2 text-[11px] leading-snug text-muted">{k.sub}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-lg border border-border bg-surface px-3.5">
          <FactList rows={insight.facts} />
        </div>
        {flags.length > 0 && (
          <div className="mt-3 space-y-2">
            {flags.map((f) => (
              <Alert key={f.kind + f.message} tone={f.severity === 'high' ? 'danger' : f.severity === 'medium' ? 'warn' : 'accent'}>
                <div>{f.message}</div>
                {f.why ? <div className="mt-0.5 text-[12px] opacity-80">{f.why}</div> : null}
              </Alert>
            ))}
          </div>
        )}
      </section>

      {!loaded ? <p className="text-[13px] text-muted">Loading upkeep…</p> : null}
      {loaded && empty ? <Empty>Log care to see upkeep over time.</Empty> : null}

      {loaded && !empty && (
        <>
          <section>
            <SectionLabel>Photos</SectionLabel>
            <Panel>
              {photos.length === 0 ? (
                <p className="text-[13px] text-muted">No photos yet.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-0.5 scrollbar-none">
                  {photos.map((p) => {
                    const hero = p.id === animal.hero_photo_id
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => void api.setHero(hero ? null : p.id).then(() => onChange())}
                        className={`shrink-0 text-left ${hero ? 'ring-2 ring-rose-deep ring-offset-2 ring-offset-surface' : ''}`}
                        aria-pressed={hero}
                        title={hero ? 'Current profile — tap to clear' : 'Set as profile'}
                      >
                        <img
                          src={mediaUrl(p.url)}
                          alt={p.caption || p.kind}
                          className="h-24 w-24 rounded-md border border-border object-cover"
                        />
                        <div className="mt-1 font-mono text-[10px] text-muted">{p.taken_at.slice(5)}</div>
                        {hero ? <div className="font-mono text-[9px] uppercase tracking-wide text-rose-deep">Profile</div> : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </Panel>
          </section>

          <section>
            <SectionLabel>Weight</SectionLabel>
            <Panel>
              {wSorted.length === 0 ? (
                <p className="text-[13px] text-muted">No weights yet.</p>
              ) : (
                <>
                  <p className="mb-2 font-display text-xl font-semibold text-ink">
                    {animal.current_weight_g != null ? `${animal.current_weight_g}g` : '—'}
                    {wSorted.length > 1 ? (
                      <span className="ml-2 font-sans text-[13px] font-normal text-muted">
                        {fmtDelta(wSorted[wSorted.length - 1].weight_g - wSorted[0].weight_g)} since first
                      </span>
                    ) : null}
                  </p>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={wSorted.map((w) => ({ date: w.date, weight: w.weight_g }))}>
                        <XAxis dataKey="date" stroke={grid} tick={{ fontSize: 11 }} />
                        <YAxis stroke={grid} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: tipBg, border: `1px solid ${tipBorder}`, color: tipFg }} />
                        <Line type="monotone" dataKey="weight" stroke={stroke} strokeWidth={2} dot={{ fill: stroke }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </Panel>
          </section>

          <Track label="Feeding rhythm" points={feedPoints} />
          <Track label="Handling" points={handlePoints} />
          <Track
            label={
              animal.shed_prediction?.median_days != null
                ? `Shed · median ${animal.shed_prediction.median_days}d`
                : 'Shed'
            }
            points={shedPoints}
          />

          <section>
            <SectionLabel>Habitat</SectionLabel>
            <Panel>
              {envChart.length === 0 ? (
                <p className="text-[13px] text-muted">No readings yet.</p>
              ) : (
                <>
                  <p className="mb-2 text-[12px] text-muted">
                    {insight.habitatPct != null ? `${insight.habitatPct}% in target · ` : ''}
                    hot {pack.env.hot[0]}–{pack.env.hot[1]}°F · cool {pack.env.cool[0]}–{pack.env.cool[1]}°F · RH{' '}
                    {rhBand[0]}–{rhBand[1]}%
                  </p>
                  <div className="h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={envChart}>
                        <XAxis dataKey="date" stroke={grid} tick={{ fontSize: 11 }} />
                        <YAxis stroke={grid} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: tipBg, border: `1px solid ${tipBorder}`, color: tipFg }} />
                        <Line type="monotone" dataKey="hot" stroke={stroke} strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="cool" stroke="#6F5A5B" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="rh" stroke="#3F6B52" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </Panel>
          </section>

          <Track label="Maintenance" points={maintPoints} />
          {pack.supports_regurg && (
            <Track
              label="Regurg"
              points={regurgs.map((r) => ({ date: r.date, label: r.severity, tone: 'warn' as const }))}
            />
          )}
          {pack.supports_tail && (
            <Track label="Tail" points={tails.map((t) => ({ date: t.date, label: t.cause || 'drop', tone: 'warn' as const }))} />
          )}
        </>
      )}
    </div>
  )
}
