import { Inject, Injectable } from '@nestjs/common';
import { buildDailyProgress } from '@nutriscan/domain';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async dailySummary(userId: string, date?: string) {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const start = new Date(`${targetDate}T00:00:00.000Z`);
    const end = new Date(`${targetDate}T23:59:59.999Z`);

    const [meals, goals] = await Promise.all([
      this.prisma.mealEntry.findMany({
        where: { userId, eatenAt: { gte: start, lte: end } },
        include: { snapshot: true },
        orderBy: { eatenAt: 'desc' }
      }),
      this.prisma.userGoal.findUnique({ where: { userId } })
    ]);

    const progress = buildDailyProgress({
      entries: meals.map((meal) => ({
        calories: meal.snapshot?.calories ?? 0,
        protein: meal.snapshot?.protein ?? 0,
        fat: meal.snapshot?.fat ?? 0,
        carbs: meal.snapshot?.carbs ?? 0,
        sugar: meal.snapshot?.sugar ?? 0,
        fiber: meal.snapshot?.fiber ?? 0,
        sodium: meal.snapshot?.sodium ?? 0
      })),
      targets: {
        calories: goals?.calories ?? 2000,
        protein: goals?.protein ?? 100,
        carbs: goals?.carbs ?? 250,
        fat: goals?.fat ?? 70
      }
    });

    return {
      date: targetDate,
      ...progress,
      meals: meals.map((meal) => ({
        id: meal.id,
        category: meal.category,
        eatenAt: meal.eatenAt,
        imageUrl: meal.imageUrl,
        totals: meal.snapshot
      }))
    };
  }

  async recent(userId: string) {
    return this.prisma.scan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { items: true }
    });
  }
}
