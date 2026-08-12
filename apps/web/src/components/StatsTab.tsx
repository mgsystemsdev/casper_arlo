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
import { Alert, Empty, SectionLabel } from './ui'

type Point = { date: string; label: string; tone?: 'ok' | 'warn' | 'muted' }

function chartColor(name: '--color-chart' | '--color-chart-grid' | '--color-surface' | '--color-ink' | '--color-border') {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined
}

function Track({ label, points }: { label: string; points: Point[] }) {
  const sorted = useMemo(() => [...points].sort((a, b) => a.date.localeCompare(b.date)), [points])
  if (!sorted.length) return null
  return (
    <section>
      <SectionLabel>{label}</SectionLabel>
      <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none">
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
  if (days < 0) return `overdue by ${Math.abs(days)}d`
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

  const stories = useMemo(() => {
    const rows: { label: string; value: string; note?: string }[] = []

    let weight = animal.current_weight_g != null ? `${animal.current_weight_g}g` : 'No weight logged'
    if (wSorted.length >= 2) {
      const last = wSorted[wSorted.length - 1]
      const prev = wSorted[wSorted.length - 2]
      const d = last.weight_g - prev.weight_g
      const pct = prev.weight_g ? (d / prev.weight_g) * 100 : 0
      weight += ` · ${fmtDelta(d)} vs last (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`
      const cutoff = new Date(last.date + 'T00:00:00')
      cutoff.setDate(cutoff.getDate() - 30)
      const win = wSorted.filter((w) => new Date(w.date + 'T00:00:00') >= cutoff)
      if (win.length >= 2) {
        weight += ` · ${fmtDelta(win[win.length - 1].weight_g - win[0].weight_g)} / 30d`
      }
    }
    if (animal.weight_due?.countdown) weight += ` · log ${animal.weight_due.countdown}`
    rows.push({ label: 'Weight', value: weight })

    const next = animal.next_feed
    const gaps = fSorted.slice(1).map((f, i) => daysBetween(fSorted[i].date, f.date))
    const medGap = median(gaps)
    const refused = fSorted.filter((f) => !f.accepted).length
    let feed = next
      ? `Next ${countdownLabel(next.days_until)} (${next.due_date}) · every ${next.interval_days}d`
      : 'No feed forecast yet'
    if (next?.interval_source) feed += ` · ${next.interval_source}`
    if (medGap != null) feed += ` · median gap ${Math.round(medGap)}d`
    if (fSorted.length) feed += ` · refused ${Math.round((refused / fSorted.length) * 100)}% (${fSorted.length} logs)`
    const fr = animal.feeding_recommendation
    const prey = fr.suggested_prey ?? fr.recommended_prey[0]
    rows.push({
      label: isPrey ? 'Feeding' : 'Meals',
      value: feed,
      note: next?.interval_why,
    })
    if (prey) {
      rows.push({
        label: isPrey ? 'Prey' : 'Food',
        value: prey,
        note: fr.suggestion_why,
      })
    }

    const hg = animal.handling_gap
    const cth = animal.clear_to_handle
    let handle = cth.ready ? 'Clear to handle' : cth.message || 'Wait after feed'
    if (hg.days_since != null) handle += ` · last ${hg.days_since}d ago (max ${hg.max_gap_days}d)`
    else handle += ` · never handled (max ${hg.max_gap_days}d)`
    const hGaps = hSorted.slice(1).map((h, i) => daysBetween(hSorted[i].date, h.date))
    const medH = median(hGaps)
    if (medH != null) handle += ` · median ${Math.round(medH)}d between sessions`
    rows.push({ label: 'Handling', value: handle })

    const sp = animal.shed_prediction
    let shed: string
    let shedNote: string | undefined
    if (animal.shed_mode.active) {
      shed = `In shed · ${animal.shed_mode.status} · RH ${animal.shed_mode.humidity_target}`
    } else if (sp?.estimate_date) {
      shed = `Next ~${sp.estimate_date} (${countdownLabel(sp.days_until)})`
      if (sp.median_days != null) shed += ` · median ${sp.median_days}d`
      if (sp.sample_cycles != null) shed += ` · ${sp.sample_cycles} cycle${sp.sample_cycles === 1 ? '' : 's'}`
      if (sp.in_window) shed += ' · window open'
      shedNote = sp.why
    } else {
      shed = sp?.why || 'Not enough shed history to predict'
    }
    rows.push({ label: 'Shed', value: shed, note: shedNote })

    let habitat = 'No readings yet'
    if (eSorted.length) {
      const ok = eSorted.filter(
        (r) =>
          inBand(r.temp_hot_f, pack.env.hot[0], pack.env.hot[1]) &&
          inBand(r.temp_cool_f, pack.env.cool[0], pack.env.cool[1]) &&
          inBand(r.humidity_pct, rhBand[0], rhBand[1]),
      ).length
      const last = eSorted[eSorted.length - 1]
      habitat = `${Math.round((ok / eSorted.length) * 100)}% of readings in target (${ok}/${eSorted.length}) · last ${last.recorded_at.slice(0, 10)} ${last.temp_hot_f}/${last.temp_cool_f}°F ${last.humidity_pct}% RH`
    }
    rows.push({ label: 'Habitat', value: habitat })

    const items = animal.maintenance_items ?? []
    const overdue = items.filter((i) => i.overdue)
    const nextM = animal.next_maintenance
    let upkeep = nextM ? `${nextM.label} ${countdownLabel(nextM.days_until)}` : 'No maintenance schedule'
    if (overdue.length) upkeep += ` · ${overdue.length} overdue`
    rows.push({ label: 'Upkeep', value: upkeep })

    if (pack.supports_regurg && regurgs.length) {
      const lastR = [...regurgs].sort((a, b) => a.date.localeCompare(b.date))
      const last = lastR[lastR.length - 1]
      rows.push({
        label: 'Regurg',
        value: `${regurgs.length} logged` + (last ? ` · last ${last.date} (${last.severity})` : ''),
      })
    }
    if (pack.supports_tail) {
      const intact = animal.tail_status?.intact !== false
      const last = animal.last_tail ?? animal.tail_status?.last
      rows.push({
        label: 'Tail',
        value: intact
          ? 'Intact'
          : `Dropped` + (last ? ` · ${last.date}${last.cause ? ` · ${last.cause}` : ''}` : ''),
      })
    }

    return rows
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
    <div className="space-y-2">
      <section>
        <SectionLabel>How they&apos;re doing</SectionLabel>
        <div className="space-y-3">
          {stories.map((s) => (
            <div key={s.label}>
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{s.label}</div>
              <p className="mt-0.5 text-[13px] leading-snug text-ink">{s.value}</p>
              {s.note ? <p className="mt-0.5 text-[12px] leading-snug text-muted">{s.note}</p> : null}
            </div>
          ))}
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
        {photos.length === 0 ? (
          <p className="text-[13px] text-muted">No photos yet.</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {photos.map((p) => {
              const hero = p.id === animal.hero_photo_id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => void api.setHero(hero ? null : p.id).then(() => onChange())}
                  className={`shrink-0 text-left ${hero ? 'ring-2 ring-rose-deep ring-offset-2 ring-offset-bg' : ''}`}
                  aria-pressed={hero}
                  title={hero ? 'Current profile — tap to clear' : 'Set as profile'}
                >
                  <img
                    src={mediaUrl(p.url)}
                    alt={p.caption || p.kind}
                    className="h-20 w-20 rounded-md border border-border object-cover"
                  />
                  <div className="mt-1 font-mono text-[10px] text-muted">{p.taken_at.slice(5)}</div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Weight</SectionLabel>
        {weights.length === 0 ? (
          <p className="text-[13px] text-muted">No weights yet.</p>
        ) : (
          <>
            <p className="mb-2 text-[13px] text-ink">
              {animal.current_weight_g != null ? `${animal.current_weight_g}g` : '—'}
              {weights.length > 1 ? (
                <span className="text-muted">
                  {' '}
                  · {weights[weights.length - 1].weight_g - weights[0].weight_g >= 0 ? '+' : ''}
                  {(weights[weights.length - 1].weight_g - weights[0].weight_g).toFixed(0)}g since first log
                </span>
              ) : null}
            </p>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...weights].sort((a, b) => a.date.localeCompare(b.date)).map((w) => ({ date: w.date, weight: w.weight_g }))}>
                  <XAxis dataKey="date" stroke={grid} tick={{ fontSize: 11 }} />
                  <YAxis stroke={grid} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: tipBg, border: `1px solid ${tipBorder}`, color: tipFg }} />
                  <Line type="monotone" dataKey="weight" stroke={stroke} strokeWidth={2} dot={{ fill: stroke }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
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
        {envChart.length === 0 ? (
          <p className="text-[13px] text-muted">No readings yet.</p>
        ) : (
          <>
            <p className="mb-2 text-[12px] text-muted">
              Targets · hot {pack.env.hot[0]}–{pack.env.hot[1]}°F · cool {pack.env.cool[0]}–{pack.env.cool[1]}°F · RH{' '}
              {pack.env.rh_normal[0]}–{pack.env.rh_normal[1]}%
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
