import { useEffect, useState } from 'react'
import {
  api,
  todayStr,
  type AnimalOverview,
  type Contact,
  type Elimination,
  type ShedCycle,
  type TailEvent,
  type Treatment,
  type VetVisit,
} from '../api/client'
import { Btn, Field, Input, ListRow, LogForm, SectionLabel, Select } from './ui'

export function HealthTab({
  animal,
  onChange,
}: {
  animal: AnimalOverview
  onChange: () => void
}) {
  const pack = animal.species_pack
  const [sheds, setSheds] = useState<ShedCycle[]>([])
  const [elims, setElims] = useState<Elimination[]>([])
  const [vets, setVets] = useState<VetVisit[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tails, setTails] = useState<TailEvent[]>([])

  const [shedStatus, setShedStatus] = useState('blue')
  const [shedStart, setShedStart] = useState(todayStr())
  const [shedQuality, setShedQuality] = useState('Complete (one piece)')
  const [shedEyes, setShedEyes] = useState(pack.supports_tail ? 'Toes clear' : 'Yes')
  const [tailDate, setTailDate] = useState(todayStr())
  const [tailCause, setTailCause] = useState('Handling stress')
  const [tailNotes, setTailNotes] = useState('')

  const [eDate, setEDate] = useState(todayStr())
  const [eKind, setEKind] = useState('both')
  const [eNotes, setENotes] = useState('')

  const [vDate, setVDate] = useState(todayStr())
  const [vReason, setVReason] = useState('')
  const [vNotes, setVNotes] = useState('')

  const [tStart, setTStart] = useState(todayStr())
  const [tName, setTName] = useState('')
  const [tReason, setTReason] = useState('')

  const [cLabel, setCLabel] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cClinic, setCClinic] = useState('')
  const [cEmergency, setCEmergency] = useState(false)

  async function load() {
    const [s, e, v, t, c] = await Promise.all([
      api.shedCycles.list(),
      api.eliminations.list(),
      api.vetVisits.list(),
      api.treatments.list(),
      api.contacts.list(),
    ])
    setSheds(s)
    setElims(e)
    setVets(v)
    setTreatments(t)
    setContacts(c)
    if (pack.supports_tail) setTails(await api.tailEvents.list())
    else setTails([])
  }

  useEffect(() => {
    void load()
  }, [animal.id])

  return (
    <div>
      {pack.supports_tail && (
        <>
          <SectionLabel>Tail drop tracker</SectionLabel>
          <LogForm title="Log Tail Drop">
            <div className="mb-2 flex flex-wrap gap-2.5">
              <Field label="Date">
                <Input type="date" value={tailDate} onChange={(e) => setTailDate(e.target.value)} />
              </Field>
              <Field label="Cause">
                <Select value={tailCause} onChange={(e) => setTailCause(e.target.value)}>
                  <option>Handling stress</option>
                  <option>Caught on décor</option>
                  <option>Unknown</option>
                  <option>Other</option>
                </Select>
              </Field>
              <Field label="Notes">
                <Input value={tailNotes} onChange={(e) => setTailNotes(e.target.value)} />
              </Field>
            </div>
            <Btn
              onClick={async () => {
                await api.tailEvents.create({ date: tailDate, cause: tailCause, notes: tailNotes })
                setTailNotes('')
                await load()
                onChange()
              }}
            >
              Log Drop
            </Btn>
          </LogForm>
          {tails.length === 0 ? (
            <p className="mb-1 text-[12px] text-muted">No drops logged — tail intact.</p>
          ) : (
            <ul className="mb-1">
              {tails.map((row) => (
                <ListRow
                  key={row.id}
                  primary={
                    <>
                      <span className="font-mono text-[11px] text-sand">{row.date}</span>
                      {` · ${row.cause}`}
                    </>
                  }
                  secondary={row.notes || undefined}
                  onRemove={async () => {
                    await api.tailEvents.remove(row.id)
                    await load()
                    onChange()
                  }}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <SectionLabel>Shed cycle</SectionLabel>
      <LogForm title="Update Shed Status">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Status">
            <Select value={shedStatus} onChange={(e) => setShedStatus(e.target.value)}>
              <option value="clear">Clear</option>
              <option value="blue">Blue eyes</option>
              <option value="opaque">Opaque</option>
              <option value="shed">Shed complete</option>
            </Select>
          </Field>
          <Field label="Started">
            <Input type="date" value={shedStart} onChange={(e) => setShedStart(e.target.value)} />
          </Field>
          <Field label="Quality (if shed)">
            <Select value={shedQuality} onChange={(e) => setShedQuality(e.target.value)}>
              <option>Complete (one piece)</option>
              <option>Partial (some retained)</option>
              <option>Poor (multiple pieces)</option>
            </Select>
          </Field>
          <Field label={pack.supports_tail ? 'Toes / digits clear?' : 'Eyes clear pre-shed?'}>
            <Select value={shedEyes} onChange={(e) => setShedEyes(e.target.value)}>
              {pack.supports_tail ? (
                <>
                  <option>Toes clear</option>
                  <option>Stuck shed on toes</option>
                </>
              ) : (
                <>
                  <option>Yes</option>
                  <option>No — retained eye caps</option>
                </>
              )}
            </Select>
          </Field>
        </div>
        <Btn
          onClick={async () => {
            await api.shedCycles.create({
              status: shedStatus,
              started_at: shedStart,
              completed_at: shedStatus === 'shed' ? shedStart : null,
              quality: shedStatus === 'shed' ? shedQuality : null,
              eyes: shedEyes,
            })
            await load()
            onChange()
          }}
        >
          Log Shed Status
        </Btn>
      </LogForm>
      <ul className="mb-1">
        {sheds.map((s) => (
          <ListRow
            key={s.id}
            primary={
              <>
                <span className="font-mono text-[11px] text-sand">{s.started_at}</span>
                {' · '}
                <span className="text-sand">{s.status}</span>
              </>
            }
            secondary={`${s.quality || '—'} · ${pack.supports_tail ? 'Toes' : 'Eyes'}: ${s.eyes || '—'}`}
            onRemove={async () => {
              await api.shedCycles.remove(s.id)
              await load()
              onChange()
            }}
          />
        ))}
      </ul>

      <SectionLabel>Poop / urates</SectionLabel>
      <LogForm title="Elimination Log">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
          </Field>
          <Field label="Kind">
            <Select value={eKind} onChange={(e) => setEKind(e.target.value)}>
              <option value="feces">Feces</option>
              <option value="urates">Urates</option>
              <option value="both">Both</option>
            </Select>
          </Field>
          <Field label="Notes">
            <Input value={eNotes} onChange={(e) => setENotes(e.target.value)} />
          </Field>
        </div>
        <Btn
          onClick={async () => {
            await api.eliminations.create({ date: eDate, kind: eKind, notes: eNotes })
            setENotes('')
            await load()
          }}
        >
          Log
        </Btn>
      </LogForm>
      {elims.length === 0 ? (
        <p className="mb-1 py-4 text-center text-[13px] text-muted">No eliminations logged.</p>
      ) : (
        <ul className="mb-1">
          {elims.map((e) => (
            <ListRow
              key={e.id}
              primary={`${e.date} · ${e.kind}`}
              secondary={e.notes || undefined}
              onRemove={async () => {
                await api.eliminations.remove(e.id)
                await load()
              }}
            />
          ))}
        </ul>
      )}

      <SectionLabel>Treatments / meds</SectionLabel>
      <LogForm title="Log Treatment">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Started">
            <Input type="date" value={tStart} onChange={(e) => setTStart(e.target.value)} />
          </Field>
          <Field label="Name">
            <Input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="e.g. mite treatment" />
          </Field>
          <Field label="Reason">
            <Input value={tReason} onChange={(e) => setTReason(e.target.value)} />
          </Field>
        </div>
        <Btn
          onClick={async () => {
            if (!tName) return
            await api.treatments.create({ started_at: tStart, name: tName, reason: tReason })
            setTName('')
            setTReason('')
            await load()
          }}
        >
          Save Treatment
        </Btn>
      </LogForm>
      <ul className="mb-1">
        {treatments.map((t) => (
          <ListRow
            key={t.id}
            primary={`${t.started_at} · ${t.name}`}
            secondary={t.reason || undefined}
            onRemove={async () => {
              await api.treatments.remove(t.id)
              await load()
            }}
          />
        ))}
      </ul>

      <SectionLabel>Vet visits</SectionLabel>
      <LogForm title="Log Vet Visit">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)} />
          </Field>
          <Field label="Reason">
            <Input value={vReason} onChange={(e) => setVReason(e.target.value)} placeholder="Annual check..." />
          </Field>
          <Field label="Notes">
            <Input value={vNotes} onChange={(e) => setVNotes(e.target.value)} />
          </Field>
        </div>
        <Btn
          onClick={async () => {
            if (!vReason) return
            await api.vetVisits.create({ date: vDate, reason: vReason, notes: vNotes })
            setVReason('')
            setVNotes('')
            await load()
          }}
        >
          Save
        </Btn>
      </LogForm>
      {vets.length === 0 ? (
        <p className="mb-1 py-4 text-center text-[13px] text-muted">No vet visits logged.</p>
      ) : (
        <ul className="mb-1">
          {vets.map((v) => (
            <ListRow
              key={v.id}
              primary={
                <>
                  <span className="font-mono text-[11px] text-sand">{v.date}</span>
                  {` · ${v.reason}`}
                </>
              }
              secondary={v.notes || undefined}
              onRemove={async () => {
                await api.vetVisits.remove(v.id)
                await load()
              }}
            />
          ))}
        </ul>
      )}

      <SectionLabel>Vet / emergency contacts</SectionLabel>
      <LogForm title="Add Contact">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Label">
            <Input value={cLabel} onChange={(e) => setCLabel(e.target.value)} placeholder="Exotic vet" />
          </Field>
          <Field label="Phone">
            <Input value={cPhone} onChange={(e) => setCPhone(e.target.value)} />
          </Field>
          <Field label="Clinic">
            <Input value={cClinic} onChange={(e) => setCClinic(e.target.value)} />
          </Field>
          <Field label="Emergency?">
            <Select
              value={cEmergency ? 'yes' : 'no'}
              onChange={(e) => setCEmergency(e.target.value === 'yes')}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          </Field>
        </div>
        <Btn
          onClick={async () => {
            if (!cLabel) return
            await api.contacts.create({
              label: cLabel,
              phone: cPhone,
              clinic: cClinic,
              is_emergency: cEmergency,
            })
            setCLabel('')
            setCPhone('')
            setCClinic('')
            await load()
          }}
        >
          Add Contact
        </Btn>
      </LogForm>
      <ul className="mb-1">
        {contacts.map((c) => (
          <ListRow
            key={c.id}
            primary={
              <>
                {c.label}
                {c.is_emergency ? <span className="text-danger"> · Emergency</span> : null}
              </>
            }
            secondary={[c.phone, c.clinic].filter(Boolean).join(' · ') || undefined}
            onRemove={async () => {
              await api.contacts.remove(c.id)
              await load()
            }}
          />
        ))}
      </ul>

      <SectionLabel>Health indicators</SectionLabel>
      <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {pack.health_indicators.map(([dot, textLabel, label]) => (
          <div key={textLabel} className="flex items-start gap-2.5 py-1">
            <div
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                dot === 'good' ? 'bg-sage' : dot === 'warn' ? 'bg-warn' : 'bg-danger'
              }`}
            />
            <div>
              <div className="text-[13px] text-bone-dark">{textLabel}</div>
              <div className="text-[11px] text-muted">{label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
