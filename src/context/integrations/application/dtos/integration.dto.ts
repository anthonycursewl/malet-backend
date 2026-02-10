import {
  IsString,
  IsOptional,
  IsArray,
  IsUrl,
  MinLength,
} from 'class-validator';

/**
 * DTO for initiating an integration (authorization request)
 */
export class InitiateIntegrationDto {
  @IsString()
  @MinLength(1)
  provider: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsUrl()
  redirectUrl?: string;
}

/**
 * DTO for OAuth callback query parameters
 */
export class OAuthCallbackDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(1)
  state: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_description?: string;
}

/**
 * DTO for disconnecting an integration
 */
export class DisconnectIntegrationDto {
  @IsString()
  @MinLength(1)
  provider: string;

  @IsOptional()
  revokeTokens?: boolean;
}
