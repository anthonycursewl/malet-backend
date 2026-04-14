export type ModelMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
};

export type ModelToolCall = {
  name: string;
  arguments: string; // JSON string
};

export type ModelResponse =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; call: ModelToolCall }
  | { type: 'tool_result'; text: string };

export interface ModelClient {
  chat(messages: ModelMessage[], tools?: any[]): Promise<ModelResponse>;
  // Optionally continue a conversation with tool result
  chatWithToolResult?(
    messages: ModelMessage[],
    toolResult: any,
  ): Promise<ModelResponse>;
}
