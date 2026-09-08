import { useRef, useState } from 'react';

import { parseRichText, toggleBold, toggleNumbering } from '../lib/rich-text';

/**
 * The description, with the two bits of formatting a task actually needs:
 * bold, and a numbered list.
 *
 * Stored as text with ** ** and "1." in it, not as HTML. That keeps what is in
 * the database readable by anything that reads it - the CSV export, a search,
 * a person looking at a row - and means no description ever becomes markup a
 * browser is asked to trust.
 *
 * Preview is a toggle rather than a second pane, because the drawer is narrow
 * and two half-width columns would help nobody.
 */
export function DescriptionField({
  value,
  disabled,
  onSave,
}: {
  value: string;
  disabled: boolean;
  onSave: (next: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(value);
  const [previewing, setPreviewing] = useState(false);

  // Applies one of the formatting helpers to whatever is selected, then puts
  // the selection back where the helper says it belongs. Without restoring it,
  // the caret jumps to the end and the next keystroke lands in the wrong place.
  const apply = (
    fn: (text: string, start: number, end: number) => { text: string; start: number; end: number },
  ): void => {
    const field = ref.current;
    if (!field) return;

    const next = fn(text, field.selectionStart, field.selectionEnd);
    setText(next.text);

    window.requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(next.start, next.end);
    });
  };

  const commit = (): void => {
    if (text !== value) onSave(text);
  };

  const blocks = parseRichText(text);

  return (
    <div className="field">
      <div className="row" style={{ justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <label className="field__label" htmlFor="drawer-description">
          Description
        </label>

        <span className="row" style={{ gap: 4 }}>
          {!previewing && !disabled ? (
            <>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => apply(toggleBold)}
                title="Bold the selected text (Ctrl+B)"
                aria-label="Bold"
                style={{ fontWeight: 700, minWidth: 30 }}
              >
                B
              </button>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => apply(toggleNumbering)}
                title="Number the selected lines"
                aria-label="Numbered list"
                style={{ minWidth: 34 }}
              >
                1.
              </button>
            </>
          ) : null}

          {/* Nothing to preview until something is written. */}
          {text.trim() !== '' ? (
            <button
              type="button"
              className="btn btn--sm"
              aria-pressed={previewing}
              onClick={() => {
                if (!previewing) commit();
                setPreviewing((current) => !current);
              }}
            >
              {previewing ? 'Edit' : 'Preview'}
            </button>
          ) : null}
        </span>
      </div>

      {previewing ? (
        <div
          className="card"
          style={{ padding: 'var(--space-3)', minHeight: 130, lineHeight: 1.6 }}
        >
          <RichText blocks={blocks} />
        </div>
      ) : (
        <textarea
          id="drawer-description"
          ref={ref}
          className="field__input"
          style={{ height: 130, lineHeight: 1.5 }}
          value={text}
          disabled={disabled}
          placeholder="Context, links, acceptance criteria…"
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            // The shortcut people try first, before looking for a button.
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
              event.preventDefault();
              apply(toggleBold);
            }
          }}
        />
      )}
    </div>
  );
}

/** Blocks to elements. No HTML is produced, so nothing needs sanitising. */
function RichText({ blocks }: { blocks: ReturnType<typeof parseRichText> }) {
  if (blocks.length === 0) return <p className="meta">Nothing written yet.</p>;

  return (
    <>
      {blocks.map((block, index) =>
        block.kind === 'list' ? (
          <ol key={index} style={{ margin: '0 0 var(--space-2)', paddingLeft: '1.4rem' }}>
            {block.items.map((spans, item) => (
              <li key={item}>
                <Spans spans={spans} />
              </li>
            ))}
          </ol>
        ) : (
          <p key={index} style={{ margin: '0 0 var(--space-2)' }}>
            {block.lines.map((spans, line) => (
              <span key={line}>
                {line > 0 ? <br /> : null}
                <Spans spans={spans} />
              </span>
            ))}
          </p>
        ),
      )}
    </>
  );
}

function Spans({ spans }: { spans: Array<{ text: string; bold: boolean }> }) {
  return (
    <>
      {spans.map((span, index) =>
        span.bold ? <strong key={index}>{span.text}</strong> : <span key={index}>{span.text}</span>,
      )}
    </>
  );
}
