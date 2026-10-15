import type { SessionFigures } from '@virtuocity/contract-analytics';

/** Labeled figures about the session, e.g. its words, one small table per group. */
export function SessionFiguresView({ figures }: { figures: SessionFigures }) {
  return (
    <div className="figures">
      {figures.groups.map((group) => (
        <section key={group.title}>
          <h4 className="figures__title">{group.title}</h4>
          <dl className="figures__list">
            {group.figures.map((figure) => (
              <div key={figure.label}>
                <dt>{figure.label}</dt>
                <dd>{figure.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
