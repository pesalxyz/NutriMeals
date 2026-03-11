import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infra/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ScanModule } from './modules/scan/scan.module';
import { MealsModule } from './modules/meals/meals.module';
import { HistoryModule } from './modules/history/history.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ProfileModule,
    UsersModule,
    ScanModule,
    MealsModule,
    HistoryModule,
    DashboardModule
  ]
})
export class AppModule {}
