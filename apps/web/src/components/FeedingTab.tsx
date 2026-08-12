import { useEffect, useState } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api, todayStr, type AnimalOverview, type Weight, type Regurg } from '../api/client'
import { Btn, Empty, Field, Input, ListRow, LogForm, SectionLabel, Select } from './ui'

const STAGE_ORDER = ['Hatchling', 'Juvenile', 'Sub-adult', 'Adult'] as const

function chartColor(
  name: '--color-chart' | '--color-chart-grid' | '--color-surface' | '--color-ink' | '--color-border',
) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined
}

export function FeedingTab({
  animal,
  onChange,
}: {
  animal: AnimalOverview
  onChange: () => void
}) {
  const [weights, setWeights] = useState<Weight[]>([])
  const [regurgs, setRegurgs] = useState<Regurg[]>([])
  const [wDate, setWDate] = useState(todayStr())
  const [wVal, setWVal] = useState('')
  const [rDate, setRDate] = useState(todayStr())
  const [rSeverity, setRSeverity] = useState('moderate')
  const [rNotes, setRNotes] = useState('')
  const showRegurg = animal.species_pack.supports_regurg
  const [stroke, setStroke] = useState('#E8A0B8')
  const [grid, setGrid] = useState('#C4A8AE')
  const [tipBg, setTipBg] = useState('#FFFFFF')
  const [tipFg, setTipFg] = useState('#4A3B3B')
  const [tipBorder, setTipBorder] = useState('#F5DCE4')

  async function load() {
    const w = await api.weights.list()
    setWeights(w)
    if (animal.species_pack.supports_regurg) {
      setRegurgs(await api.regurgitations.list())
    } else {
      setRegurgs([])
    }
  }

  useEffect(() => {
    void load()
  }, [animal.id])

  useEffect(() => {
    setStroke(chartColor('--color-chart') || '#E8A0B8')
    setGrid(chartColor('--color-chart-grid') || '#C4A8AE')
    setTipBg(chartColor('--color-surface') || '#FFFFFF')
    setTipFg(chartColor('--color-ink') || '#4A3B3B')
    setTipBorder(chartColor('--color-border') || '#F5DCE4')
  }, [animal.id])

  const stages = animal.feeding_stages
  const current = animal.stage.label
  const intervalDays = STAGE_ORDER.map((l) => stages[l]?.feeding_interval.recommended_days).filter(
    (n): n is number => typeof n === 'number',
  )
  const minInterval = intervalDays.length ? Math.min(...intervalDays) : 1
  const maxInterval = intervalDays.length ? Math.max(...intervalDays) : 1

  return (
    <div>
      <SectionLabel>Feeding frequency by life stage</SectionLabel>
      <div className="mb-1">
        {STAGE_ORDER.map((label) => {
          const rules = stages[label]
          if (!rules) return null
          const iv = rules.feeding_interval
          const cur = label === current
          const widthPct =
            maxInterval === minInterval
              ? 70
              : Math.round((100 * (maxInterval - iv.recommended_days)) / (maxInterval - minInterval))
          return (
            <div
              key={label}
              className={`flex items-center justify-between border-b border-border/70 py-2.5 text-[13px] last:border-0 ${
                cur ? 'pl-2' : ''
              }`}
              style={cur ? { boxShadow: 'inset 3px 0 0 var(--color-rose)' } : undefined}
            >
              <span className={cur ? 'text-rose-deep' : 'text-muted'}>
                {cur ? `★ ${label}` : label}{' '}
                <span className="text-muted">({rules.desc})</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="h-1 w-24 overflow-hidden rounded-sm bg-border sm:w-28">
                  <div
                    className="h-full rounded-sm bg-rose"
                    style={{ width: `${Math.max(25, Math.min(100, widthPct))}%` }}
                  />
                </div>
                <span className="min-w-[88px] text-right font-mono text-[11px] text-rose-deep">
                  Every {iv.min_days}–{iv.max_days}d
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <SectionLabel>Weight log</SectionLabel>
      <LogForm title="Log Weight">
        <div className="flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={wDate} onChange={(e) => setWDate(e.target.value)} />
          </Field>
          <Field label="Weight (g)">
            <Input type="number" value={wVal} onChange={(e) => setWVal(e.target.value)} placeholder="e.g. 180" />
          </Field>
          <div className="flex items-end pb-0.5">
            <Btn
              onClick={async () => {
                if (!wVal) return
                await api.weights.create({ date: wDate, weight_g: Number(wVal) })
                setWVal('')
                await load()
                onChange()
              }}
            >
              Save
            </Btn>
          </div>
        </div>
      </LogForm>

      <div className="mb-2 h-[180px] w-full">
        {weights.length === 0 ? (
          <Empty>Weight chart — no data yet.</Empty>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weights.map((w) => ({ date: w.date, weight: w.weight_g }))}>
              <XAxis dataKey="date" stroke={grid} tick={{ fontSize: 11 }} />
              <YAxis stroke={grid} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: tipBg, border: `1px solid ${tipBorder}`, color: tipFg }}
              />
              <Line type="monotone" dataKey="weight" stroke={stroke} strokeWidth={2} dot={{ fill: stroke }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <SectionLabel>Weight history</SectionLabel>
      {weights.length === 0 ? (
        <Empty>No weights logged.</Empty>
      ) : (
        <ul className="mb-1">
          {[...weights].reverse().map((w) => (
            <ListRow
              key={w.id}
              primary={
                <>
                  <span className="font-mono text-[11px] text-muted">{w.date}</span>
                  {` · ${w.weight_g}g`}
                </>
              }
              onRemove={async () => {
                await api.weights.remove(w.id)
                await load()
                onChange()
              }}
            />
          ))}
        </ul>
      )}

      {showRegurg && (
        <>
          <SectionLabel>Regurgitation log</SectionLabel>
          <p className="mb-2 text-[12px] text-muted">
            Separate from refusal — regurgitation is a health red flag.
          </p>
          <LogForm title="Log Regurgitation">
            <div className="mb-2 flex flex-wrap gap-2.5">
              <Field label="Date">
                <Input type="date" value={rDate} onChange={(e) => setRDate(e.target.value)} />
              </Field>
              <Field label="Severity">
                <Select value={rSeverity} onChange={(e) => setRSeverity(e.target.value)}>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                </Select>
              </Field>
              <Field label="Notes">
                <Input value={rNotes} onChange={(e) => setRNotes(e.target.value)} placeholder="Details..." />
              </Field>
            </div>
            <Btn
              onClick={async () => {
                await api.regurgitations.create({ date: rDate, severity: rSeverity, notes: rNotes })
                setRNotes('')
                await load()
              }}
            >
              Log Regurg
            </Btn>
          </LogForm>
          {regurgs.length === 0 ? (
            <Empty>No regurgitations logged.</Empty>
          ) : (
            <ul>
              {regurgs.map((r) => (
                <ListRow
                  key={r.id}
                  tone="danger"
                  primary={`${r.date} · ${r.severity}`}
                  secondary={r.notes || undefined}
                  onRemove={async () => {
                    await api.regurgitations.remove(r.id)
                    await load()
                  }}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
