import { ModelMessage } from './model-client.interface';

export interface MemoryService {
  getSessionContext(
    userId: string,
    sessionId: string,
    limit?: number,
  ): Promise<ModelMessage[]>;
  appendSessionMessages(
    userId: string,
    sessionId: string,
    messages: ModelMessage[],
  ): Promise<void>;
}
