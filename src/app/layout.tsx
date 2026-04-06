import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'
import { TooltipProvider } from '@/components/ui/tooltip'

export const metadata: Metadata = {
  title: 'brand-ops | 브랜드 통합 운영',
  description: '하우파파/누씨오 브랜드 통합 운영 시스템',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
      </head>
      <body className="min-h-full flex font-sans">
        <TooltipProvider>
          <Sidebar />
          <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 pb-20 md:pb-6">{children}</main>
          </div>
          <MobileNav />
        </TooltipProvider>
      </body>
    </html>
  )
}
