import { describe, expect, it } from 'vitest';

import { parseInline, parseRichText, toggleBold, toggleNumbering } from './rich-text';

describe('reading bold out of a line', () => {
  it('splits a bold run from the plain text around it', () => {
    expect(parseInline('ship **before** Friday')).toEqual([
      { text: 'ship ', bold: false },
      { text: 'before', bold: true },
      { text: ' Friday', bold: false },
    ]);
  });

  it('leaves an unclosed pair alone', () => {
    // Somebody is mid-sentence. Swallowing what they typed is worse than
    // showing the asterisks until they close them.
    expect(parseInline('ship **before')).toEqual([{ text: 'ship **before', bold: false }]);
  });

  it('does not read **** as emphasis of nothing', () => {
    expect(parseInline('****')).toEqual([{ text: '****', bold: false }]);
  });

  it('handles more than one run on a line', () => {
    expect(parseInline('**a** and **b**')).toEqual([
      { text: 'a', bold: true },
      { text: ' and ', bold: false },
      { text: 'b', bold: true },
    ]);
  });
});

describe('reading blocks out of a description', () => {
  it('gathers consecutive numbered lines into one list', () => {
    const blocks = parseRichText('1. first\n2. second\n3. third');

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe('list');
    expect(blocks[0]?.kind === 'list' && blocks[0].items).toHaveLength(3);
  });

  it('keeps prose and a list apart', () => {
    const blocks = parseRichText('Context here\n\n1. first\n2. second');

    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'list']);
  });

  it('accepts both "1." and "1)"', () => {
    const blocks = parseRichText('1) first\n2) second');

    expect(blocks[0]?.kind === 'list' && blocks[0].items).toHaveLength(2);
  });

  it('carries bold through into a list item', () => {
    const blocks = parseRichText('1. call **Ravi**');

    expect(blocks[0]?.kind === 'list' && blocks[0].items[0]).toEqual([
      { text: 'call ', bold: false },
      { text: 'Ravi', bold: true },
    ]);
  });

  it('gives an empty description no blocks at all', () => {
    expect(parseRichText('')).toEqual([]);
  });
});

describe('the bold button', () => {
  it('wraps the selection and keeps it selected', () => {
    const result = toggleBold('ship before Friday', 5, 11);

    expect(result.text).toBe('ship **before** Friday');
    expect(result.text.slice(result.start, result.end)).toBe('before');
  });

  it('unwraps text that is already bold', () => {
    const result = toggleBold('ship **before** Friday', 5, 15);

    expect(result.text).toBe('ship before Friday');
    expect(result.text.slice(result.start, result.end)).toBe('before');
  });

  it('unwraps when the markers sit just outside the selection', () => {
    const result = toggleBold('ship **before** Friday', 7, 13);

    expect(result.text).toBe('ship before Friday');
    expect(result.text.slice(result.start, result.end)).toBe('before');
  });

  it('leaves the caret between the markers when nothing is selected', () => {
    const result = toggleBold('ship ', 5, 5);

    expect(result.text).toBe('ship ****');
    expect(result.start).toBe(7);
    expect(result.end).toBe(7);
  });
});

describe('the numbering button', () => {
  it('numbers the selected lines from one', () => {
    const result = toggleNumbering('call Ravi\nsend the deck\nbook the room', 0, 38);

    expect(result.text).toBe('1. call Ravi\n2. send the deck\n3. book the room');
  });

  it('numbers the line the caret is on when nothing is selected', () => {
    const result = toggleNumbering('call Ravi', 4, 4);

    expect(result.text).toBe('1. call Ravi');
  });

  it('strips the numbers when they are already there', () => {
    const result = toggleNumbering('1. call Ravi\n2. send the deck', 0, 28);

    expect(result.text).toBe('call Ravi\nsend the deck');
  });

  it('renumbers from one rather than trusting what was typed', () => {
    // The point of the button: a line inserted in the middle leaves two items
    // sharing a number, and nobody wants to fix that by hand.
    const result = toggleNumbering('3. third\n3. also third', 0, 22);

    expect(result.text).toBe('third\nalso third');
    expect(toggleNumbering(result.text, 0, result.text.length).text).toBe('1. third\n2. also third');
  });

  it('leaves the rest of the description untouched', () => {
    const text = 'Context\n\ncall Ravi\n\nMore context';
    const result = toggleNumbering(text, 9, 9);

    expect(result.text).toBe('Context\n\n1. call Ravi\n\nMore context');
  });
});
