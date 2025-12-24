import { IsArray, IsString, IsOptional, IsNumber, IsBoolean, ValidateNested, IsIn, Min, Max, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for individual chat message
 */
export class ChatMessageDto {
    @IsIn(['user', 'assistant', 'system'])
    role: 'user' | 'assistant' | 'system';

    @IsString()
    content: string;
}

/**
 * DTO for AI Chat request
 * 
 * @example
 * {
 *   "messages": [
 *     { "role": "user", "content": "Hello, how are you?" }
 *   ],
 *   "model": "gemini-2.5-flash",
 *   "maxTokens": 1024,
 *   "temperature": 0.7
 * }
 */
export class AIChatRequestDto {
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one message is required' })
    @ValidateNested({ each: true })
    @Type(() => ChatMessageDto)
    messages: ChatMessageDto[];

    @IsOptional()
    @IsString()
    model?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(4096)
    maxTokens?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(2)
    temperature?: number;

    @IsOptional()
    @IsBoolean()
    stream?: boolean;
}
