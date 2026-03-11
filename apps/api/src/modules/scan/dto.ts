import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested, IsIn } from 'class-validator';
import type { PortionUnitCode } from '@nutriscan/types';

const PORTION_UNITS: PortionUnitCode[] = ['gram', 'piece', 'bowl', 'plate', 'cup', 'tablespoon', 'teaspoon'];

export class ProcessScanDto {
  @IsOptional()
  @IsString()
  scanId?: string;

  @IsString()
  imageUrl!: string;
}

export class EditableItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  normalizedKey?: string;

  @IsIn(PORTION_UNITS)
  unit!: PortionUnitCode;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;
}

export class EstimateScanDto {
  @IsOptional()
  @IsString()
  scanId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EditableItemDto)
  items!: EditableItemDto[];
}
