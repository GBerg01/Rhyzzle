/**
 * Renders a line of text with colored highlight spans overlaid.
 * Designed for the white-background SubmissionPatternCard.
 *
 * Overlapping spans: the first span wins; overlapping later spans are skipped.
 * Unknown categories: render the text without a highlight class (safe fallback).
 */

import { HIGHLIGHT_COLORS_LIGHT } from "@/lib/utils";
import type { HighlightSpanDTO } from "@/lib/types";

interface HighlightedTextProps {
  text: string;
  spans: HighlightSpanDTO[];
  className?: string;
}

interface Segment {
  text: string;
  span?: HighlightSpanDTO;
}

export function HighlightedText({ text, spans, className }: HighlightedTextProps) {
  if (!spans.length) {
    return <span className={className}>{text}</span>;
  }

  // Sort by start position; skip spans that go out of bounds
  const valid = spans
    .filter((s) => s.startIndex >= 0 && s.endIndex <= text.length && s.startIndex < s.endIndex)
    .sort((a, b) => a.startIndex - b.startIndex);

  const segments: Segment[] = [];
  let pos = 0;

  for (const span of valid) {
    if (span.startIndex < pos) continue; // overlapping — skip

    if (span.startIndex > pos) {
      segments.push({ text: text.slice(pos, span.startIndex) });
    }
    segments.push({ text: text.slice(span.startIndex, span.endIndex), span });
    pos = span.endIndex;
  }

  if (pos < text.length) {
    segments.push({ text: text.slice(pos) });
  }

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (!seg.span) return <span key={i}>{seg.text}</span>;
        const style = HIGHLIGHT_COLORS_LIGHT[seg.span.category];
        if (!style) return <span key={i}>{seg.text}</span>;
        return (
          <span
            key={i}
            className={style.className}
            title={seg.span.explanation ?? style.label}
          >
            {seg.text}
          </span>
        );
      })}
    </span>
  );
}
