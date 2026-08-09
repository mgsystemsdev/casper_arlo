import { useEffect, useState } from 'react'
import { api, todayStr, type AnimalOverview, type Handling } from '../api/client'
import { useCountdown } from '../hooks/useCountdown'
import { Alert, Btn, Empty, Field, Input, ListRow, LogForm, SectionLabel, Select } from './ui'

export function HandlingTab({ animal, onChange }: { animal: AnimalOverview; onChange: () => void }) {
  const [rows, setRows] = useState<Handling[]>([])
  const [date, setDate] = useState(todayStr())
  const [duration, setDuration] = useState('15')
  const [temp, setTemp] = useState('calm')
  const [notes, setNotes] = useState('')

  async function load() {
    setRows(await api.handlings.list())
  }

  useEffect(() => {
    void load()
  }, [animal.id])

  const blocked = !animal.clear_to_handle.ready
  const timer = useCountdown(animal.clear_to_handle.clear_at, animal.clear_to_handle.ready)

  useEffect(() => {
    if (blocked && timer.done && animal.clear_to_handle.clear_at) {
      onChange()
    }
  }, [blocked, timer.done, animal.clear_to_handle.clear_at, onChange])

  const hours = animal.clear_to_handle.clear_after_hours

  return (
    <div>
      <Alert tone={blocked ? 'warn' : 'ok'} className="mb-1">
        {blocked ? (
          <>
            <div className="font-semibold">
              {hours}h post-feed timer — {timer.label || animal.clear_to_handle.countdown || '…'} remaining
            </div>
            <div className="mt-1 text-[12px] opacity-90">
              Started at feed log
              {animal.clear_to_handle.timer_started_at
                ? ` · ${new Date(animal.clear_to_handle.timer_started_at).toLocaleString()}`
                : ''}
              {animal.clear_to_handle.clear_at
                ? ` · clears ${new Date(animal.clear_to_handle.clear_at).toLocaleString()}`
                : ''}
            </div>
          </>
        ) : (
          <div className="font-semibold">{animal.clear_to_handle.message}</div>
        )}
        {animal.species_pack.key === 'crested_gecko' && (
          <div className="mt-1 text-[12px] opacity-90">
            Cresties: keep sessions short; never grab the tail.
          </div>
        )}
      </Alert>

      <SectionLabel>Log handling — {animal.name}</SectionLabel>
      <LogForm title="Handling Session">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Duration (min)">
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </Field>
          <Field label="Temperament">
            <Select value={temp} onChange={(e) => setTemp(e.target.value)}>
              <option value="calm">Calm</option>
              <option value="nippy">
                {animal.species_pack.key === 'crested_gecko' ? 'Jumpy / defensive' : 'Nippy'}
              </option>
              <option value="musk">
                {animal.species_pack.key === 'crested_gecko' ? 'Stressed' : 'Musk'}
              </option>
            </Select>
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <Btn
          disabled={blocked}
          onClick={async () => {
            await api.handlings.create({
              date,
              duration_min: Number(duration) || 15,
              temperament: temp,
              notes,
            })
            setNotes('')
            await load()
            onChange()
          }}
        >
          {blocked ? 'Locked until timer clears' : 'Log Handling'}
        </Btn>
      </LogForm>

      <SectionLabel>History</SectionLabel>
      {rows.length === 0 ? (
        <Empty>No handling sessions logged.</Empty>
      ) : (
        <ul>
          {rows.map((r) => (
            <ListRow
              key={r.id}
              primary={
                <>
                  <span className="font-mono text-[11px] text-sand">{r.date}</span>
                  {` · ${r.duration_min} min · ${r.temperament}`}
                </>
              }
              secondary={r.notes || undefined}
              onRemove={async () => {
                await api.handlings.remove(r.id)
                await load()
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
