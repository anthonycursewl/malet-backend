import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  ModelClient,
  ModelMessage,
} from '../interfaces/model-client.interface';
import { MemoryService } from '../interfaces/memory.service.interface';
import { ToolRunner } from '../interfaces/tool-runner.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @Inject('MODEL_CLIENT') private readonly modelClient: ModelClient,
    @Inject('MEMORY_SERVICE') private readonly memoryService: MemoryService,
    @Inject('TOOL_RUNNER') private readonly toolRunner: ToolRunner,
  ) {}

  async handleMessage(
    user: { userId: string },
    text: string,
    sessionId?: string,
  ) {
    const sid = sessionId || uuidv4();
    // retrieve context
    const context = await this.memoryService.getSessionContext(
      user.userId,
      sid,
      20,
    );

    const messages: ModelMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant for a finance app.',
      },
      ...context,
      { role: 'user', content: text },
    ];

    const modelResp = await this.modelClient.chat(messages);

    if (modelResp.type === 'text') {
      // persist conversation
      await this.memoryService.appendSessionMessages(user.userId, sid, [
        { role: 'user', content: text },
        { role: 'assistant', content: modelResp.text },
      ]);
      return { reply: modelResp.text, sessionId: sid };
    }

    if (modelResp.type === 'tool_call') {
      // parse args
      let args: any = {};
      try {
        args = JSON.parse(modelResp.call.arguments);
      } catch (e) {
        return { reply: 'Invalid tool arguments' };
      }

      const toolResult = await this.toolRunner.execute(
        modelResp.call.name,
        args,
        user.userId,
      );

      // append the user query, tool call and tool result to memory
      await this.memoryService.appendSessionMessages(user.userId, sid, [
        { role: 'user', content: text },
        { role: 'assistant', content: `Invoked tool ${modelResp.call.name}` },
        { role: 'tool', content: JSON.stringify(toolResult) },
      ]);

      // Allow model to produce a final message given the tool result
      if (this.modelClient.chatWithToolResult) {
        const final = await this.modelClient.chatWithToolResult(
          messages.concat([{ role: 'assistant', content: 'Invoked tool' }]),
          toolResult,
        );
        if (final.type === 'text') {
          await this.memoryService.appendSessionMessages(user.userId, sid, [
            { role: 'assistant', content: final.text },
          ]);
          return { reply: final.text, toolResult, sessionId: sid };
        }
      }

      return { reply: JSON.stringify(toolResult), toolResult, sessionId: sid };
    }

    return { reply: 'Unhandled model response' };
  }
}
