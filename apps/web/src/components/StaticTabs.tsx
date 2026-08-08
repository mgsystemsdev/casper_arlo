import { Card, SectionLabel } from './ui'
import type { AnimalOverview } from '../api/client'

const STAGE_ORDER = ['Hatchling', 'Juvenile', 'Sub-adult', 'Adult'] as const

export function PreyTab({ animal }: { animal: AnimalOverview }) {
  const current = animal.stage.label
  const pack = animal.species_pack
  const alt = animal.feeding_recommendation.alternative_prey
  const noun = pack.food_noun

  return (
    <div>
      <p className="mb-3.5 text-[13px] text-muted">
        {animal.name} is a <strong className="text-sand">{current.toLowerCase()}</strong> (
        {animal.age.months} mo). Safest rhythm now: about every{' '}
        <strong className="text-sand">
          {animal.feeding_recommendation.feeding_interval.recommended_days}d
        </strong>{' '}
        (stay within {animal.feeding_recommendation.feeding_interval.min_days}–
        {animal.feeding_recommendation.feeding_interval.max_days}).
      </p>

      {pack.guide_notes?.length > 0 && (
        <>
          <SectionLabel>Notes</SectionLabel>
          <Card className="mb-3.5 text-[13px] text-bone-dark leading-relaxed">
            <ul className="list-disc space-y-1 pl-4">
              {pack.guide_notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Card>
        </>
      )}

      {alt.length > 0 && (
        <>
          <SectionLabel>Alternatives</SectionLabel>
          <Card className="mb-3.5 text-[13px] text-bone-dark leading-relaxed">
            For {current}: <strong className="text-sand">{alt.join(', ')}</strong> as occasional
            variety only.
          </Card>
        </>
      )}

      <SectionLabel>{noun === 'prey' ? 'Prey' : 'Diet'} by life stage</SectionLabel>
      <div className="overflow-x-auto rounded-[10px] border border-border">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-charcoal">
              {['Stage', 'Age', 'Recommended', 'Frequency'].map((h) => (
                <th
                  key={h}
                  className="border-b border-border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAGE_ORDER.map((label) => {
              const rules = animal.feeding_stages[label]
              if (!rules) return null
              const on = label === current
              return (
                <tr
                  key={label}
                  className={on ? 'bg-bark text-bone' : 'text-bone-dark'}
                  style={on ? { boxShadow: 'inset 3px 0 0 var(--color-sand)' } : undefined}
                >
                  <td className="border-b border-border px-2.5 py-2 text-[12px]">
                    {label}
                    {on && <span className="ml-1 font-mono text-[10px] text-sand">★</span>}
                  </td>
                  <td className="border-b border-border px-2.5 py-2 text-[12px]">{rules.desc}</td>
                  <td className="border-b border-border px-2.5 py-2 text-[12px]">
                    {rules.recommended.join(', ')}
                  </td>
                  <td className="border-b border-border px-2.5 py-2 font-mono text-[12px] text-sand">
                    {rules.feeding_interval.min_days}–{rules.feeding_interval.max_days}d
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Card className="mt-3.5 text-[12px] text-muted leading-relaxed">
        Pick a {noun} from the list when logging. Age sets the stage; stage sets recommended vs
        acceptable. Grams are optional logging only.
      </Card>
    </div>
  )
}

export function SpeciesTab({ animal }: { animal: AnimalOverview }) {
  const pack = animal.species_pack
  return (
    <div>
      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Scientific name</div>
          <div className="mt-1 font-mono text-sm italic text-bone">{animal.species}</div>
        </Card>
        <Card>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Common names</div>
          <div className="mt-1 text-[13px] text-bone-dark">{animal.common_name}</div>
        </Card>
      </div>
      <SectionLabel>Key facts</SectionLabel>
      <Card>
        {pack.facts.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border-b border-border py-2 text-[13px] last:border-0">
            <span className="text-muted">{k}</span>
            <span className="text-right text-bone">{v}</span>
          </div>
        ))}
      </Card>
      <SectionLabel>Handling tips</SectionLabel>
      <Card>
        {pack.handling_tips.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between border-b border-border py-2 text-[13px] last:border-0">
            <span className="text-muted">{k}</span>
            <span className="text-right text-bone">{v}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}
