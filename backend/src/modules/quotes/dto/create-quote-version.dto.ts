import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuotedProductDto } from './create-quote.dto';

export class CreateQuoteVersionDto {
  @IsOptional()
  @IsNumber()
  margin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  payment_conditions?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuotedProductDto)
  products?: CreateQuotedProductDto[];

  @IsOptional()
  @IsBoolean()
  include_tax?: boolean;
}
