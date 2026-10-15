import type { PostType, SessionOutline } from '@virtuocity/contract-analytics';
import { POST_TYPES, POST_TYPE_NAMES } from '@virtuocity/contract-analytics';
import { scrollToMessage } from './scrollToMessage';

/** Which kinds of post the outline shows, with their colors, in a fixed order. */
function Legend({ types }: { types: ReadonlySet<PostType> }) {
  return (
    <ul className="outline__legend">
      {POST_TYPES.filter((t) => types.has(t)).map((type) => (
        <li key={type} data-type={type}>
          {POST_TYPE_NAMES[type]}
        </li>
      ))}
    </ul>
  );
}

/**
 * The session as a strip of thin colored lines, one per post; clicking one
 * brings that post into view. Posts hidden from the people cannot be shown,
 * so their lines do nothing.
 */
export function SessionOutlineView({ outline }: { outline: SessionOutline }) {
  if (outline.rows.length === 0) return <p className="muted">The session has no posts yet.</p>;
  return (
    <div className="outline">
      <div className="outline__lines">
        {outline.rows.map((row) => (
          <button
            key={row.messageId}
            type="button"
            className="outline__line"
            data-type={row.type}
            title={row.title}
            aria-label={row.title}
            disabled={row.type === 'hidden'}
            onClick={() => scrollToMessage(row.messageId)}
          />
        ))}
      </div>
      <Legend types={new Set(outline.rows.map((r) => r.type))} />
    </div>
  );
}
