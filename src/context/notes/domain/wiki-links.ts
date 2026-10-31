import { MAX_NOTE_TITLE_LENGTH } from './constants';

export interface ParsedWikiLink {
  raw_title: string;
  alias: string | null;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Quita cercados de código y código inline antes de buscar enlaces. */
const stripCode = (markdown: string): string =>
  markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`\n]*`/g, ' ');

/**
 * Extrae enlaces wiki `[[Título]]` / `[[Título|alias]]`.
 * Ignora los que están dentro de código y deduplica por título.
 */
export function extractWikiLinks(markdown: string): ParsedWikiLink[] {
  const text = stripCode(markdown ?? '');
  const regex = /\[\[([^\[\]|#\n]+)(?:#([^\[\]|\n]+))?(?:\|([^\[\]\n]+))?\]\]/g;
  const seen = new Map<string, ParsedWikiLink>();

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const rawTitle = match[1].trim().slice(0, MAX_NOTE_TITLE_LENGTH);
    if (!rawTitle) continue;

    const key = rawTitle.toLowerCase();
    if (seen.has(key)) continue;

    const alias = match[3]?.trim().slice(0, MAX_NOTE_TITLE_LENGTH) || null;
    seen.set(key, { raw_title: rawTitle, alias });
  }

  return [...seen.values()];
}

/** Aplica un cambio solo fuera de bloques y spans de código. */
const mapOutsideCode = (
  content: string,
  change: (segment: string) => string,
): string => {
  let inFence = false;

  return content
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;

      // Protege los spans de código inline de la misma línea.
      return line
        .split(/(`[^`]*`)/g)
        .map((part, index) => (index % 2 === 1 ? part : change(part)))
        .join('');
    })
    .join('\n');
};

/**
 * Reescribe `[[Viejo]]`, `[[Viejo|alias]]` y `[[Viejo#sección]]` al renombrar
 * una nota, preservando alias y sección.
 */
export function rewriteWikiLinkTitle(
  content: string,
  oldTitle: string,
  newTitle: string,
): string {
  const trimmed = oldTitle.trim();
  if (!trimmed || trimmed === newTitle.trim()) return content;

  const regex = new RegExp(`\\[\\[${escapeRegExp(trimmed)}(?=[|#\\]])`, 'gi');

  return mapOutsideCode(content, (segment) =>
    segment.replace(regex, `[[${newTitle}`),
  );
}
