import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { NotesService } from './notes.service';
import {
  NOTE_REPOSITORY_PORT,
  NoteRepository,
} from '../domain/ports/out/note.repository';
import { Note, noteExcerpt } from '../domain/entities/note.entity';

describe('NotesService', () => {
  let service: NotesService;
  let repository: jest.Mocked<NoteRepository>;

  const makeNote = () =>
    Note.create({
      user_id: 'user-1',
      title: 'Mi nota',
      content: 'Hola **mundo**',
    });

  beforeEach(async () => {
    repository = {
      save: jest.fn().mockImplementation(async (note: Note) => note),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn().mockImplementation(async (note: Note) => note),
      delete: jest.fn(),
      restore: jest.fn(),
      hardDelete: jest.fn().mockResolvedValue(undefined),
      findByTitle: jest.fn().mockResolvedValue(null),
      findTitles: jest.fn().mockResolvedValue([]),
      findLinkTargets: jest.fn().mockResolvedValue([]),
      replaceLinks: jest.fn().mockResolvedValue(undefined),
      findLinksBySource: jest.fn().mockResolvedValue([]),
      findBacklinks: jest.fn().mockResolvedValue([]),
      resolvePendingLinks: jest.fn().mockResolvedValue(0),
      findSourceNotesByTarget: jest.fn().mockResolvedValue([]),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: NOTE_REPOSITORY_PORT, useValue: repository },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
  });

  it('creates a note with defaults and trims the title', async () => {
    const note = await service.create('user-1', { title: '  Hola  ' });

    expect(note.getUserId()).toBe('user-1');
    expect(note.getTitle()).toBe('Hola');
    expect(note.getContent()).toBe('');
    expect(note.isPinned()).toBe(false);
    expect(repository.save).toHaveBeenCalled();
  });

  it('updates fields and bumps updated_at', async () => {
    const note = makeNote();
    repository.findById.mockResolvedValue(note);

    const updated = await service.update('user-1', note.getId(), {
      title: 'Nuevo título',
      content: '# Markdown',
      pinned: true,
    });

    expect(updated.getTitle()).toBe('Nuevo título');
    expect(updated.getContent()).toBe('# Markdown');
    expect(updated.isPinned()).toBe(true);
    expect(updated.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
      note.getUpdatedAt().getTime(),
    );
    expect(repository.update).toHaveBeenCalled();
  });

  it('passes search, take and cursor to the repository', async () => {
    repository.findMany.mockResolvedValue([]);

    await service.list({
      user_id: 'user-1',
      take: 10,
      cursor: 'note-1',
      search: '  receta  ',
    });

    expect(repository.findMany).toHaveBeenCalledWith({
      user_id: 'user-1',
      take: 10,
      cursor: 'note-1',
      search: 'receta',
    });
  });

  it('throws NotFound when the note does not belong to the user', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getById('user-2', 'note-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('soft deletes and restores', async () => {
    const note = makeNote();
    repository.findById.mockResolvedValue(note);

    const deleted = await service.softDelete('user-1', note.getId());
    expect(deleted.isDeleted()).toBe(true);

    const restored = await service.restore('user-1', note.getId());
    expect(restored.isDeleted()).toBe(false);
  });

  it('hard deletes only after finding the note', async () => {
    const note = makeNote();
    repository.findById.mockResolvedValue(note);

    await service.hardDelete('user-1', note.getId());

    expect(repository.hardDelete).toHaveBeenCalledWith(note.getId());
  });

  it('rejects a duplicated title for the same user', async () => {
    repository.findByTitle.mockResolvedValue(makeNote());

    await expect(
      service.create('user-1', { title: 'Mi nota' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('extracts wiki links and resolves target ids', async () => {
    repository.findTitles.mockResolvedValue([
      { id: 'note-2', title: 'Receta' },
    ]);

    const note = await service.create('user-1', {
      title: 'Índice',
      content: 'Mira [[Receta]] y [[Otra|alias]] y `[[Ignorado]]`',
    });

    expect(repository.replaceLinks).toHaveBeenCalledWith(
      'user-1',
      note.getId(),
      [
        { raw_title: 'Receta', alias: null, target_note_id: 'note-2' },
        { raw_title: 'Otra', alias: 'alias', target_note_id: null },
      ],
    );
  });

  it('returns incoming and outgoing links in the detail', async () => {
    const note = makeNote();
    const backlink = Note.create({
      user_id: 'user-1',
      title: 'Otra',
      content: '[[Mi nota]]',
    });

    repository.findById.mockResolvedValue(note);
    repository.findLinksBySource.mockResolvedValue([
      {
        source_note_id: note.getId(),
        target_note_id: 'note-2',
        raw_title: 'Otra',
        alias: null,
      },
    ]);
    repository.findBacklinks.mockResolvedValue([backlink]);

    const detail = await service.getDetail('user-1', note.getId());

    expect(detail.links).toHaveLength(1);
    expect(detail.backlinks[0].getTitle()).toBe('Otra');
  });

  it('delegates the link target search', async () => {
    repository.findLinkTargets.mockResolvedValue([
      { id: 'n1', title: 'Receta' },
    ]);

    const result = await service.linkTargets('user-1', '  receta  ', 10, 'n2');

    expect(result).toEqual([{ id: 'n1', title: 'Receta' }]);
    expect(repository.findLinkTargets).toHaveBeenCalledWith({
      user_id: 'user-1',
      search: 'receta',
      take: 10,
      exclude_id: 'n2',
    });
  });

  it('rewrites backlinks when a note is renamed (without touching code)', async () => {
    const note = Note.create({
      user_id: 'user-1',
      title: 'Vieja',
      content: 'Contenido',
    });
    const source = Note.create({
      user_id: 'user-1',
      title: 'Índice',
      content: '[[Vieja]] y [[Vieja|alias]] y `[[Vieja]]`',
    });

    repository.findById.mockResolvedValue(note);
    repository.update.mockImplementation(async (value: Note) => value);
    repository.findSourceNotesByTarget.mockResolvedValue([source]);

    await service.update('user-1', note.getId(), { title: 'Nueva' });

    expect(repository.findSourceNotesByTarget).toHaveBeenCalledWith(
      'user-1',
      note.getId(),
      'Vieja',
    );

    const updatedSource = repository.update.mock.calls.find(
      ([value]) => value.getId() === source.getId(),
    )?.[0];

    expect(updatedSource?.getContent()).toContain('[[Nueva]]');
    expect(updatedSource?.getContent()).toContain('[[Nueva|alias]]');
    expect(updatedSource?.getContent()).toContain('`[[Vieja]]`');
  });

  it('builds a summary without the full markdown content', () => {
    const note = Note.create({
      user_id: 'user-1',
      title: 'Receta',
      content: '# Receta\n\n- [ ] Comprar **harina**\n\n[Link](https://x.com)',
    });

    const summary = note.toSummary();

    expect(summary).not.toHaveProperty('content');
    expect(summary.excerpt).toContain('Receta');
    expect(summary.excerpt).toContain('harina');
    expect(summary.excerpt).not.toContain('**');
  });

  it('removes code blocks and headings from the excerpt', () => {
    const excerpt = noteExcerpt(
      '## Título\n\n```ts\nconst x = 1;\n```\n\nTexto final',
    );

    expect(excerpt).toContain('Título');
    expect(excerpt).toContain('Texto final');
    expect(excerpt).not.toContain('const');
    expect(excerpt).not.toContain('##');
  });
});
