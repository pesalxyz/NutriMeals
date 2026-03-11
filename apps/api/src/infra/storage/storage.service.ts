import { Injectable } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface StoredFile {
  imageUrl: string;
  absolutePath: string;
}

@Injectable()
export class StorageService {
  async saveImage(file: Express.Multer.File): Promise<StoredFile> {
    const baseDir = process.env.LOCAL_UPLOAD_DIR ?? 'apps/api/uploads';
    await mkdir(baseDir, { recursive: true });

    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const absolutePath = join(baseDir, safeName);
    await writeFile(absolutePath, file.buffer);

    return {
      imageUrl: `/uploads/${safeName}`,
      absolutePath
    };
  }
}
