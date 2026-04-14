import { Injectable } from '@nestjs/common';
import {
  ModelClient,
  ModelMessage,
  ModelResponse,
} from '../interfaces/model-client.interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * SimpleModelAdapter
 *
 * Placeholder model client for local development/testing. It does NOT call any
 * real LLM. It recognizes simple intents and returns either a text reply or a
 * tool_call object. Replace with a real model adapter (gpt-5-mini client) later.
 */
@Injectable()
export class SimpleModelAdapter implements ModelClient {
  async chat(messages: ModelMessage[]): Promise<ModelResponse> {
    const last = messages[messages.length - 1];
    const text = last.content.toLowerCase();

    if (text.includes('create transaction')) {
      // produce a tool call to create_transaction with minimal args
      const args = {
        account_id: 'default-account',
        name: 'transaction from agent',
        amount: 1.0,
        type: 'expense',
        currency_code: 'USD',
        tag_ids: [],
        dedup_key: uuidv4(),
      };
      return {
        type: 'tool_call',
        call: { name: 'create_transaction', arguments: JSON.stringify(args) },
      };
    }

    if (text.includes('balance')) {
      const args = { account_id: 'default-account' };
      return {
        type: 'tool_call',
        call: { name: 'get_balance', arguments: JSON.stringify(args) },
      };
    }

    // default: echo assistant
    return { type: 'text', text: `Echo: ${last.content}` };
  }

  async chatWithToolResult(
    messages: ModelMessage[],
    toolResult: any,
  ): Promise<ModelResponse> {
    // simple behavior: return a text stating the tool result
    return { type: 'text', text: `Tool result: ${JSON.stringify(toolResult)}` };
  }
}
