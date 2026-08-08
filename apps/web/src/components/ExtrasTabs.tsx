import { useEffect, useState } from 'react'
import {
  api,
  getActiveAnimalId,
  getToken,
  mediaUrl,
  todayStr,
  type AnimalOverview,
  type AppSettings,
  type Journal,
  type Photo,
} from '../api/client'
import { Btn, BtnSm, Empty, Field, Input, LogForm, SectionLabel, Select, TextArea } from './ui'

async function downloadExport(url: string, filename: string) {
  const token = getToken()
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (!res.ok) throw new Error(`Export failed (${res.status})`)
  const blob = await res.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export function JournalTab({ animal }: { animal: AnimalOverview }) {
  const [rows, setRows] = useState<Journal[]>([])
  const [date, setDate] = useState(todayStr())
  const [body, setBody] = useState('')

  async function load() {
    setRows(await api.journal.list())
  }

  useEffect(() => {
    void load()
  }, [animal.id])

  return (
    <div>
      <SectionLabel>Journal — {animal.name}</SectionLabel>
      <LogForm title="New entry">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <TextArea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Odd behavior, escape attempts, appetite notes..."
          className="mb-2"
        />
        <Btn
          onClick={async () => {
            if (!body.trim()) return
            await api.journal.create({ date, body })
            setBody('')
            await load()
          }}
        >
          Save Entry
        </Btn>
      </LogForm>
      {rows.length === 0 ? (
        <Empty>No journal entries yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-[10px] border border-border bg-charcoal p-3.5">
              <div className="mb-1 flex justify-between">
                <span className="font-mono text-[11px] text-sand">{r.date}</span>
                <BtnSm
                  onClick={async () => {
                    await api.journal.remove(r.id)
                    await load()
                  }}
                >
                  ✕
                </BtnSm>
              </div>
              <p className="whitespace-pre-wrap text-[13px] text-bone-dark">{r.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PhotosTab({ animal }: { animal: AnimalOverview }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [takenAt, setTakenAt] = useState(todayStr())
  const [kind, setKind] = useState('growth')
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)

  async function load() {
    setPhotos(await api.photos.list())
  }

  useEffect(() => {
    void load()
  }, [animal.id])

  return (
    <div>
      <SectionLabel>Upload photo — {animal.name}</SectionLabel>
      <LogForm title="Photo">
        <div className="mb-2 flex flex-wrap gap-2.5">
          <Field label="Date">
            <Input type="date" value={takenAt} onChange={(e) => setTakenAt(e.target.value)} />
          </Field>
          <Field label="Kind">
            <Select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="growth">Growth</option>
              <option value="shed">Shed</option>
              <option value="body_condition">Body condition</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Caption">
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
          <Field label="File">
            <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>
        </div>
        <Btn
          onClick={async () => {
            if (!file) return
            const form = new FormData()
            form.append('file', file)
            form.append('taken_at', takenAt)
            form.append('kind', kind)
            form.append('caption', caption)
            await api.photos.upload(form)
            setCaption('')
            setFile(null)
            await load()
          }}
        >
          Upload
        </Btn>
      </LogForm>
      {photos.length === 0 ? (
        <Empty>No photos yet.</Empty>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-[10px] border border-border-hi bg-bark">
              <img src={mediaUrl(p.url)} alt={p.caption || p.kind} className="aspect-square w-full object-cover" />
              <div className="flex items-start justify-between p-2">
                <div>
                  <div className="font-mono text-[10px] text-sand">
                    {p.taken_at} · {p.kind}
                  </div>
                  <div className="text-[12px] text-bone-dark">{p.caption || '—'}</div>
                </div>
                <BtnSm
                  onClick={async () => {
                    await api.photos.remove(p.id)
                    await load()
                  }}
                >
                  ✕
                </BtnSm>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-border py-2 text-[13px] last:border-0">
      <span className="text-bone-dark">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

export function SettingsTab({
  animal,
  onLogout,
}: {
  animal?: AnimalOverview
  onLogout: () => void
}) {
  const [s, setS] = useState<AppSettings | null>(null)
  const [saveMsg, setSaveMsg] = useState('')
  const [testMsg, setTestMsg] = useState('')
  const [pdfMsg, setPdfMsg] = useState('')
  const [exportMsg, setExportMsg] = useState('')

  const isCrestie = animal?.species_pack?.key === 'crested_gecko'
  const animalId = animal?.id

  useEffect(() => {
    setS(null)
    setSaveMsg('')
    void api.settings.get().then(setS).catch((e) => setSaveMsg(String(e)))
  }, [animalId])

  function patch<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setS((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  async function downloadPdfToday() {
    setPdfMsg('')
    try {
      const dig = await api.settings.digestToday()
      const title = dig.subject.replace(/</g, '&lt;').replace(/"/g, '&quot;')
      const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  @page { margin: 16mm; }
  body { margin: 0; background: #1a0e08; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head><body>
${dig.html}
<script>window.onload=function(){window.print()}</script>
</body></html>`
      const w = window.open('', '_blank')
      if (!w) {
        setPdfMsg('Popup blocked — allow popups, then try again')
        return
      }
      w.document.write(doc)
      w.document.close()
      setPdfMsg(`Opened print dialog for ${dig.date} — choose Save as PDF`)
    } catch (e) {
      setPdfMsg(String(e))
    }
  }

  if (!s) {
    return <div className="text-muted">{saveMsg || 'Loading settings…'}</div>
  }

  const petName = animal?.name || 'active pet'
  const exportBase = petName.toLowerCase().replace(/\s+/g, '-')
  const feedNoun = isCrestie ? 'meal / CGD' : 'feed'
  const prepLabel = isCrestie ? 'CGD refresh window (days)' : 'Feed prep window (days)'
  const handleLabel = isCrestie ? 'Post-meal handle wait (hours)' : 'Clear-to-handle hours'
  const substrateLabel = isCrestie ? 'Mist / humidity every N days' : 'Sub tray every N days'
  const feedModeHelp = isCrestie ? 'Auto (CGD history + stage band)' : 'Auto (history + stage band)'
  const exportExtras = isCrestie ? ', tail events' : ''

  return (
    <div>
      <SectionLabel>Export / backup — {petName}</SectionLabel>
      <LogForm title="Download care data for the active pet">
        <p className="mb-2 text-[12px] text-muted">
          JSON and CSV zip for {petName} (feeds, weights, handling, habitat, journal, photos metadata
          {exportExtras}, etc.). Switch pets first if you want the other animal’s export.
        </p>
        <div className="flex flex-wrap gap-2">
          <Btn
            onClick={async () => {
              setExportMsg('')
              try {
                await downloadExport(api.exportJsonUrl(), `${exportBase}-export.json`)
                setExportMsg('JSON downloaded')
              } catch (e) {
                setExportMsg(String(e))
              }
            }}
          >
            Download JSON
          </Btn>
          <Btn
            onClick={async () => {
              setExportMsg('')
              try {
                await downloadExport(api.exportCsvUrl(), `${exportBase}-export.zip`)
                setExportMsg('CSV zip downloaded')
              } catch (e) {
                setExportMsg(String(e))
              }
            }}
          >
            Download CSV zip
          </Btn>
        </div>
        {exportMsg && <p className="mt-2 font-mono text-[11px] text-sand">{exportMsg}</p>}
      </LogForm>

      <SectionLabel>Today’s digest</SectionLabel>
      <LogForm title="Same content as the care email">
        <p className="mb-2 text-[12px] text-muted">
          Preview covers both pets (household layout). In per-pet mode, Resend sends one email per animal at the
          same times. Care blocks below are saved for <strong>{petName}</strong> only.
        </p>
        <Btn onClick={() => void downloadPdfToday()}>Download PDF today</Btn>
        {pdfMsg && <p className="mt-2 font-mono text-[11px] text-sand">{pdfMsg}</p>}
      </LogForm>

      <SectionLabel>Email delivery</SectionLabel>
      <LogForm title="Resend destination (household)">
        <Toggle label="Enable email notifications" checked={s.email_enabled} onChange={(v) => patch('email_enabled', v)} />
        <div className="mt-2 flex flex-wrap gap-2.5">
          <Field label="Destination email">
            <Input value={s.reminder_email} onChange={(e) => patch('reminder_email', e.target.value)} />
          </Field>
          <Field label="Timezone">
            <Select value={s.timezone} onChange={(e) => patch('timezone', e.target.value)}>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="America/Denver">America/Denver</option>
              <option value="UTC">UTC</option>
            </Select>
          </Field>
        </div>
        <p className="mt-2 text-[11px] text-muted">API key stays in server env (RESEND_API_KEY) — not editable here.</p>
      </LogForm>

      <SectionLabel>Digest schedule</SectionLabel>
      <LogForm title="Twice-daily mini dashboard">
        <Toggle label="Enable digests" checked={s.digest_enabled} onChange={(v) => patch('digest_enabled', v)} />
        <Toggle
          label="Send second digest"
          checked={s.digest_second_enabled}
          onChange={(v) => patch('digest_second_enabled', v)}
        />
        <div className="mt-2 flex flex-wrap gap-2.5">
          <Field label="Digest mode">
            <Select
              value={s.digest_mode || 'household'}
              onChange={(e) => patch('digest_mode', e.target.value as AppSettings['digest_mode'])}
            >
              <option value="household">Household — one email (Casper & Arlo)</option>
              <option value="per_pet">Per pet — separate email each</option>
            </Select>
          </Field>
          <Field label="Digest 1 time">
            <Input type="time" value={s.digest_time_1} onChange={(e) => patch('digest_time_1', e.target.value)} />
          </Field>
          <Field label="Digest 2 time">
            <Input type="time" value={s.digest_time_2} onChange={(e) => patch('digest_time_2', e.target.value)} />
          </Field>
        </div>
        <p className="mt-3 text-[11px] text-muted">Show blocks for {petName} digests:</p>
        <div className="mt-1 space-y-1">
          <Toggle
            label={isCrestie ? 'Show post-meal / clear-to-handle block' : 'Show clear-to-handle block'}
            checked={s.digest_show_handle}
            onChange={(v) => patch('digest_show_handle', v)}
          />
          <Toggle
            label={isCrestie ? 'Show meal / CGD countdown' : 'Show feed countdown'}
            checked={s.digest_show_feed}
            onChange={(v) => patch('digest_show_feed', v)}
          />
          <Toggle label="Show maintenance" checked={s.digest_show_maint} onChange={(v) => patch('digest_show_maint', v)} />
          <Toggle label="Show shed" checked={s.digest_show_shed} onChange={(v) => patch('digest_show_shed', v)} />
          {isCrestie && (
            <Toggle
              label="Show tail status"
              checked={s.digest_show_tail ?? true}
              onChange={(v) => patch('digest_show_tail', v)}
            />
          )}
          <Toggle
            label="Show recent activity"
            checked={s.digest_show_activity}
            onChange={(v) => patch('digest_show_activity', v)}
          />
        </div>
      </LogForm>

      <SectionLabel>Care intervals — {petName}</SectionLabel>
      <LogForm title={isCrestie ? 'Crested gecko KPIs + email countdowns' : 'Ball python KPIs + email countdowns'}>
        <div className="flex flex-wrap gap-2.5">
          <Field label={prepLabel}>
            <Input
              type="number"
              value={s.feed_ready_days}
              onChange={(e) => patch('feed_ready_days', Number(e.target.value))}
            />
          </Field>
          <Field label={handleLabel}>
            <Input
              type="number"
              value={s.handle_clear_hours}
              onChange={(e) => patch('handle_clear_hours', Number(e.target.value))}
            />
          </Field>
          <Field label="Max days between handlings">
            <Input
              type="number"
              value={s.handling_max_gap_days}
              onChange={(e) => patch('handling_max_gap_days', Number(e.target.value))}
            />
          </Field>
          <Field label="Water every N days">
            <Input
              type="number"
              value={s.maint_water_days}
              onChange={(e) => patch('maint_water_days', Number(e.target.value))}
            />
          </Field>
          <Field label={substrateLabel}>
            <Input
              type="number"
              value={s.maint_substrate_days}
              onChange={(e) => patch('maint_substrate_days', Number(e.target.value))}
            />
          </Field>
          <Field label="Deep clean every N days">
            <Input
              type="number"
              value={s.maint_deep_clean_days}
              onChange={(e) => patch('maint_deep_clean_days', Number(e.target.value))}
            />
          </Field>
          <Field label="Weight log every">
            <Select
              value={String(s.weight_log_interval_days ?? 7)}
              onChange={(e) => patch('weight_log_interval_days', Number(e.target.value))}
            >
              <option value="1">Every day</option>
              <option value="3">Every 3 days</option>
              <option value="7">Every week</option>
              <option value="14">Every 2 weeks</option>
              <option value="30">Every month</option>
            </Select>
          </Field>
          <Field label={isCrestie ? 'Meal interval mode' : 'Feed interval mode'}>
            <Select value={s.feed_interval_mode} onChange={(e) => patch('feed_interval_mode', e.target.value)}>
              <option value="auto">{feedModeHelp}</option>
              <option value="stage">Life stage only</option>
              <option value="manual">Manual days</option>
            </Select>
          </Field>
          {s.feed_interval_mode === 'manual' && (
            <Field label={isCrestie ? 'Meal every N days' : 'Feed every N days'}>
              <Input
                type="number"
                value={s.feed_interval_days ?? (isCrestie ? 2 : 8)}
                onChange={(e) => patch('feed_interval_days', Number(e.target.value))}
              />
            </Field>
          )}
        </div>
      </LogForm>

      <SectionLabel>Event emails — {petName}</SectionLabel>
      <LogForm title="One-shot alerts (outside digest)">
        <Toggle
          label={isCrestie ? '1. Post-meal wait cleared (Wait → Clear)' : '1. Handle cleared (Wait → Clear)'}
          checked={s.event_handle_cleared}
          onChange={(v) => patch('event_handle_cleared', v)}
        />
        <Toggle
          label={isCrestie ? '2. Meal / CGD just became overdue' : '2. Feed just became overdue'}
          checked={s.event_feed_overdue}
          onChange={(v) => patch('event_feed_overdue', v)}
        />
        <Toggle
          label="3. Handling gap exceeded (optional — off by default)"
          checked={s.event_handling_gap}
          onChange={(v) => patch('event_handling_gap', v)}
        />
        <Toggle
          label="4. Shed entered blue/opaque"
          checked={s.event_shed_status}
          onChange={(v) => patch('event_shed_status', v)}
        />
        {!isCrestie && (
          <Toggle
            label="5. Regurgitation logged"
            checked={s.event_regurg}
            onChange={(v) => patch('event_regurg', v)}
          />
        )}
        <Toggle
          label={`${isCrestie ? '5' : '6'}. Water change due / overdue`}
          checked={s.event_maint_water}
          onChange={(v) => patch('event_maint_water', v)}
        />
        <Toggle
          label={`${isCrestie ? '6' : '7'}. ${isCrestie ? 'Mist cycle' : 'Sub tray'} due / overdue`}
          checked={s.event_maint_substrate}
          onChange={(v) => patch('event_maint_substrate', v)}
        />
        <Toggle
          label={`${isCrestie ? '7' : '8'}. Deep clean due / overdue`}
          checked={s.event_maint_deep_clean}
          onChange={(v) => patch('event_maint_deep_clean', v)}
        />
        <Toggle
          label={`${isCrestie ? '8' : '9'}. Weight log due`}
          checked={s.event_weight_due}
          onChange={(v) => patch('event_weight_due', v)}
        />
        {isCrestie && (
          <Toggle
            label="9. Tail drop logged"
            checked={s.event_tail_drop ?? true}
            onChange={(v) => patch('event_tail_drop', v)}
          />
        )}
      </LogForm>

      <div className="mb-4 flex flex-wrap gap-2">
        <Btn
          onClick={async () => {
            try {
              const saved = await api.settings.update(s)
              setS(saved)
              setSaveMsg(`Saved · ${petName} care + household email`)
            } catch (e) {
              setSaveMsg(String(e))
            }
          }}
        >
          Save settings
        </Btn>
        <Btn
          onClick={async () => {
            try {
              const r = await api.settings.testDigest()
              setTestMsg(JSON.stringify(r))
            } catch (e) {
              setTestMsg(String(e))
            }
          }}
        >
          Send today’s digest
        </Btn>
      </div>
      {saveMsg && <p className="mb-2 font-mono text-[11px] text-sand">{saveMsg}</p>}
      {testMsg && <p className="mb-4 font-mono text-[11px] text-muted break-all">{testMsg}</p>}
      <p className="mb-4 text-[11px] text-muted">
        Care intervals and event toggles are per pet ({feedNoun} cadence for {petName}). Email destination and
        digest times are shared.
      </p>

      <MigrateSection />

      <SectionLabel>Session</SectionLabel>
      <Btn onClick={onLogout}>Log out</Btn>
    </div>
  )
}


type LegacyPetPayload = {
  feeds: unknown[]
  weights: unknown[]
  sheds: unknown[]
  vet: unknown[]
  tails?: unknown[]
}

type LegacyDump = {
  version?: number
  source?: string
  casper?: LegacyPetPayload | null
  arlo?: LegacyPetPayload | null
}

function readLegacyKey(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function scanBrowserLegacy(): LegacyDump {
  return {
    version: 1,
    source: 'browser-localStorage',
    casper: {
      feeds: readLegacyKey('c_feeds'),
      weights: readLegacyKey('c_weights'),
      sheds: readLegacyKey('c_sheds'),
      vet: readLegacyKey('c_vet'),
    },
    arlo: {
      feeds: readLegacyKey('a_feeds'),
      weights: readLegacyKey('a_weights'),
      sheds: readLegacyKey('a_sheds'),
      vet: readLegacyKey('a_vet'),
      tails: readLegacyKey('a_tail'),
    },
  }
}

function countPet(p?: LegacyPetPayload | null) {
  if (!p) return 0
  return (
    (p.feeds?.length || 0) +
    (p.weights?.length || 0) +
    (p.sheds?.length || 0) +
    (p.vet?.length || 0) +
    (p.tails?.length || 0)
  )
}

function MigrateSection() {
  const [dump, setDump] = useState<LegacyDump | null>(null)
  const [skipDupes, setSkipDupes] = useState(true)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const casperN = countPet(dump?.casper)
  const arloN = countPet(dump?.arlo)

  async function runImport() {
    if (!dump) {
      setStatus('Load a dump first (file or browser scan).')
      return
    }
    if (casperN + arloN === 0) {
      setStatus('Dump is empty — nothing to import.')
      return
    }
    setBusy(true)
    setStatus('')
    try {
      const result = await api.importLegacy({
        ...dump,
        skip_duplicates: skipDupes,
      })
      setStatus(JSON.stringify(result, null, 2))
      localStorage.setItem('casper_arlo_legacy_imported_at', new Date().toISOString())
    } catch (e) {
      setStatus(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <SectionLabel>Migrate from static page</SectionLabel>
      <LogForm title="archive/legacy-dashboard.html → Care">
        <p className="mb-2 text-[12px] text-muted">
          The static dashboard is retired (archive only). Open{" "}
          <code className="text-sand">archive/legacy-dashboard.html</code>, click <strong>Export for app</strong>, then
          upload that JSON here. Casper keys (<code className="text-sand">c_*</code>) and Arlo keys (
          <code className="text-sand">a_*</code> / <code className="text-sand">a_tail</code>) map automatically.
        </p>
        <div className="mb-2 flex flex-wrap gap-2">
          <Field label="Export JSON file">
            <Input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  const text = await file.text()
                  const parsed = JSON.parse(text) as LegacyDump
                  setDump(parsed)
                  setStatus(
                    `Loaded file: Casper ${countPet(parsed.casper)} rows · Arlo ${countPet(parsed.arlo)} rows`,
                  )
                } catch (err) {
                  setStatus(`Invalid JSON: ${String(err)}`)
                }
              }}
            />
          </Field>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Btn
            onClick={() => {
              const scanned = scanBrowserLegacy()
              setDump(scanned)
              setStatus(
                `Scanned this browser: Casper ${countPet(scanned.casper)} · Arlo ${countPet(scanned.arlo)} (only works if c_*/a_* keys exist on this origin)`,
              )
            }}
          >
            Scan this browser
          </Btn>
          <Btn disabled={busy || !dump} onClick={() => void runImport()}>
            {busy ? 'Importing…' : 'Import both pets'}
          </Btn>
        </div>
        <Toggle label="Skip duplicates (recommended)" checked={skipDupes} onChange={setSkipDupes} />
        {dump && (
          <p className="mt-2 text-[12px] text-muted">
            Loaded — Casper {casperN} rows · Arlo {arloN} rows
          </p>
        )}
        {status && (
          <p className="mt-2 font-mono text-[11px] text-sand whitespace-pre-wrap break-all">{status}</p>
        )}
      </LogForm>
    </>
  )
}

/** Dev helper — paste single-pet arrays into the active animal. Prefer Settings → Migrate for household. */
export function LocalTab({ animal }: { animal: AnimalOverview }) {
  const [importStatus, setImportStatus] = useState('')
  const [feedsJson, setFeedsJson] = useState('[]')
  const [weightsJson, setWeightsJson] = useState('[]')
  const [shedsJson, setShedsJson] = useState('[]')
  const [vetJson, setVetJson] = useState('[]')
  const [tailsJson, setTailsJson] = useState('[]')

  const prefix = animal.species_pack.key === 'crested_gecko' ? 'a_' : 'c_'
  const showTails = animal.species_pack.supports_tail

  function loadFromBrowser() {
    setFeedsJson(JSON.stringify(readLegacyKey(`${prefix}feeds`)))
    setWeightsJson(JSON.stringify(readLegacyKey(`${prefix}weights`)))
    setShedsJson(JSON.stringify(readLegacyKey(`${prefix}sheds`)))
    setVetJson(JSON.stringify(readLegacyKey(`${prefix}vet`)))
    if (showTails) setTailsJson(JSON.stringify(readLegacyKey('a_tail')))
    setImportStatus(`Loaded ${prefix}* for ${animal.name} (active id ${getActiveAnimalId()})`)
  }

  return (
    <div>
      <p className="mb-4 rounded-lg border border-border bg-bark px-3 py-2 text-[12px] text-sand">
        Dev single-pet paste. For a full Casper + Arlo migration use <strong>Settings → Migrate from static page</strong>.
      </p>

      <SectionLabel>Load from this browser</SectionLabel>
      <div className="mb-4 flex flex-wrap gap-2">
        <Btn onClick={loadFromBrowser}>
          Load {prefix}feeds / weights / sheds / vet{showTails ? ' / a_tail' : ''}
        </Btn>
      </div>

      <SectionLabel>Import into {animal.name}</SectionLabel>
      <LogForm title="Paste or edit JSON arrays">
        <Field label={`${prefix}feeds`}>
          <TextArea rows={3} value={feedsJson} onChange={(e) => setFeedsJson(e.target.value)} className="mb-2 font-mono text-[11px]" />
        </Field>
        <Field label={`${prefix}weights`}>
          <TextArea rows={2} value={weightsJson} onChange={(e) => setWeightsJson(e.target.value)} className="mb-2 font-mono text-[11px]" />
        </Field>
        <Field label={`${prefix}sheds`}>
          <TextArea rows={2} value={shedsJson} onChange={(e) => setShedsJson(e.target.value)} className="mb-2 font-mono text-[11px]" />
        </Field>
        <Field label={`${prefix}vet`}>
          <TextArea rows={2} value={vetJson} onChange={(e) => setVetJson(e.target.value)} className="mb-2 font-mono text-[11px]" />
        </Field>
        {showTails && (
          <Field label="a_tail">
            <TextArea rows={2} value={tailsJson} onChange={(e) => setTailsJson(e.target.value)} className="mb-2 font-mono text-[11px]" />
          </Field>
        )}
        <Btn
          onClick={async () => {
            try {
              const result = await api.importLocalStorage({
                feeds: JSON.parse(feedsJson),
                weights: JSON.parse(weightsJson),
                sheds: JSON.parse(shedsJson),
                vet: JSON.parse(vetJson),
                tails: showTails ? JSON.parse(tailsJson) : [],
                skip_duplicates: true,
              })
              setImportStatus(JSON.stringify(result))
            } catch (e) {
              setImportStatus(String(e))
            }
          }}
        >
          Import into {animal.name}
        </Btn>
        {importStatus && <p className="mt-2 font-mono text-[11px] text-sand">{importStatus}</p>}
      </LogForm>
    </div>
  )
}
