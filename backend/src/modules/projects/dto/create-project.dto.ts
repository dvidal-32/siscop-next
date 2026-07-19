import { IsString, IsOptional } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  client_id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
