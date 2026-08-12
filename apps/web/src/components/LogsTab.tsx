import { useEffect, useMemo, useState } from 'react'
import { api, todayStr, type AnimalOverview } from '../api/client'
import { Btn, Field, Input, LogForm, Select } from './ui'

export function LogsTab({ animal, onChange }: { animal: AnimalOverview; onChange: () => void }) {
  const pack = animal.species_pack
  const isPrey = pack.food_noun === 'prey'
  const preyList = animal.prey_categories
  const defaultPrey =
    animal.feeding_recommendation.suggested_prey ??
    animal.feeding_recommendation.recommended_prey[0] ??
    preyList[0] ??
    (isPrey ? 'Adult mouse' : 'CGD')
  const env = pack.env
  const blocked = !animal.clear_to_handle.ready

  const [busy, setBusy] = useState('')
  const [feedDate, setFeedDate] = useState(todayStr())
  const [prey, setPrey] = useState(defaultPrey)
  const [accepted, setAccepted] = useState(true)
  const [wDate, setWDate] = useState(todayStr())
  const [wVal, setWVal] = useState('')
  const [hDate, setHDate] = useState(todayStr())
  const [hDur, setHDur] = useState('15')
  const [hTemp, setHTemp] = useState('calm')
  const [eKind, setEKind] = useState('both')
  const [shedStatus, setShedStatus] = useState('clear')
  const [shedStart, setShedStart] = useState(todayStr())
  const [shedQuality, setShedQuality] = useState('Complete (one piece)')
  const [shedEyes, setShedEyes] = useState(pack.supports_tail ? 'Toes clear' : 'Yes')
  const [mKind, setMKind] = useState('water')
  const [hot, setHot] = useState(String(Math.round((env.hot[0] + env.hot[1]) / 2)))
  const [cool, setCool] = useState(String(Math.round((env.cool[0] + env.cool[1]) / 2)))
  const [night, setNight] = useState(String(Math.round((env.night[0] + env.night[1]) / 2)))
  const [rh, setRh] = useState(String(Math.round((env.rh_normal[0] + env.rh_normal[1]) / 2)))
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [useAsHero, setUseAsHero] = useState(false)
  const [rSev, setRSev] = useState('moderate')
  const [tailCause, setTailCause] = useState('Handling stress')

  useEffect(() => {
    setPrey(
      animal.feeding_recommendation.suggested_prey ??
        animal.feeding_recommendation.recommended_prey[0] ??
        animal.prey_categories[0] ??
        (pack.food_noun === 'prey' ? 'Adult mouse' : 'CGD'),
    )
    setShedEyes(pack.supports_tail ? 'Toes clear' : 'Yes')
    void api.envReadings.list().then((rows) => {
      const last = rows[0]
      if (!last) {
        setHot(String(Math.round((env.hot[0] + env.hot[1]) / 2)))
        setCool(String(Math.round((env.cool[0] + env.cool[1]) / 2)))
        setNight(String(Math.round((env.night[0] + env.night[1]) / 2)))
        setRh(String(Math.round((env.rh_normal[0] + env.rh_normal[1]) / 2)))
        return
      }
      setHot(String(last.temp_hot_f))
      setCool(String(last.temp_cool_f))
      setNight(last.temp_night_f != null ? String(last.temp_night_f) : '')
      setRh(String(last.humidity_pct))
    })
  }, [animal.id, animal.feeding_recommendation, animal.prey_categories, env, pack.food_noun, pack.supports_tail])

  const preyOptions = useMemo(() => preyList, [preyList])

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key)
    try {
      await fn()
      onChange()
    } finally {
      setBusy('')
    }
  }

  return (
    <div>
      <LogForm title={isPrey ? 'Feed' : 'Meal'}>
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={feedDate} onChange={(e) => setFeedDate(e.target.value)} />
          </Field>
          <Field label={isPrey ? 'Prey' : 'Food'}>
            <Select value={prey} onChange={(e) => setPrey(e.target.value)}>
              {preyOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Accepted?">
            <Select value={accepted ? 'yes' : 'no'} onChange={(e) => setAccepted(e.target.value === 'yes')}>
              <option value="yes">Yes</option>
              <option value="no">Refused</option>
            </Select>
          </Field>
        </div>
        <Btn
          disabled={!!busy}
          onClick={() =>
            void run('feed', async () => {
              await api.feeds.create({ date: feedDate, prey_type: prey, accepted })
            })
          }
        >
          Log {isPrey ? 'Feed' : 'Meal'}
        </Btn>
      </LogForm>

      <LogForm title="Weight">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={wDate} onChange={(e) => setWDate(e.target.value)} />
          </Field>
          <Field label="g">
            <Input type="number" value={wVal} onChange={(e) => setWVal(e.target.value)} placeholder="g" />
          </Field>
        </div>
        <Btn
          disabled={!!busy || !wVal}
          onClick={() =>
            void run('weight', async () => {
              await api.weights.create({ date: wDate, weight_g: Number(wVal) })
              setWVal('')
            })
          }
        >
          Log Weight
        </Btn>
      </LogForm>

      <LogForm title="Handling">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} />
          </Field>
          <Field label="Min">
            <Input type="number" value={hDur} onChange={(e) => setHDur(e.target.value)} />
          </Field>
          <Field label="Temperament">
            <Select value={hTemp} onChange={(e) => setHTemp(e.target.value)}>
              <option value="calm">Calm</option>
              <option value="nippy">{pack.key === 'crested_gecko' ? 'Jumpy / defensive' : 'Nippy'}</option>
              <option value="musk">{pack.key === 'crested_gecko' ? 'Stressed' : 'Musk'}</option>
            </Select>
          </Field>
        </div>
        <Btn
          disabled={!!busy || blocked}
          onClick={() =>
            void run('handle', async () => {
              await api.handlings.create({
                date: hDate,
                duration_min: Number(hDur) || 15,
                temperament: hTemp,
              })
            })
          }
        >
          {blocked ? 'Locked until timer clears' : 'Log Handling'}
        </Btn>
      </LogForm>

      <LogForm title="Elimination">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Kind">
            <Select value={eKind} onChange={(e) => setEKind(e.target.value)}>
              <option value="feces">Feces</option>
              <option value="urates">Urates</option>
              <option value="both">Both</option>
            </Select>
          </Field>
        </div>
        <Btn
          disabled={!!busy}
          onClick={() =>
            void run('elim', async () => {
              await api.eliminations.create({ date: todayStr(), kind: eKind })
            })
          }
        >
          Log Elimination
        </Btn>
      </LogForm>

      <LogForm title="Shed">
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
          {shedStatus === 'shed' && (
            <>
              <Field label="Quality">
                <Select value={shedQuality} onChange={(e) => setShedQuality(e.target.value)}>
                  <option>Complete (one piece)</option>
                  <option>Partial (some retained)</option>
                  <option>Poor (multiple pieces)</option>
                </Select>
              </Field>
              <Field label={pack.supports_tail ? 'Toes' : 'Eyes'}>
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
            </>
          )}
        </div>
        <Btn
          disabled={!!busy}
          onClick={() =>
            void run('shed', async () => {
              await api.shedCycles.create({
                status: shedStatus,
                started_at: shedStart,
                completed_at: shedStatus === 'shed' ? shedStart : null,
                quality: shedStatus === 'shed' ? shedQuality : null,
                eyes: shedStatus === 'shed' ? shedEyes : null,
              })
            })
          }
        >
          Log Shed
        </Btn>
      </LogForm>

      <LogForm title="Maintenance">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Kind">
            <Select value={mKind} onChange={(e) => setMKind(e.target.value)}>
              <option value="water">Water</option>
              <option value="substrate">{pack.key === 'crested_gecko' ? 'Mist / humidity' : 'Sub tray'}</option>
              <option value="deep_clean">Deep clean</option>
            </Select>
          </Field>
        </div>
        <Btn
          disabled={!!busy}
          onClick={() =>
            void run('maint', async () => {
              await api.maintenance.create({ date: todayStr(), kind: mKind })
            })
          }
        >
          Log Maintenance
        </Btn>
      </LogForm>

      <LogForm title="Temp">
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
          <Field label="RH %">
            <Input type="number" value={rh} onChange={(e) => setRh(e.target.value)} />
          </Field>
        </div>
        <Btn
          disabled={!!busy || !hot || !cool || !rh}
          onClick={() =>
            void run('env', async () => {
              await api.envReadings.create({
                recorded_at: new Date().toISOString(),
                temp_hot_f: Number(hot),
                temp_cool_f: Number(cool),
                temp_night_f: night ? Number(night) : null,
                humidity_pct: Number(rh),
              })
            })
          }
        >
          Log Reading
        </Btn>
      </LogForm>

      <LogForm title="Photo">
        <div className="mb-2 flex flex-wrap items-end gap-2.5">
          <Field label="File">
            <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} />
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" checked={useAsHero} onChange={(e) => setUseAsHero(e.target.checked)} />
            Use as profile
          </label>
        </div>
        <Btn
          disabled={!!busy || !photoFile}
          onClick={() =>
            void run('photo', async () => {
              if (!photoFile) return
              const form = new FormData()
              form.append('file', photoFile)
              form.append('taken_at', todayStr())
              form.append('kind', 'growth')
              form.append('caption', '')
              const photo = await api.photos.upload(form)
              if (useAsHero) await api.setHero(photo.id)
              setPhotoFile(null)
              setUseAsHero(false)
            })
          }
        >
          Upload
        </Btn>
      </LogForm>

      {pack.supports_regurg && (
        <LogForm title="Regurg">
          <div className="mb-2 flex flex-wrap gap-2.5">
            <Field label="Severity">
              <Select value={rSev} onChange={(e) => setRSev(e.target.value)}>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </Select>
            </Field>
          </div>
          <Btn
            disabled={!!busy}
            onClick={() =>
              void run('regurg', async () => {
                await api.regurgitations.create({ date: todayStr(), severity: rSev })
              })
            }
          >
            Log Regurg
          </Btn>
        </LogForm>
      )}

      {pack.supports_tail && (
        <LogForm title="Tail drop">
          <div className="mb-2 flex flex-wrap gap-2.5">
            <Field label="Cause">
              <Select value={tailCause} onChange={(e) => setTailCause(e.target.value)}>
                <option>Handling stress</option>
                <option>Caught on décor</option>
                <option>Unknown</option>
                <option>Other</option>
              </Select>
            </Field>
          </div>
          <Btn
            disabled={!!busy}
            onClick={() =>
              void run('tail', async () => {
                await api.tailEvents.create({ date: todayStr(), cause: tailCause })
              })
            }
          >
            Log Drop
          </Btn>
        </LogForm>
      )}
    </div>
  )
}
