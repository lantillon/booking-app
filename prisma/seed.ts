import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create 3 example services
  const service1 = await prisma.service.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Haircut',
      durationMinutes: 30,
      price: 35.00,
      isActive: true,
    },
  })

  const service2 = await prisma.service.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Haircut + Beard Trim',
      durationMinutes: 45,
      price: 50.00,
      isActive: true,
    },
  })

  const service3 = await prisma.service.upsert({
    where: { id: 3 },
    update: {},
    create: {
      id: 3,
      name: 'Full Service',
      durationMinutes: 60,
      price: 75.00,
      isActive: true,
    },
  })

  console.log('Created services:', { service1, service2, service3 })
  console.log('✅ Seeding completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

