import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import type { ActivityLevel, Gender, GoalType } from '@nutriscan/types';

const GENDERS: Gender[] = ['male', 'female', 'other'];
const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOALS: GoalType[] = ['lose_weight', 'maintain', 'gain_weight', 'healthy_eating'];

export class UpsertProfileDto {
  @IsString()
  fullName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(120)
  age!: number;

  @IsIn(GENDERS)
  gender!: Gender;

  @Type(() => Number)
  @IsNumber()
  @Min(20)
  @Max(300)
  weightKg!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(100)
  @Max(250)
  heightCm!: number;

  @IsIn(ACTIVITY_LEVELS)
  activityLevel!: ActivityLevel;

  @IsIn(GOALS)
  goal!: GoalType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(800)
  @Max(6000)
  targetCalories?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(20)
  @Max(400)
  targetProtein?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(20)
  @Max(800)
  targetCarbs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(300)
  targetFat?: number;
}
