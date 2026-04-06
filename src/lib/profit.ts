/**
 * 3단계 이익 계산
 */

/** 1단계: 매출총이익 = 매출 - 매출원가 - VAT */
export function calcGrossProfit(
  revenue: number,
  costOfGoods: number,
  vatRate = 10
): number {
  const vat = Math.round(revenue * (vatRate / (100 + vatRate)))
  return revenue - costOfGoods - vat
}

/** 2단계: 공헌이익 = 매출총이익 - 배송비 - 채널수수료 - 광고비 */
export function calcContributionProfit(
  grossProfit: number,
  shipping: number,
  channelFee: number,
  adSpend: number
): number {
  return grossProfit - shipping - channelFee - adSpend
}

/** 3단계: 순이익 = 공헌이익 - 고정비 */
export function calcNetProfit(
  contributionProfit: number,
  fixedCosts: number
): number {
  return contributionProfit - fixedCosts
}

/** 채널 수수료 계산 */
export function calcChannelFee(revenue: number, feeRate: number): number {
  return Math.round(revenue * (feeRate / 100))
}
