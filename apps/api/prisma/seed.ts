import { PrismaClient, PortionUnitCode } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const foods = [
  { name: 'Nasi Putih', key: 'nasi_putih', unit: PortionUnitCode.bowl, nutrition: [130, 2.4, 0.3, 28.2, 0.1, 0.4, 1] },
  { name: 'Nasi Goreng', key: 'nasi_goreng', unit: PortionUnitCode.plate, nutrition: [215, 5.6, 7.8, 30.1, 3.2, 1.1, 420] },
  { name: 'Mie Goreng', key: 'mie_goreng', unit: PortionUnitCode.plate, nutrition: [190, 5.2, 6.4, 28.3, 2.5, 1.4, 510] },
  { name: 'Ayam Goreng', key: 'ayam_goreng', unit: PortionUnitCode.piece, nutrition: [260, 24, 17, 4.5, 0.2, 0, 620] },
  { name: 'Telur', key: 'telur', unit: PortionUnitCode.piece, nutrition: [155, 13, 11, 1.1, 1.1, 0, 124] },
  { name: 'Telur Rebus', key: 'telur_rebus', unit: PortionUnitCode.piece, nutrition: [155, 13, 11, 1.1, 1.1, 0, 124] },
  { name: 'Telur Dadar', key: 'telur_dadar', unit: PortionUnitCode.piece, nutrition: [205, 12, 16, 2.2, 1.2, 0, 220] },
  { name: 'Telur Balado', key: 'telur_balado', unit: PortionUnitCode.piece, nutrition: [185, 11, 13, 5.5, 2.5, 0.5, 360] },
  { name: 'Sosis', key: 'sosis', unit: PortionUnitCode.piece, nutrition: [301, 11.3, 26.4, 1.9, 0.5, 0, 1100] },
  { name: 'Saus Tomat', key: 'saus_tomat', unit: PortionUnitCode.tablespoon, nutrition: [112, 1.3, 0.2, 26.1, 22.8, 0.3, 907] },
  { name: 'Bumbu Kacang', key: 'bumbu_kacang', unit: PortionUnitCode.tablespoon, nutrition: [350, 13, 24, 20, 8, 4, 600] },
  { name: 'Sate Daging', key: 'sate_daging', unit: PortionUnitCode.piece, nutrition: [280, 24, 18, 6, 2, 0.5, 420] },
  { name: 'Beef Steak', key: 'beef_steak', unit: PortionUnitCode.gram, nutrition: [250, 27, 15, 0, 0, 0, 60] },
  { name: 'Cooked Carrot', key: 'cooked_carrot', unit: PortionUnitCode.gram, nutrition: [35, 0.8, 0.2, 8.2, 3.5, 2.8, 58] },
  { name: 'Roti', key: 'roti', unit: PortionUnitCode.piece, nutrition: [265, 9, 3.2, 49, 5, 2.7, 490] },
  { name: 'Salad', key: 'salad', unit: PortionUnitCode.bowl, nutrition: [80, 2.5, 4.1, 9.8, 3.2, 3, 180] },
  { name: 'Burger', key: 'burger', unit: PortionUnitCode.piece, nutrition: [295, 17, 14, 30, 6, 2, 540] },
  { name: 'Pizza', key: 'pizza', unit: PortionUnitCode.piece, nutrition: [266, 11, 10, 33, 4, 2.3, 598] },
  { name: 'Apple', key: 'apple', unit: PortionUnitCode.piece, nutrition: [52, 0.3, 0.2, 14, 10, 2.4, 1] },
  { name: 'Banana', key: 'banana', unit: PortionUnitCode.piece, nutrition: [89, 1.1, 0.3, 23, 12, 2.6, 1] },
  { name: 'Milk', key: 'milk', unit: PortionUnitCode.cup, nutrition: [61, 3.2, 3.3, 4.8, 5, 0, 43] },
  { name: 'Coffee with Sugar', key: 'coffee_sugar', unit: PortionUnitCode.cup, nutrition: [40, 0.2, 0, 10, 9.5, 0, 5] }
] as const;

const extraAliases: Record<string, string[]> = {
  nasi_putih: ['white rice', 'steamed rice', 'plain rice'],
  bumbu_kacang: ['peanut sauce', 'groundnut sauce', 'satay sauce'],
  sate_daging: ['satay', 'sate', 'beef satay', 'grilled meat skewers', 'satay skewer'],
  beef_steak: ['beef steak', 'steak', 'sirloin', 'beef'],
  cooked_carrot: ['carrot', 'cooked carrot', 'boiled carrot']
};

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'demo@nutriscan.ai' },
    update: {},
    create: { email: 'demo@nutriscan.ai', passwordHash }
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      fullName: 'Demo User',
      age: 28,
      gender: 'female',
      weightKg: 60,
      heightCm: 165,
      activityLevel: 'moderate',
      goal: 'healthy_eating'
    }
  });

  await prisma.userGoal.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, calories: 2000, protein: 100, carbs: 250, fat: 70 }
  });

  for (const food of foods) {
    const foodItem = await prisma.foodItem.upsert({
      where: { normalizedKey: food.key },
      update: {
        name: food.name,
        defaultUnit: food.unit,
        aliases: [food.name.toLowerCase(), food.key.replaceAll('_', ' '), ...(extraAliases[food.key] ?? [])]
      },
      create: {
        name: food.name,
        normalizedKey: food.key,
        aliases: [food.name.toLowerCase(), food.key.replaceAll('_', ' '), ...(extraAliases[food.key] ?? [])],
        defaultUnit: food.unit
      }
    });

    await prisma.foodNutrition.upsert({
      where: { foodItemId: foodItem.id },
      update: {
        calories: food.nutrition[0],
        protein: food.nutrition[1],
        fat: food.nutrition[2],
        carbs: food.nutrition[3],
        sugar: food.nutrition[4],
        fiber: food.nutrition[5],
        sodium: food.nutrition[6]
      },
      create: {
        foodItemId: foodItem.id,
        basisGrams: 100,
        calories: food.nutrition[0],
        protein: food.nutrition[1],
        fat: food.nutrition[2],
        carbs: food.nutrition[3],
        sugar: food.nutrition[4],
        fiber: food.nutrition[5],
        sodium: food.nutrition[6]
      }
    });
  }

  console.log('Seed complete. Demo account: demo@nutriscan.ai / Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
