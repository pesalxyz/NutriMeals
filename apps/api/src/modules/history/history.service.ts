import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, date?: string) {
    let start: Date | undefined;
    let end: Date | undefined;

    if (date) {
      start = new Date(`${date}T00:00:00.000Z`);
      end = new Date(`${date}T23:59:59.999Z`);
    }

    return this.prisma.mealEntry.findMany({
      where: {
        userId,
        ...(start && end ? { eatenAt: { gte: start, lte: end } } : {})
      },
      orderBy: { eatenAt: 'desc' },
      include: { snapshot: true }
    });
  }
}
