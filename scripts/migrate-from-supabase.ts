/**
 * Supabase → Railway PostgreSQL 데이터 마이그레이션
 *
 * 실행: npm run migrate:supabase
 */
import { PrismaClient } from '@prisma/client'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY 환경변수를 설정하세요.')
  process.exit(1)
}

const HEADERS: Record<string, string> = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

// Supabase brand_id → Railway brand mapping
const SB_BRAND_MAP: Record<string, string> = {
  '8c9b308b-01a4-4636-b4c2-fc5b8c6e6ca5': 'howpapa',
  'f2242fb3-a2e4-496e-a92d-6a511987ed94': 'nucio',
}

interface MigrationResult {
  table: string
  fetched: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const results: MigrationResult[] = []

// ─── Supabase REST 페이지네이션 fetch ───
async function fetchAll<T>(table: string, query = '', pageSize = 1000): Promise<T[]> {
  const all: T[] = []
  let offset = 0

  while (true) {
    const sep = query ? '&' : '?'
    const url = `${SUPABASE_URL}/${table}?select=*${query}${sep}limit=${pageSize}&offset=${offset}`
    const res = await fetch(url, { headers: HEADERS })

    if (!res.ok) {
      console.error(`  ❌ ${table} fetch 실패: ${res.status} ${res.statusText}`)
      break
    }

    const data = (await res.json()) as T[]
    if (data.length === 0) break
    all.push(...data)
    if (data.length < pageSize) break
    offset += pageSize
  }

  return all
}

// ─── 1. SKU Master ───
async function migrateSku() {
  console.log('\n📦 [1/5] SKU Master 이관...')
  const result: MigrationResult = {
    table: 'sku_master → Sku',
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  interface SbSku {
    sku_code: string
    product_name: string
    brand: string
    category: string | null
    cost_price: number | null
    selling_price: number | null
    barcode: string | null
    is_active: boolean
  }

  const skus = await fetchAll<SbSku>('sku_master')
  result.fetched = skus.length
  console.log(`  조회: ${skus.length}건`)

  // Railway Brand id lookup
  const brands = await prisma.brand.findMany()
  const brandMap = new Map(brands.map((b) => [b.code, b.id]))

  for (const sku of skus) {
    try {
      const brandId = brandMap.get(sku.brand)
      if (!brandId) {
        result.errors.push(`SKU ${sku.sku_code}: brand "${sku.brand}" 매핑 실패`)
        result.skipped++
        continue
      }

      await prisma.sku.upsert({
        where: { skuCode: sku.sku_code },
        update: {
          productName: sku.product_name,
          category: sku.category,
          costPrice: Math.round(sku.cost_price ?? 0),
          sellingPrice: Math.round(sku.selling_price ?? 0),
          barcode: sku.barcode,
          isActive: sku.is_active,
        },
        create: {
          brandId,
          skuCode: sku.sku_code,
          productName: sku.product_name,
          category: sku.category,
          costPrice: Math.round(sku.cost_price ?? 0),
          sellingPrice: Math.round(sku.selling_price ?? 0),
          barcode: sku.barcode,
          isActive: sku.is_active,
        },
      })
      result.created++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`SKU ${sku.sku_code}: ${msg}`)
      result.skipped++
    }
  }

  console.log(`  ✅ 완료: ${result.created}건 upsert, ${result.skipped}건 스킵`)
  results.push(result)
}

// ─── 2. SKU Cost History ───
async function migrateSkuCostHistory() {
  console.log('\n💰 [2/5] SKU Cost History 이관...')
  const result: MigrationResult = {
    table: 'sku_cost_history → SkuCostHistory',
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  interface SbCostHistory {
    id: string
    sku_id: string
    previous_cost: number | null
    new_cost: number
    change_reason: string | null
    effective_date: string
  }

  const history = await fetchAll<SbCostHistory>('sku_cost_history')
  result.fetched = history.length
  console.log(`  조회: ${history.length}건`)

  // Supabase sku_id → sku_code 매핑
  interface SbSkuLookup { id: string; sku_code: string }
  const sbSkus = await fetchAll<SbSkuLookup>('sku_master')
  const sbSkuMap = new Map(sbSkus.map((s) => [s.id, s.sku_code]))

  // Railway sku lookup
  const rSkus = await prisma.sku.findMany()
  const rSkuMap = new Map(rSkus.map((s) => [s.skuCode, s.id]))

  for (const h of history) {
    try {
      const skuCode = sbSkuMap.get(h.sku_id)
      if (!skuCode) {
        result.errors.push(`CostHistory: Supabase sku_id ${h.sku_id} 매핑 실패`)
        result.skipped++
        continue
      }

      const railwaySkuId = rSkuMap.get(skuCode)
      if (!railwaySkuId) {
        result.errors.push(`CostHistory: Railway SKU ${skuCode} 없음`)
        result.skipped++
        continue
      }

      await prisma.skuCostHistory.create({
        data: {
          skuId: railwaySkuId,
          previousCost: Math.round(h.previous_cost ?? 0),
          newCost: Math.round(h.new_cost),
          changeReason: h.change_reason,
          effectiveDate: new Date(h.effective_date),
        },
      })
      result.created++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`CostHistory ${h.id}: ${msg}`)
      result.skipped++
    }
  }

  console.log(`  ✅ 완료: ${result.created}건 생성, ${result.skipped}건 스킵`)
  results.push(result)
}

// ─── 3. Orders (2025-10-01 이후) ───
async function migrateOrders() {
  console.log('\n🛒 [3/5] Orders 이관 (2025-10-01 이후)...')
  const result: MigrationResult = {
    table: 'orders_raw → Order + OrderItem',
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  interface SbOrder {
    id: string
    channel: string
    order_id: string
    order_date: string
    product_name: string
    option_name: string | null
    quantity: number
    unit_price: number
    total_price: number
    shipping_fee: number
    channel_fee: number
    cost_price: number
    order_status: string
    buyer_name: string | null
    buyer_phone: string | null
    brand_id: string | null
    raw_data: Record<string, unknown> | null
  }

  const orders = await fetchAll<SbOrder>(
    'orders_raw',
    '&order_date=gte.2025-10-01&order=order_date.asc'
  )
  result.fetched = orders.length
  console.log(`  조회: ${orders.length}건`)

  // Railway Brand id lookup
  const brands = await prisma.brand.findMany()
  const brandMap = new Map(brands.map((b) => [b.code, b.id]))

  // 주문 그룹핑: channel + order_id의 base part
  // Supabase orders_raw는 주문 아이템 단위 → Order + OrderItem으로 변환
  // order_id 형태: "20251218-0000072-20251218-0000072-01" 또는 채널별 상이
  // 기본 order_id에서 뒤 아이템 번호 제거
  interface OrderGroup {
    channel: string
    channelOrderId: string
    orderDate: string
    status: string
    buyerName: string | null
    brandId: string
    items: {
      productName: string
      optionName: string | null
      quantity: number
      unitPrice: number
      totalPrice: number
      costPrice: number
    }[]
    totalAmount: number
    shippingFee: number
    channelFee: number
    rawData: Record<string, unknown> | null
  }

  const groupMap = new Map<string, OrderGroup>()

  for (const o of orders) {
    // brand 결정
    let brandCode = 'howpapa'
    if (o.brand_id) {
      brandCode = SB_BRAND_MAP[o.brand_id] ?? 'howpapa'
    }
    const brandId = brandMap.get(brandCode)
    if (!brandId) {
      result.skipped++
      continue
    }

    // 그룹 키: channel + base order id
    // cafe24: "20251218-0000072-20251218-0000072-01" → base: "20251218-0000072"
    // 다른 채널: 원본 order_id 사용
    let baseOrderId = o.order_id
    if (o.channel === 'cafe24' && o.order_id.includes('-')) {
      const parts = o.order_id.split('-')
      if (parts.length >= 2) {
        baseOrderId = `${parts[0]}-${parts[1]}`
      }
    }

    const groupKey = `${o.channel}::${baseOrderId}`

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        channel: o.channel,
        channelOrderId: baseOrderId,
        orderDate: o.order_date,
        status: o.order_status,
        buyerName: o.buyer_name,
        brandId,
        items: [],
        totalAmount: 0,
        shippingFee: Math.round(o.shipping_fee ?? 0),
        channelFee: 0,
        rawData: null, // 첫 번째만 저장
      })
    }

