import { useEffect, useState } from 'react'
import { api, todayStr, type AnimalOverview, type EnvReading, type Maint } from '../api/client'
import {
  Btn,
  BtnSm,
  DataTable,
  Empty,
  FactList,
  Field,
  Input,
  ListRow,
  LogForm,
  SectionLabel,
  Select,
  Td,
  Th,
} from './ui'

export function HabitatTab({ animal }: { animal: AnimalOverview }) {
  const pack = animal.species_pack
  const env = pack.env
  const [readings, setReadings] = useState<EnvReading[]>([])
  const [maint, setMaint] = useState<Maint[]>([])
  const [hot, setHot] = useState(String(Math.round((env.hot[0] + env.hot[1]) / 2)))
  const [cool, setCool] = useState(String(Math.round((env.cool[0] + env.cool[1]) / 2)))
  const [night, setNight] = useState(String(Math.round((env.night[0] + env.night[1]) / 2)))
  const [rh, setRh] = useState(String(Math.round((env.rh_normal[0] + env.rh_normal[1]) / 2)))
  const [notes, setNotes] = useState('')
  const [mDate, setMDate] = useState(todayStr())
  const [mKind, setMKind] = useState('water')
  const [mNotes, setMNotes] = useState('')

  async function load() {
    const [e, m] = await Promise.all([api.envReadings.list(), api.maintenance.list()])
    setReadings(e)
    setMaint(m)
  }

  useEffect(() => {
    void load()
    setHot(String(Math.round((env.hot[0] + env.hot[1]) / 2)))
    setCool(String(Math.round((env.cool[0] + env.cool[1]) / 2)))
    setNight(String(Math.round((env.night[0] + env.night[1]) / 2)))
    setRh(String(Math.round((env.rh_normal[0] + env.rh_normal[1]) / 2)))
  }, [animal.id, env.hot, env.cool, env.night, env.rh_normal])

  return (
    <div>
      <SectionLabel>Temperature targets</SectionLabel>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {pack.habitat_zones.map((z) => (
          <div key={z.label}>
            <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">{z.label}</div>
            <div className="mt-0.5 font-display text-xl font-semibold text-sand">{z.f}</div>
            <div className="mt-0.5 text-[11px] text-muted">{z.c}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Log actual reading — {animal.name}</SectionLabel>
      <LogForm title="Temp & Humidity">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label={`${env.hot_label || 'Hot'} °F`}>
            <Input type="number" value={hot} onChange={(e) => setHot(e.target.value)} />
          </Field>
          <Field label={`${env.cool_label || 'Cool'} °F`}>
            <Input type="number" value={cool} onChange={(e) => setCool(e.target.value)} />
          </Field>
          <Field label={`${env.night_label || 'Night'} °F`}>
            <Input type="number" value={night} onChange={(e) => setNight(e.target.value)} />
          </Field>
          <Field label="Humidity %">
            <Input type="number" value={rh} onChange={(e) => setRh(e.target.value)} />
          </Field>
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <Btn
          onClick={async () => {
            await api.envReadings.create({
              recorded_at: new Date().toISOString(),
              temp_hot_f: Number(hot),
              temp_cool_f: Number(cool),
              temp_night_f: night ? Number(night) : null,
              humidity_pct: Number(rh),
              notes,
            })
            setNotes('')
            await load()
          }}
        >
          Save Reading
        </Btn>
      </LogForm>

      {readings.length === 0 ? (
        <Empty>No environment readings yet.</Empty>
      ) : (
        <DataTable className="mb-2">
          <thead>
            <tr className="border-b border-border">
              <Th>When</Th>
              <Th>Hot</Th>
              <Th>Cool</Th>
              <Th>Night</Th>
              <Th>RH%</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id} className="border-b border-border/70">
                <Td mono>{r.recorded_at.slice(0, 16).replace('T', ' ')}</Td>
                <Td>{r.temp_hot_f}°</Td>
                <Td>{r.temp_cool_f}°</Td>
                <Td>{r.temp_night_f ?? '—'}°</Td>
                <Td>{r.humidity_pct}%</Td>
                <Td>
                  <BtnSm
                    onClick={async () => {
                      await api.envReadings.remove(r.id)
                      await load()
                    }}
                  >
                    ✕
                  </BtnSm>
                </Td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <SectionLabel>Enclosure maintenance — {animal.name}</SectionLabel>
      <LogForm title="Maintenance">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} />
          </Field>
          <Field label="Kind">
            <Select value={mKind} onChange={(e) => setMKind(e.target.value)}>
              <option value="water">Water change</option>
              <option value="substrate">
                {pack.key === 'crested_gecko' ? 'Mist / humidity cycle' : 'Sub tray'}
              </option>
              <option value="deep_clean">Deep clean</option>
            </Select>
          </Field>
          <Field label="Notes">
            <Input value={mNotes} onChange={(e) => setMNotes(e.target.value)} />
          </Field>
        </div>
        <Btn
          onClick={async () => {
            await api.maintenance.create({ date: mDate, kind: mKind, notes: mNotes })
            setMNotes('')
            await load()
          }}
        >
          Log Maintenance
        </Btn>
      </LogForm>
      {maint.length === 0 ? (
        <Empty>No maintenance logged.</Empty>
      ) : (
        <ul>
          {maint.map((m) => (
            <ListRow
              key={m.id}
              primary={
                <>
                  <span className="font-mono text-[11px] text-sand">{m.date}</span>
                  {' · '}
                  {m.kind === 'substrate'
                    ? 'Sub / mist'
                    : m.kind === 'deep_clean'
                      ? 'Deep clean'
                      : m.kind}
                </>
              }
              secondary={m.notes || undefined}
              onRemove={async () => {
                await api.maintenance.remove(m.id)
                await load()
              }}
            />
          ))}
        </ul>
      )}

      <SectionLabel>Humidity & lighting targets</SectionLabel>
      <FactList
        rows={[
          ['Target humidity', `${env.rh_normal[0]}–${env.rh_normal[1]}%`],
          ['During shed', `${env.rh_shed[0]}–${env.rh_shed[1]}%`],
          [
            'Heat note',
            pack.has_basking
              ? 'UTH + thermostat required — never free-run heat'
              : 'No basking bulb — stay under ~80°F ambient',
          ],
          ...(pack.habitat_notes || []),
        ]}
      />
    </div>
  )
}
