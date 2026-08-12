import { useMemo, useState } from 'react'
import {
  api,
  todayStr,
  type AnimalOverview,
  type Feed,
  type PreyStatus,
} from '../api/client'
import {
  Alert,
  Btn,
  BtnSm,
  DataTable,
  Empty,
  Field,
  Input,
  LogForm,
  SectionLabel,
  Select,
  Td,
  Th,
} from './ui'

const STATUS_LABEL: Record<PreyStatus, string> = {
  recommended: 'Recommended',
  acceptable: 'Acceptable',
  alternative: 'Alternative',
  too_small: 'Too small',
  too_large: 'Too large',
  unknown: 'Unknown',
}

const STATUS_CLASS: Record<PreyStatus, string> = {
  recommended: 'text-ok',
  acceptable: 'text-rose-deep',
  alternative: 'text-ink',
  too_small: 'text-warn',
  too_large: 'text-danger',
  unknown: 'text-muted',
}

export function OverviewTab({
  animal,
  feeds,
  onChange,
}: {
  animal: AnimalOverview
  feeds: Feed[]
  onChange: () => void
}) {
  const preyList = animal.prey_categories
  const defaultPrey =
    animal.feeding_recommendation.suggested_prey ??
    animal.feeding_recommendation.recommended_prey[0] ??
    preyList[0] ??
    'Adult mouse'

  const [date, setDate] = useState(todayStr())
  const [prey, setPrey] = useState(defaultPrey)
  const [accepted, setAccepted] = useState(true)
  const [preyWeight, setPreyWeight] = useState('')
  const [snakeWeight, setSnakeWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const liveStatus: PreyStatus | null = useMemo(() => {
    return animal.feeding_recommendation.prey_status_by_category[prey] ?? 'unknown'
  }, [animal.feeding_recommendation.prey_status_by_category, prey])

  async function logFeed() {
    setBusy(true)
    try {
      await api.feeds.create({
        date,
        prey_type: prey,
        accepted,
        prey_weight_g: preyWeight ? Number(preyWeight) : null,
        snake_weight_g: snakeWeight ? Number(snakeWeight) : null,
        notes,
      })
      setNotes('')
      setPreyWeight('')
      setSnakeWeight('')
      onChange()
    } finally {
      setBusy(false)
    }
  }

  const next = animal.next_feed
  const fr = animal.feeding_recommendation
  const iv = fr.feeding_interval
  const pack = animal.species_pack
  const isPrey = pack.food_noun === 'prey'

  return (
    <div>
      {animal.reminders.some((r) => r.severity === 'low') && (
        <>
          <SectionLabel>Notes</SectionLabel>
          <div className="mb-1 space-y-2">
            {animal.reminders
              .filter((r) => r.severity === 'low')
              .map((r) => (
                <p key={r.kind + r.message} className="text-[13px] leading-relaxed text-muted">
                  {r.message}
                  {r.why ? <span className="mt-0.5 block text-[11px]">{r.why}</span> : null}
                </p>
              ))}
          </div>
        </>
      )}

      <SectionLabel>Feeding recommendation · {fr.stage}</SectionLabel>
      <div className="mb-1 max-w-2xl">
        <p className="text-[15px] leading-snug text-ink">
          Every{' '}
          <span className="font-display text-[1.35rem] font-semibold text-rose-deep">
            {next?.interval_days ?? iv.recommended_days}d
          </span>
          <span className="text-muted">
            {' '}
            · safe {iv.min_days}–{iv.max_days}d
            {next?.interval_source ? ` · ${next.interval_source}` : ''}
          </span>
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink">
          Suggested: {fr.suggested_prey ?? fr.recommended_prey[0] ?? '—'}
          {fr.suggestion_why ? ` — ${fr.suggestion_why}` : ''}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Stage band: {fr.recommended_prey.join(', ')}. Handle after feed:{' '}
          {animal.clear_to_handle.clear_after_hours}h timer. Overdue feeds don&apos;t stretch the next gap.
        </p>
        {next?.interval_why && (
          <p className="mt-1 text-[11px] text-muted">{next.interval_why}</p>
        )}
        {animal.last_feed && fr.prey_status && (
          <p className={`mt-2 text-[12px] ${STATUS_CLASS[fr.prey_status]}`}>
            Last {isPrey ? 'prey' : 'food'} ({animal.last_feed.prey_type}): {STATUS_LABEL[fr.prey_status]}
            {animal.last_feed.date ? ` · ${animal.last_feed.date}` : ''}
          </p>
        )}
        {animal.shed_prediction?.estimate_date && (
          <p className="mt-1 text-[12px] text-muted">
            Next shed ~{animal.shed_prediction.estimate_date}
            {animal.shed_prediction.median_days != null
              ? ` (median ${animal.shed_prediction.median_days}d cycles)`
              : ''}
          </p>
        )}
      </div>

      {animal.shed_mode.active && (
        <Alert tone="accent" className="mt-4">
          Shed status: {animal.shed_mode.status} · humidity {animal.shed_mode.humidity_target}
          {animal.shed_mode.dont_feed ? ' · do not feed while opaque' : ''}
        </Alert>
      )}

      <SectionLabel>Quick {pack.food_noun} log</SectionLabel>
      <LogForm title={`Log a ${isPrey ? 'Feed' : 'Meal'}`}>
        <div className="mb-2.5 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={isPrey ? 'Prey Type' : 'Food'}>
            <Select value={prey} onChange={(e) => setPrey(e.target.value)}>
              {preyList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            {liveStatus && (
              <div className={`mt-1 text-[11px] ${STATUS_CLASS[liveStatus]}`}>
                {STATUS_LABEL[liveStatus]} for {fr.stage}
              </div>
            )}
          </Field>
          <Field label="Accepted?">
            <Select
              value={accepted ? 'yes' : 'no'}
              onChange={(e) => setAccepted(e.target.value === 'yes')}
            >
              <option value="yes">Yes</option>
              <option value="no">Refused</option>
            </Select>
          </Field>
          <Field label={isPrey ? 'Prey (g)' : 'Amount (g)'} className="max-w-[100px]">
            <Input
              type="number"
              placeholder="e.g. 25"
              value={preyWeight}
              onChange={(e) => setPreyWeight(e.target.value)}
            />
          </Field>
          <Field label="Weight (g)" className="max-w-[100px]">
            <Input
              type="number"
              placeholder="e.g. 320"
              value={snakeWeight}
              onChange={(e) => setSnakeWeight(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Input
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1"
          />
          <Btn onClick={logFeed} disabled={busy}>
            Log {isPrey ? 'Feed' : 'Meal'}
          </Btn>
        </div>
      </LogForm>

      <SectionLabel>Recent feeding history</SectionLabel>
      {feeds.length === 0 ? (
        <Empty>No feeds logged yet.</Empty>
      ) : (
        <>
          {/* Mobile: stacked rows */}
          <ul className="space-y-0 sm:hidden">
            {feeds.map((f) => (
              <li
                key={f.id}
                className="flex items-start justify-between gap-3 border-b border-border py-3"
              >
                <div>
                  <div className="font-mono text-[11px] text-muted">{f.date}</div>
                  <div className="mt-0.5 text-[13px] text-ink">
                    {f.prey_type}
                    {f.prey_weight_g != null ? ` · ${f.prey_weight_g}g` : ''}
                  </div>
                  <div
                    className={`mt-0.5 text-[12px] font-medium ${f.accepted ? 'text-ok' : 'text-danger'}`}
                  >
                    {f.accepted ? 'Accepted' : 'Refused'}
                    {f.snake_weight_g != null ? ` · animal ${f.snake_weight_g}g` : ''}
                  </div>
                  {f.notes ? <div className="mt-0.5 text-[11px] text-muted">{f.notes}</div> : null}
                </div>
                <BtnSm
                  onClick={async () => {
                    await api.feeds.remove(f.id)
                    onChange()
                  }}
                >
                  ✕
                </BtnSm>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <DataTable>
              <thead>
                <tr className="border-b border-border">
                  <Th>Date</Th>
                  <Th>{isPrey ? 'Prey' : 'Food'}</Th>
                  <Th>{isPrey ? 'Prey g' : 'Amt'}</Th>
                  <Th>Result</Th>
                  <Th>Weight</Th>
                  <Th>Notes</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {feeds.map((f) => (
                  <tr key={f.id} className="border-b border-border/70">
                    <Td mono>{f.date}</Td>
                    <Td>{f.prey_type}</Td>
                    <Td>{f.prey_weight_g != null ? `${f.prey_weight_g}g` : '—'}</Td>
                    <Td className={f.accepted ? 'font-medium text-ok' : 'font-medium text-danger'}>
                      {f.accepted ? 'Accepted' : 'Refused'}
                    </Td>
                    <Td>{f.snake_weight_g != null ? `${f.snake_weight_g}g` : '—'}</Td>
                    <Td className="text-muted">{f.notes || '—'}</Td>
                    <Td>
                      <BtnSm
                        onClick={async () => {
                          await api.feeds.remove(f.id)
                          onChange()
                        }}
                      >
                        ✕
                      </BtnSm>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </>
      )}
    </div>
  )
}
