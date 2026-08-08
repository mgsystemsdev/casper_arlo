import { useEffect, useState } from 'react'
import { api, todayStr, type AnimalOverview, type EnvReading, type Maint } from '../api/client'
import { Btn, BtnSm, Card, Empty, Field, Input, LogForm, SectionLabel, Select } from './ui'

const ZONE_STYLES = [
  'bg-[#5a2010] border-[#8a4020] text-[#F4A070]',
  'bg-[#3a2a10] border-[#6a4a20] text-[#E8C080]',
  'bg-[#1a2a3a] border-[#2a4a6a] text-[#90C0E8]',
  'bg-[#1a1a2a] border-[#2a2a5a] text-[#AAAADD]',
]

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
      <div className="mt-2 flex flex-wrap gap-2">
        {pack.habitat_zones.map((z, i) => (
          <div
            key={z.label}
            className={`min-w-[120px] flex-1 rounded-lg border p-3 text-center ${ZONE_STYLES[i % ZONE_STYLES.length]}`}
          >
            <div className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] opacity-80">
              {z.label}
            </div>
            <div className="font-display text-lg font-semibold">{z.f}</div>
            <div className="mt-0.5 text-[10px] text-muted">{z.c}</div>
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
        <table className="mb-4 w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase text-muted">
              <th className="px-2 py-1.5">When</th>
              <th className="px-2 py-1.5">Hot</th>
              <th className="px-2 py-1.5">Cool</th>
              <th className="px-2 py-1.5">Night</th>
              <th className="px-2 py-1.5">RH%</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {readings.map((r) => (
              <tr key={r.id} className="border-b border-border text-bone-dark">
                <td className="px-2 py-2 font-mono text-[11px]">
                  {r.recorded_at.slice(0, 16).replace('T', ' ')}
                </td>
                <td className="px-2 py-2">{r.temp_hot_f}°</td>
                <td className="px-2 py-2">{r.temp_cool_f}°</td>
                <td className="px-2 py-2">{r.temp_night_f ?? '—'}°</td>
                <td className="px-2 py-2">{r.humidity_pct}%</td>
                <td className="px-2 py-2">
                  <BtnSm
                    onClick={async () => {
                      await api.envReadings.remove(r.id)
                      await load()
                    }}
                  >
                    ✕
                  </BtnSm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <ul className="space-y-2">
          {maint.map((m) => (
            <li
              key={m.id}
              className="flex justify-between rounded-lg border border-border-hi bg-bark px-3 py-2 text-[13px]"
            >
              <span>
                <span className="font-mono text-sand">{m.date}</span> ·{' '}
                {m.kind === 'substrate' ? 'Sub / mist' : m.kind === 'deep_clean' ? 'Deep clean' : m.kind}
                {m.notes ? ` — ${m.notes}` : ''}
              </span>
              <BtnSm
                onClick={async () => {
                  await api.maintenance.remove(m.id)
                  await load()
                }}
              >
                ✕
              </BtnSm>
            </li>
          ))}
        </ul>
      )}

      <SectionLabel>Humidity targets</SectionLabel>
      <Card>
        {[
          ['Normal', `${env.rh_normal[0]}–${env.rh_normal[1]}%`],
          ['During shed', `${env.rh_shed[0]}–${env.rh_shed[1]}%`],
          [
            'Heat note',
            pack.has_basking
              ? 'UTH + thermostat required — never free-run heat'
              : 'No basking bulb — stay under ~80°F ambient',
          ],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-border py-2 text-[13px] last:border-0">
            <span className="text-muted">{k}</span>
            <span className="max-w-[60%] text-right font-mono text-sand">{v}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
