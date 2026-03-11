CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');
CREATE TYPE "ActivityLevel" AS ENUM ('sedentary', 'light', 'moderate', 'active', 'very_active');
CREATE TYPE "GoalType" AS ENUM ('lose_weight', 'maintain', 'gain_weight', 'healthy_eating');
CREATE TYPE "MealCategory" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE "ScanStatus" AS ENUM ('uploaded', 'processed', 'saved');
CREATE TYPE "PortionUnitCode" AS ENUM ('gram', 'piece', 'bowl', 'plate', 'cup', 'tablespoon', 'teaspoon');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "UserProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "age" INTEGER NOT NULL,
  "gender" "Gender" NOT NULL,
  "weightKg" DOUBLE PRECISION NOT NULL,
  "heightCm" DOUBLE PRECISION NOT NULL,
  "activityLevel" "ActivityLevel" NOT NULL,
  "goal" "GoalType" NOT NULL,
  CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "UserGoal" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "UserGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "FoodItem" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "normalizedKey" TEXT NOT NULL UNIQUE,
  "aliases" TEXT[] NOT NULL,
  "category" TEXT,
  "defaultUnit" "PortionUnitCode" NOT NULL
);

CREATE TABLE "FoodNutrition" (
  "id" TEXT PRIMARY KEY,
  "foodItemId" TEXT NOT NULL UNIQUE,
  "basisGrams" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "sugar" DOUBLE PRECISION NOT NULL,
  "fiber" DOUBLE PRECISION NOT NULL,
  "sodium" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "FoodNutrition_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Scan" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "status" "ScanStatus" NOT NULL DEFAULT 'uploaded',
  "recognitionProvider" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Scan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ScanItem" (
  "id" TEXT PRIMARY KEY,
  "scanId" TEXT NOT NULL,
  "predictedName" TEXT NOT NULL,
  "normalizedKey" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "bboxX" DOUBLE PRECISION,
  "bboxY" DOUBLE PRECISION,
  "bboxWidth" DOUBLE PRECISION,
  "bboxHeight" DOUBLE PRECISION,
  "suggestedUnit" "PortionUnitCode" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScanItem_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MealEntry" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "scanId" TEXT UNIQUE,
  "category" "MealCategory" NOT NULL,
  "eatenAt" TIMESTAMP(3) NOT NULL,
  "imageUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MealEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MealEntry_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "MealItem" (
  "id" TEXT PRIMARY KEY,
  "mealEntryId" TEXT NOT NULL,
  "foodItemId" TEXT,
  "customName" TEXT NOT NULL,
  "normalizedKey" TEXT NOT NULL,
  "unit" "PortionUnitCode" NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "gramsResolved" DOUBLE PRECISION NOT NULL,
  "isEstimated" BOOLEAN NOT NULL DEFAULT TRUE,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "sugar" DOUBLE PRECISION NOT NULL,
  "fiber" DOUBLE PRECISION NOT NULL,
  "sodium" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "MealItem_mealEntryId_fkey" FOREIGN KEY ("mealEntryId") REFERENCES "MealEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MealItem_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "NutritionSnapshot" (
  "id" TEXT PRIMARY KEY,
  "mealEntryId" TEXT NOT NULL UNIQUE,
  "calories" DOUBLE PRECISION NOT NULL,
  "protein" DOUBLE PRECISION NOT NULL,
  "fat" DOUBLE PRECISION NOT NULL,
  "carbs" DOUBLE PRECISION NOT NULL,
  "sugar" DOUBLE PRECISION NOT NULL,
  "fiber" DOUBLE PRECISION NOT NULL,
  "sodium" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NutritionSnapshot_mealEntryId_fkey" FOREIGN KEY ("mealEntryId") REFERENCES "MealEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
