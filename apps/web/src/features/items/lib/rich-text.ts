/**
 * The little of Markdown a description actually needs: bold, and numbered
 * lists. Parsed to a tree of plain data rather than to HTML, so rendering is a
 * matter of mapping to React elements - there is no point in the application
 * where somebody's description becomes markup that a browser is asked to trust.
 */

export interface InlineSpan {
  text: string;
  bold: boolean;
}

export type RichBlock =
  | { kind: 'list'; items: InlineSpan[][] }
  | { kind: 'paragraph'; lines: InlineSpan[][] };

/** A line that opens or continues a numbered list: "1. ", "2) ", indented or not. */
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

/**
 * Splits a line on **bold** runs.
 *
 * An unclosed `**` is left as written. Somebody mid-sentence has typed the
 * first pair and not yet the second, and swallowing their asterisks while they
 * type is worse than showing them.
 */
export function parseInline(line: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let rest = line;

  while (rest.length > 0) {
    const open = rest.indexOf('**');
    if (open === -1) break;

    const close = rest.indexOf('**', open + 2);
    // No closing pair, so the rest of the line is ordinary text.
    if (close === -1) break;

    const inner = rest.slice(open + 2, close);
    // "****" is not emphasis of nothing; treat it as literal.
    if (inner.length === 0) {
      spans.push({ text: rest.slice(0, close + 2), bold: false });
      rest = rest.slice(close + 2);
      continue;
    }

    if (open > 0) spans.push({ text: rest.slice(0, open), bold: false });
    spans.push({ text: inner, bold: true });
    rest = rest.slice(close + 2);
  }

  if (rest.length > 0) spans.push({ text: rest, bold: false });

  return spans.length > 0 ? spans : [{ text: '', bold: false }];
}

/**
 * Groups lines into blocks. Consecutive numbered lines become one list, so a
 * list survives being renumbered by hand and does not restart on every line.
 */
export function parseRichText(text: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let list: InlineSpan[][] | null = null;
  let paragraph: InlineSpan[][] | null = null;

  const closeList = (): void => {
    if (list) blocks.push({ kind: 'list', items: list });
    list = null;
  };
  const closeParagraph = (): void => {
    if (paragraph) blocks.push({ kind: 'paragraph', lines: paragraph });
    paragraph = null;
  };

  for (const line of text.split('\n')) {
    const numbered = NUMBERED.exec(line);

    if (numbered) {
      closeParagraph();
      list = list ?? [];
      list.push(parseInline(numbered[1] as string));
      continue;
    }

    // A blank line ends whatever was open; it is how people separate things.
    if (line.trim() === '') {
      closeList();
      closeParagraph();
      continue;
    }

    closeList();
    paragraph = paragraph ?? [];
    paragraph.push(parseInline(line));
  }

  closeList();
  closeParagraph();

  return blocks;
}

/**
 * Wraps the selected text in ** **, or unwraps it if it is already bold, the
 * way every editor's bold button behaves. Returns the new text and where the
 * selection should sit afterwards.
 */
export function toggleBold(
  text: string,
  start: number,
  end: number,
): { text: string; start: number; end: number } {
  const selected = text.slice(start, end);

  // Nothing selected: drop in an empty pair and put the caret between them.
  if (selected === '') {
    return {
      text: `${text.slice(0, start)}****${text.slice(start)}`,
      start: start + 2,
      end: start + 2,
    };
  }

  if (selected.startsWith('**') && selected.endsWith('**') && selected.length > 4) {
    const bare = selected.slice(2, -2);
    return {
      text: text.slice(0, start) + bare + text.slice(end),
      start,
      end: start + bare.length,
    };
  }

  // Already wrapped, but the ** sit just outside the selection.
  if (text.slice(start - 2, start) === '**' && text.slice(end, end + 2) === '**') {
    return {
      text: text.slice(0, start - 2) + selected + text.slice(end + 2),
      start: start - 2,
      end: start - 2 + selected.length,
    };
  }

  return {
    text: `${text.slice(0, start)}**${selected}**${text.slice(end)}`,
    start: start + 2,
    end: end + 2,
  };
}

/**
 * Numbers the selected lines, or strips the numbers if they are already there.
 * Whole lines either way - half a numbered line is not a thing anybody means.
 */
export function toggleNumbering(
  text: string,
  start: number,
  end: number,
): { text: string; start: number; end: number } {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  const lineEndIndex = text.indexOf('\n', end);
  const lineEnd = lineEndIndex === -1 ? text.length : lineEndIndex;

  const block = text.slice(lineStart, lineEnd);
  const lines = block.split('\n');
  const allNumbered = lines.every((line) => line.trim() === '' || NUMBERED.test(line));

  const rewritten = allNumbered
    ? lines.map((line) => {
        const match = NUMBERED.exec(line);
        return match ? (match[1] as string) : line;
      })
    : // Renumbered from one, so inserting a line in the middle cannot leave two
      // items sharing a number.
      (() => {
        let n = 0;
        return lines.map((line) => (line.trim() === '' ? line : `${(n += 1)}. ${line.trim()}`));
      })();

  const replacement = rewritten.join('\n');

  return {
    text: text.slice(0, lineStart) + replacement + text.slice(lineEnd),
    start: lineStart,
    end: lineStart + replacement.length,
  };
}
