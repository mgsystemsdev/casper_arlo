import { FactList, SectionLabel } from './ui'
import type { AnimalOverview } from '../api/client'

const STAGE_ORDER = ['Hatchling', 'Juvenile', 'Sub-adult', 'Adult'] as const

export function PreyTab({ animal }: { animal: AnimalOverview }) {
  const current = animal.stage.label
  const pack = animal.species_pack
  const alt = animal.feeding_recommendation.alternative_prey
  const noun = pack.food_noun
  const isPrey = noun === 'prey'

  return (
    <div>
      <p className="mb-1 max-w-2xl text-[14px] leading-relaxed text-bone-dark">
        {animal.name} is a <span className="text-sand">{current.toLowerCase()}</span> (
        {animal.age.months} mo). Safest rhythm now: about every{' '}
        <span className="font-display text-lg font-semibold text-sand">
          {animal.feeding_recommendation.feeding_interval.recommended_days}d
        </span>{' '}
        <span className="text-muted">
          (stay within {animal.feeding_recommendation.feeding_interval.min_days}–
          {animal.feeding_recommendation.feeding_interval.max_days})
        </span>
        .
        {isPrey && (
          <>
            {' '}
            Don&apos;t lengthen the next gap just because a feed was late. All prey frozen/thawed.
          </>
        )}
      </p>

      {pack.guide_notes?.length > 0 && (
        <>
          <SectionLabel>Notes</SectionLabel>
          <ul className="mb-1 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-bone-dark">
            {pack.guide_notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </>
      )}

      <SectionLabel>{isPrey ? 'Other prey' : 'Occasional extras'}</SectionLabel>
      <p className="mb-1 max-w-2xl text-[13px] leading-relaxed text-bone-dark">
        For {current}:{' '}
        {alt.length > 0 ? (
          <>
            <span className="text-sand">{alt.join(', ')}</span> as occasional alternative only.
          </>
        ) : (
          <>no alternatives listed for this stage.</>
        )}{' '}
        Use sparingly.
      </p>

      <SectionLabel>{isPrey ? 'Prey' : 'Diet'} by life stage</SectionLabel>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border">
              {['Life Stage', 'Age', 'Recommended', 'Acceptable', 'Frequency'].map((h) => (
                <th
                  key={h}
                  className="px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted"
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
              const iv = rules.feeding_interval
              return (
                <tr
                  key={label}
                  className={on ? 'text-bone' : 'text-bone-dark'}
                  style={on ? { boxShadow: 'inset 3px 0 0 var(--color-sand)' } : undefined}
                >
                  <td className={`border-b border-border/70 px-2.5 py-2.5 text-[12px] ${on ? 'text-sand' : ''}`}>
                    {on ? `★ ${label}` : label}
                  </td>
                  <td className="border-b border-border/70 px-2.5 py-2.5 text-[12px]">{rules.desc}</td>
                  <td className="border-b border-border/70 px-2.5 py-2.5 text-[12px]">
                    {rules.recommended.join(', ')}
                  </td>
                  <td className="border-b border-border/70 px-2.5 py-2.5 text-[12px]">
                    {rules.acceptable.join(', ') || '—'}
                  </td>
                  <td className="border-b border-border/70 px-2.5 py-2.5 font-mono text-[12px] text-sand">
                    Every {iv.min_days}–{iv.max_days} days
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <SectionLabel>Category rule</SectionLabel>
      <p className="max-w-2xl text-[13px] leading-relaxed text-muted">
        Pick a {noun} category from the list. Age sets the stage; stage sets recommended vs acceptable
        vs too small / too large. Grams are optional logging only — not used for recommendations.
      </p>
    </div>
  )
}

export function SpeciesTab({ animal }: { animal: AnimalOverview }) {
  const pack = animal.species_pack
  return (
    <div>
      <div className="mb-2 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Scientific name</div>
          <div className="mt-1 font-display text-lg italic text-bone">{animal.species}</div>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Common names</div>
          <div className="mt-1 text-[14px] text-bone-dark">{animal.common_name}</div>
        </div>
      </div>
      <SectionLabel>Key facts</SectionLabel>
      <FactList rows={pack.facts} />
      <SectionLabel>Handling tips</SectionLabel>
      <FactList rows={pack.handling_tips} />
    </div>
  )
}
