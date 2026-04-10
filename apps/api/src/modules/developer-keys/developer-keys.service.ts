import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { generatePublicApiKey } from '../../common/utils/api-key.util';

@Injectable()
export class DeveloperKeysService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(ownerId: string, name: string) {
    const generated = generatePublicApiKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        ownerId,
        name,
        keyPrefix: generated.keyPrefix,
        keyHash: generated.keyHash
      }
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: generated.plainKey,
      status: apiKey.status,
      usageCount: apiKey.usageCount,
      createdAt: apiKey.createdAt
    };
  }

  async list(ownerId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' }
    });

    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      status: key.status,
      usageCount: key.usageCount,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      keyPreview: `${key.keyPrefix}_********`
    }));
  }

  async updateStatus(ownerId: string, keyId: string, status: 'active' | 'inactive') {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id: keyId, ownerId }
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }

    return this.prisma.apiKey.update({
      where: { id: existing.id },
      data: { status }
    });
  }
}
