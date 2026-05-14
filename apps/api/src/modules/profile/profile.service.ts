import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { UpsertProfileDto } from './dto';

@Injectable()
export class ProfileService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const [profile, goal] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.userGoal.findUnique({ where: { userId } })
    ]);
    return { profile, goal };
  }

  async upsert(userId: string, dto: UpsertProfileDto) {
    const existingGoal = await this.prisma.userGoal.findUnique({ where: { userId } });
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: dto.fullName,
        age: dto.age,
        gender: dto.gender,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        activityLevel: dto.activityLevel,
        goal: dto.goal
      },
      update: {
        fullName: dto.fullName,
        age: dto.age,
        gender: dto.gender,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        activityLevel: dto.activityLevel,
        goal: dto.goal
      }
    });

    const autoTargets = calculateTargets({
      age: dto.age,
      gender: dto.gender,
      weightKg: dto.weightKg,
      heightCm: dto.heightCm,
      activityLevel: dto.activityLevel,
      goal: dto.goal
    });
    const targets = {
      calories: dto.targetCalories ?? existingGoal?.calories ?? autoTargets.calories,
      protein: dto.targetProtein ?? existingGoal?.protein ?? autoTargets.protein,
      carbs: dto.targetCarbs ?? existingGoal?.carbs ?? autoTargets.carbs,
      fat: dto.targetFat ?? existingGoal?.fat ?? autoTargets.fat
    };
    const goal = await this.prisma.userGoal.upsert({
      where: { userId },
      create: { userId, ...targets },
      update: targets
    });

    return { profile, goal };
  }
}

function calculateTargets(input: {
  age: number;
  gender: UpsertProfileDto['gender'];
  weightKg: number;
  heightCm: number;
  activityLevel: UpsertProfileDto['activityLevel'];
  goal: UpsertProfileDto['goal'];
}) {
  const bmr =
    input.gender === 'male'
      ? 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + 5
      : input.gender === 'female'
        ? 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age - 161
        : 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age - 78;

  const activityFactor: Record<UpsertProfileDto['activityLevel'], number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  const tdee = bmr * activityFactor[input.activityLevel];
  const calorieBase =
    input.goal === 'lose_weight'
      ? tdee - 400
      : input.goal === 'gain_weight'
        ? tdee + 300
        : tdee;
  const calories = clamp(Math.round(calorieBase), 1200, 4200);
  const proteinMultiplier = input.goal === 'lose_weight' ? 1.8 : input.goal === 'gain_weight' ? 1.7 : 1.6;
  const protein = clamp(Math.round(input.weightKg * proteinMultiplier), 60, 260);
  const fat = clamp(Math.round((calories * 0.25) / 9), 35, 140);
  const carbs = clamp(Math.round((calories - protein * 4 - fat * 9) / 4), 80, 520);

  return {
    calories,
    protein,
    carbs,
    fat
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
