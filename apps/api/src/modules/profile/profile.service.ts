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

    const autoTargets = calculateTargets(dto.weightKg, dto.goal);
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

function calculateTargets(weightKg: number, goal: UpsertProfileDto['goal']) {
  const calorieBase = goal === 'lose_weight' ? 1800 : goal === 'gain_weight' ? 2400 : 2100;
  return {
    calories: calorieBase,
    protein: Math.round(weightKg * 1.6),
    carbs: Math.round((calorieBase * 0.5) / 4),
    fat: Math.round((calorieBase * 0.25) / 9)
  };
}
