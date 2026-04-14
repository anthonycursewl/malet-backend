export interface ToolResult {
  status: 'ok' | 'error';
  data?: any;
  error?: string;
}

export interface ToolRunner {
  execute(name: string, args: any, userId: string): Promise<ToolResult>;
}
