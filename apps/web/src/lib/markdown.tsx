import type { ReactNode } from 'react';

/**
 * Minimal, safe Markdown subset for CMS article bodies: paragraphs, ## / ### headings,
 * "- " bullet lists, **bold** and [links](https://…). Rendered as React elements
 * (no HTML injection).
 */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={`${key}-b${i++}`}>{m[1]}</strong>);
    else out.push(<a key={`${key}-a${i++}`} href={m[3]} target="_blank" rel="noopener noreferrer">{m[2]}</a>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prose-article text-ink/90">
      {blocks.map((b, i) => {
        const k = `blk${i}`;
        if (b.startsWith('### ')) return <h3 key={k}>{inline(b.slice(4), k)}</h3>;
        if (b.startsWith('## ')) return <h2 key={k}>{inline(b.slice(3), k)}</h2>;
        const lines = b.split('\n');
        if (lines.every((l) => l.startsWith('- '))) return <ul key={k}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2), `${k}-${j}`)}</li>)}</ul>;
        return <p key={k}>{lines.flatMap((l, j) => (j ? [<br key={`br${j}`} />, ...inline(l, `${k}-${j}`)] : inline(l, `${k}-${j}`)))}</p>;
      })}
    </div>
  );
}
