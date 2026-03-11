import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sumNutrition } from '@nutriscan/domain';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { SaveMealDto } from './dto';

@Injectable()
export class MealsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(userId: string, dto: SaveMealDto) {
    const totals = sumNutrition(
      dto.items.map((item) => ({
        calories: item.calories,
        protein: item.protein,
        fat: item.fat,
        carbs: item.carbs,
        sugar: item.sugar,
        fiber: item.fiber,
        sodium: item.sodium
      }))
    );

    const meal = await this.prisma.mealEntry.create({
      data: {
        userId,
        scanId: dto.scanId,
        category: dto.category,
        eatenAt: new Date(dto.eatenAt),
        imageUrl: dto.imageUrl,
        items: {
          create: dto.items.map((item) => ({
            customName: item.name,
            normalizedKey: item.normalizedKey,
            unit: item.unit,
            quantity: item.quantity,
            gramsResolved: item.gramsResolved,
            isEstimated: item.isEstimated,
            calories: item.calories,
            protein: item.protein,
            fat: item.fat,
            carbs: item.carbs,
            sugar: item.sugar,
            fiber: item.fiber,
            sodium: item.sodium
          }))
        },
        snapshot: {
          create: totals
        }
      },
      include: { items: true, snapshot: true }
    });

    return meal;
  }

  async getDetail(userId: string, mealId: string) {
    const meal = await this.prisma.mealEntry.findFirst({
      where: { id: mealId, userId },
      include: { items: true, snapshot: true }
    });

    if (!meal) throw new NotFoundException('Meal not found');

    return meal;
  }
}
