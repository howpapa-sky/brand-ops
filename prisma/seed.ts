import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 브랜드 2개
  const howpapa = await prisma.brand.upsert({
    where: { code: 'howpapa' },
    update: {},
    create: {
      code: 'howpapa',
      name: '하우파파',
      displayName: 'HOWPAPA',
      color: '#f97316',
    },
  })
  console.log(`Brand: ${howpapa.name}`)

  const nucio = await prisma.brand.upsert({
    where: { code: 'nucio' },
    update: {},
    create: {
      code: 'nucio',
      name: '누씨오',
      displayName: 'NUCIO',
      color: '#22c55e',
    },
  })
  console.log(`Brand: ${nucio.name}`)

  // 사용자 2명
  const hashedPassword = await bcrypt.hash('changeme123', 10)

  await prisma.user.upsert({
    where: { email: 'kai@howpapa.com' },
    update: {},
    create: {
      email: 'kai@howpapa.com',
      name: '카이',
      role: 'admin',
      password: hashedPassword,
    },
  })
  console.log('User: 카이')

  await prisma.user.upsert({
    where: { email: 'minkyung@howpapa.com' },
    update: {},
    create: {
      email: 'minkyung@howpapa.com',
      name: '민경',
      role: 'admin',
      password: hashedPassword,
    },
  })
  console.log('User: 민경')

  // 채널 설정 6개
  const channels = [
    { channel: 'cafe24', channelName: '카페24 (자사몰)', feeRate: 3.5 },
    { channel: 'naver', channelName: '네이버 스마트스토어', feeRate: 5.5 },
    { channel: 'coupang', channelName: '쿠팡 마켓플레이스', feeRate: 15 },
    { channel: 'coupang_rocket', channelName: '쿠팡 로켓배송', feeRate: 35 },
    { channel: 'qoo10', channelName: '큐텐', feeRate: 10 },
    { channel: 'amazon', channelName: '아마존', feeRate: 15 },
  ]

  for (const ch of channels) {
    await prisma.channelSetting.upsert({
      where: { channel: ch.channel },
      update: {},
      create: ch,
    })
    console.log(`Channel: ${ch.channelName}`)
  }

  // 이익 계산 설정 2개
  await prisma.profitSetting.upsert({
    where: { brandCode: 'howpapa' },
    update: {},
    create: {
      brandCode: 'howpapa',
      vatEnabled: true,
      vatRate: 10.0,
      fixedCosts: [],
      variableCosts: [],
    },
  })

  await prisma.profitSetting.upsert({
    where: { brandCode: 'nucio' },
    update: {},
    create: {
      brandCode: 'nucio',
      vatEnabled: true,
      vatRate: 10.0,
      fixedCosts: [],
      variableCosts: [],
    },
  })
  console.log('ProfitSettings created')

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
