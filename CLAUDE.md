# brand-ops

하우파파/누씨오 브랜드 통합 운영 시스템

## 기술 스택
- Next.js (App Router, Server Components)
- TypeScript (strict, no any)
- Prisma + PostgreSQL (Railway)
- NextAuth (Credentials, JWT)
- Zustand (클라이언트 상태)
- shadcn/ui + Tailwind CSS v4
- Recharts (차트)

## 코딩 규칙
- TypeScript strict mode, `any` 금지
- 0값 처리: `??` 사용, `||` 지양
- shadcn/ui 컴포넌트 우선 사용
- 환경변수는 `.env`만, 하드코딩 절대 금지
- API 키는 서버사이드만
- try-catch 필수
- `.backup`, `.old`, `_fixed` 파일 생성 금지
- 네이밍: 컴포넌트 PascalCase, 변수 camelCase, 상수 UPPER_SNAKE_CASE

## 빌드 & 실행
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npx prisma migrate dev  # DB 마이그레이션
npx prisma db seed      # 시드 데이터
```

## 채널 수수료
- 카페24: 3.5%
- 네이버: 5.5%
- 쿠팡: 15%
- 쿠팡 로켓: 35%
- 큐텐: 10%
- 아마존: 15%

## 브랜드
- 하우파파 (howpapa): #f97316
- 누씨오 (nucio): #22c55e
