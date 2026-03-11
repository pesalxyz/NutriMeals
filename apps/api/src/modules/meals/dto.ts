import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import type { MealCategory, PortionUnitCode } from '@nutriscan/types';

const MEAL_CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const PORTION_UNITS: PortionUnitCode[] = ['gram', 'piece', 'bowl', 'plate', 'cup', 'tablespoon', 'teaspoon'];

class SaveMealItemDto {
  @IsString()
  name!: string;

  @IsString()
  normalizedKey!: string;

  @IsIn(PORTION_UNITS)
  unit!: PortionUnitCode;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gramsResolved!: number;

  @Type(() => Number)
  @IsNumber()
  calories!: number;

  @Type(() => Number)
  @IsNumber()
  protein!: number;

  @Type(() => Number)
  @IsNumber()
  fat!: number;

  @Type(() => Number)
  @IsNumber()
  carbs!: number;

  @Type(() => Number)
  @IsNumber()
  sugar!: number;

  @Type(() => Number)
  @IsNumber()
  fiber!: number;

  @Type(() => Number)
  @IsNumber()
  sodium!: number;

  @IsBoolean()
  isEstimated!: boolean;
}

export class SaveMealDto {
  @IsOptional()
  @IsString()
  scanId?: string;

  @IsIn(MEAL_CATEGORIES)
  category!: MealCategory;

  @IsDateString()
  eatenAt!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveMealItemDto)
  items!: SaveMealItemDto[];
}
