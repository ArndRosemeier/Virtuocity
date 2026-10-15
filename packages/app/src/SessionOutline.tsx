import type { OutlineRow, PostType, SessionOutline } from '@virtuocity/contract-analytics';
import { POST_TYPES, POST_TYPE_NAMES } from '@virtuocity/contract-analytics';
import { openSpace } from './openSpaces';
import { scrollToMarker, scrollToMessage } from './scrollToMessage';

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

/** Brings the post into view; a marker also opens the space of the actor that placed it. */
function show({ messageId, markerOf }: OutlineRow): void {
  if (markerOf === undefined) {
    scrollToMessage(messageId);
    return;
  }
  scrollToMarker(messageId, markerOf);
  openSpace(markerOf);
}

/**
 * The session as a strip of thin colored lines, one per post; clicking one
 * brings that post into view. Markers (e.g. "Summarized") sit between the
 * posts they follow. Posts hidden from the people cannot be shown,
 * so their lines do nothing.
 */
export function SessionOutlineView({ outline }: { outline: SessionOutline }) {
  if (outline.rows.length === 0) return <p className="muted">The session has no posts yet.</p>;
  return (
    <div className="outline">
      <div className="outline__lines">
        {outline.rows.map((row) => (
          <button
            key={`${row.messageId} ${row.markerOf ?? ''}`}
            type="button"
            className="outline__line"
            data-type={row.type}
            title={row.title}
            aria-label={row.title}
            disabled={row.type === 'hidden'}
            onClick={() => show(row)}
          />
        ))}
      </div>
      <Legend types={new Set(outline.rows.map((r) => r.type))} />
    </div>
  );
}
