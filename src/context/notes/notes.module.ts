import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { NotesController } from './infrastructure/adapters/controllers/notes.controller';
import { PublicNotesController } from './infrastructure/adapters/controllers/public-notes.controller';
import { NOTE_REPOSITORY_PORT } from './domain/ports/out/note.repository';
import { NOTES_USECASE } from './domain/ports/in/notes.usecase';
import { NoteRepositoryAdapter } from './infrastructure/persistence/note.repository.adapter';
import { NotesService } from './application/notes.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotesController, PublicNotesController],
  providers: [
    {
      provide: NOTE_REPOSITORY_PORT,
      useClass: NoteRepositoryAdapter,
    },
    {
      provide: NOTES_USECASE,
      useClass: NotesService,
    },
  ],
})
export class NotesModule {}
