import { extractWikiLinks, rewriteWikiLinkTitle } from './wiki-links';

describe('wiki-links', () => {
  it('extracts titles and aliases and dedupes by title', () => {
    const links = extractWikiLinks(
      '[[Receta]] [[receta]] [[Otra|un alias]] [[Receta|otra cosa]]',
    );

    expect(links).toEqual([
      { raw_title: 'Receta', alias: null },
      { raw_title: 'Otra', alias: 'un alias' },
    ]);
  });

  it('ignores fenced code blocks and inline code', () => {
    const links = extractWikiLinks(
      '[[Real]]\n```ts\n[[Ignorado]]\n```\n`[[Inline]]`',
    );

    expect(links).toEqual([{ raw_title: 'Real', alias: null }]);
  });

  it('supports sections while keeping the title and alias', () => {
    const links = extractWikiLinks('[[Receta#Pasos|ver pasos]]');

    expect(links).toEqual([{ raw_title: 'Receta', alias: 'ver pasos' }]);
  });

  it('rewrites titles preserving aliases, sections and code', () => {
    const content = [
      '[[Vieja]]',
      '[[Vieja|alias]]',
      '[[Vieja#Sección]]',
      '`[[Vieja]]`',
      '```md',
      '[[Vieja]]',
      '```',
    ].join('\n');

    const next = rewriteWikiLinkTitle(content, 'Vieja', 'Nueva');

    expect(next).toContain('[[Nueva]]');
    expect(next).toContain('[[Nueva|alias]]');
    expect(next).toContain('[[Nueva#Sección]]');
    expect(next).toContain('`[[Vieja]]`');
    expect(next).toContain('```md\n[[Vieja]]\n```');
  });

  it('escapes regex characters in the old title', () => {
    const next = rewriteWikiLinkTitle(
      '[[C++]] y [[C++|lenguaje]]',
      'C++',
      'C++ moderno',
    );

    expect(next).toBe('[[C++ moderno]] y [[C++ moderno|lenguaje]]');
  });
});
