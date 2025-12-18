import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

// ============ USE CASES - TOKENS ============
import { CREATE_CONVERSATION_USECASE } from './domain/ports/in/create-conversation.usecase';
import { GET_CONVERSATIONS_USECASE } from './domain/ports/in/get-conversations.usecase';
import { SEND_MESSAGE_USECASE } from './domain/ports/in/send-message.usecase';
import { GET_MESSAGES_USECASE } from './domain/ports/in/get-messages.usecase';
import { MARK_AS_READ_USECASE } from './domain/ports/in/mark-as-read.usecase';
import { MANAGE_KEYS_USECASE } from './domain/ports/in/manage-keys.usecase';

// ============ SERVICES ============
import { CreateConversationService } from './application/create-conversation.service';
import { GetConversationsService } from './application/get-conversations.service';
import { SendMessageService } from './application/send-message.service';
import { GetMessagesService } from './application/get-messages.service';
import { MarkAsReadService } from './application/mark-as-read.service';
import { ManageKeysService } from './application/manage-keys.service';

// ============ REPOSITORIES - TOKENS ============
import { CONVERSATION_REPOSITORY_PORT } from './domain/ports/out/conversation.repository';
import { PARTICIPANT_REPOSITORY_PORT } from './domain/ports/out/participant.repository';
import { MESSAGE_REPOSITORY_PORT } from './domain/ports/out/message.repository';
import { USER_KEY_REPOSITORY_PORT } from './domain/ports/out/user-key.repository';
import { PUBSUB_PORT } from './domain/ports/out/pubsub.port';

// ============ REPOSITORY ADAPTERS ============
import { ConversationRepositoryAdapter } from './infrastructure/persistence/conversation.repository.adapter';
import { ParticipantRepositoryAdapter } from './infrastructure/persistence/participant.repository.adapter';
import { MessageRepositoryAdapter } from './infrastructure/persistence/message.repository.adapter';
import { UserKeyRepositoryAdapter } from './infrastructure/persistence/user-key.repository.adapter';

// ============ PUBSUB ADAPTERS ============
import { InMemoryPubSubAdapter } from './infrastructure/pubsub/in-memory-pubsub.adapter';
import { RedisPubSubAdapter } from './infrastructure/pubsub/redis-pubsub.adapter';

// ============ WEBSOCKET GATEWAY ============
import { MessagingGateway } from './infrastructure/adapters/gateways/messaging.gateway';

// ============ CONTROLLERS ============
import { ConversationsController } from './infrastructure/adapters/controllers/conversations.controller';
import { MessagesController } from './infrastructure/adapters/controllers/messages.controller';
import { KeysController } from './infrastructure/adapters/controllers/keys.controller';

/**
 * Factory para determinar qué adaptador de PubSub usar en runtime.
 * 
 * - Si REDIS_HOST está configurado -> RedisPubSubAdapter (multi-servidor)
 * - Si no -> InMemoryPubSubAdapter (servidor único)
 */
const PubSubProvider = {
    provide: PUBSUB_PORT,
    useFactory: () => {
        if (process.env.REDIS_HOST) {
            console.log(`📡 Using Redis PubSub: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`);
            return new RedisPubSubAdapter();
        } else {
            console.log('📡 Using InMemory PubSub (single server mode)');
            return new InMemoryPubSubAdapter();
        }
    }
};


/**
 * Módulo de Mensajería
 * 
 * Proporciona funcionalidad de chat con encriptación E2E y WebSocket.
 * 
 * Arquitectura Hexagonal:
 * - domain/: Entidades, puertos (interfaces) - sin dependencias externas
 * - application/: Servicios que implementan casos de uso
 * - infrastructure/: Adaptadores (Prisma, PubSub, Controllers, WebSocket)
 * 
 * Para escalar a múltiples servidores:
 * 1. Configurar REDIS_HOST en variables de entorno
 * 2. El módulo automáticamente usará RedisPubSubAdapter
 * 
 * Variables de entorno:
 * - REDIS_HOST: Host de Redis (activa el modo multi-servidor)
 * - REDIS_PORT: Puerto de Redis (default: 6379)
 * - REDIS_PASSWORD: Contraseña de Redis (opcional)
 * - REDIS_DB: Base de datos de Redis (default: 0)
 * - WS_CORS_ORIGIN: Origen permitido para WebSocket (default: *)
 */
@Module({
    imports: [
        PrismaModule,
        AuthModule
    ],
    providers: [
        // ============ WEBSOCKET GATEWAY ============
        MessagingGateway,

        // ============ USE CASES ============
        {
            provide: CREATE_CONVERSATION_USECASE,
            useClass: CreateConversationService
        },
        {
            provide: GET_CONVERSATIONS_USECASE,
            useClass: GetConversationsService
        },
        {
            provide: SEND_MESSAGE_USECASE,
            useClass: SendMessageService
        },
        {
            provide: GET_MESSAGES_USECASE,
            useClass: GetMessagesService
        },
        {
            provide: MARK_AS_READ_USECASE,
            useClass: MarkAsReadService
        },
        {
            provide: MANAGE_KEYS_USECASE,
            useClass: ManageKeysService
        },

        // ============ REPOSITORIES ============
        {
            provide: CONVERSATION_REPOSITORY_PORT,
            useClass: ConversationRepositoryAdapter
        },
        {
            provide: PARTICIPANT_REPOSITORY_PORT,
            useClass: ParticipantRepositoryAdapter
        },
        {
            provide: MESSAGE_REPOSITORY_PORT,
            useClass: MessageRepositoryAdapter
        },
        {
            provide: USER_KEY_REPOSITORY_PORT,
            useClass: UserKeyRepositoryAdapter
        },

        // ============ PUBSUB (automático según env) ============
        PubSubProvider
    ],
    controllers: [
        ConversationsController,
        MessagesController,
        KeysController
    ],
    exports: [
        MessagingGateway,
        CONVERSATION_REPOSITORY_PORT,
        PARTICIPANT_REPOSITORY_PORT,
        MESSAGE_REPOSITORY_PORT,
        USER_KEY_REPOSITORY_PORT,
        PUBSUB_PORT
    ]
})
export class MessagingModule { }