    const group = groupMap.get(groupKey)!
    group.items.push({
      productName: o.product_name,
      optionName: o.option_name,
      quantity: o.quantity ?? 1,
      unitPrice: Math.round(o.unit_price ?? 0),
      totalPrice: Math.round(o.total_price ?? 0),
      costPrice: Math.round(o.cost_price ?? 0),
    })
    group.totalAmount += Math.round(o.total_price ?? 0)
    group.channelFee += Math.round(o.channel_fee ?? 0)

    // raw_data는 첫 아이템의 것만 보관
    if (!group.rawData && o.raw_data) {
      group.rawData = o.raw_data
    }
  }

  console.log(`  그룹핑: ${groupMap.size}개 주문`)

  let count = 0
  for (const [, group] of groupMap) {
    try {
      const netAmount = group.totalAmount - group.channelFee

      const order = await prisma.order.upsert({
        where: {
          channel_channelOrderId: {
            channel: group.channel,
            channelOrderId: group.channelOrderId,
          },
        },
        update: {
          status: group.status,
          totalAmount: group.totalAmount,
          shippingFee: group.shippingFee,
          channelFee: group.channelFee,
          netAmount,
        },
        create: {
          brandId: group.brandId,
          channel: group.channel,
          channelOrderId: group.channelOrderId,
          orderDate: new Date(group.orderDate),
          status: group.status,
          buyerName: group.buyerName,
          totalAmount: group.totalAmount,
          shippingFee: group.shippingFee,
          channelFee: group.channelFee,
          netAmount,
          rawData: (group.rawData as Parameters<typeof prisma.order.create>[0]['data']['rawData']) ?? undefined,
        },
      })

      // OrderItems - 기존 삭제 후 재생성
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } })

      for (const item of group.items) {
        const profit = item.totalPrice - item.costPrice
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productName: item.productName,
            optionName: item.optionName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            costPrice: item.costPrice,
            profit,
          },
        })
      }

      result.created++
      count++
      if (count % 500 === 0) {
        console.log(`  진행: ${count}/${groupMap.size}`)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`Order ${group.channelOrderId}: ${msg.slice(0, 100)}`)
      result.skipped++
    }
  }

  console.log(`  ✅ 완료: ${result.created}개 주문 upsert, ${result.skipped}건 스킵`)
  results.push(result)
}

// ─── 4. Seeding Projects 백업 ───
async function backupSeedingProjects() {
  console.log('\n🌱 [4/5] Seeding Projects 백업...')
  const data = await fetchAll('seeding_projects')
  const backupDir = join(process.cwd(), 'scripts', 'backup')
  mkdirSync(backupDir, { recursive: true })
  writeFileSync(
    join(backupDir, 'seeding_projects.json'),
    JSON.stringify(data, null, 2)
  )
  console.log(`  ✅ ${data.length}건 → scripts/backup/seeding_projects.json`)
  results.push({
    table: 'seeding_projects (백업만)',
    fetched: data.length,
    created: data.length,
    updated: 0,
    skipped: 0,
    errors: [],
  })
}

// ─── 5. Seeding Influencers 백업 ───
async function backupSeedingInfluencers() {
  console.log('\n👤 [5/5] Seeding Influencers 백업...')
  const data = await fetchAll('seeding_influencers')
  const backupDir = join(process.cwd(), 'scripts', 'backup')
  mkdirSync(backupDir, { recursive: true })
  writeFileSync(
    join(backupDir, 'seeding_influencers.json'),
    JSON.stringify(data, null, 2)
  )
  console.log(`  ✅ ${data.length}건 → scripts/backup/seeding_influencers.json`)
  results.push({
    table: 'seeding_influencers (백업만)',
    fetched: data.length,
    created: data.length,
    updated: 0,
    skipped: 0,
    errors: [],
  })
}

// ─── Main ───
async function main() {
  console.log('🚀 Supabase → Railway 데이터 마이그레이션 시작')
  console.log('=' .repeat(50))

  await migrateSku()
  await migrateSkuCostHistory()
  await migrateOrders()
  await backupSeedingProjects()
  await backupSeedingInfluencers()

  console.log('\n' + '='.repeat(50))
  console.log('📊 마이그레이션 결과 리포트')
  console.log('='.repeat(50))

  for (const r of results) {
    console.log(`\n  📋 ${r.table}`)
    console.log(`     조회: ${r.fetched}건`)
    console.log(`     성공: ${r.created}건`)
    if (r.skipped > 0) console.log(`     스킵: ${r.skipped}건`)
    if (r.errors.length > 0) {
      console.log(`     에러:`)
      for (const err of r.errors.slice(0, 5)) {
        console.log(`       - ${err}`)
      }
      if (r.errors.length > 5) {
        console.log(`       ... 외 ${r.errors.length - 5}건`)
      }
    }
  }

  console.log('\n✅ 마이그레이션 완료!')
}

main()
  .catch((e) => {
    console.error('❌ 마이그레이션 실패:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
