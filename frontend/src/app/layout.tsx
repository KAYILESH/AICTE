import { Suspense, type ReactNode } from 'react'
import type { Metadata } from 'next'
import './globals.css'
import AppHeader from '../components/layout/AppHeader'
import AppFooter from '../components/layout/AppFooter'

export const metadata: Metadata = {
  title: 'AICTE Smart Complaint Management System',
  description:
    'SIH Prototype — Student portal for submitting and tracking complaints about technical education institutions. This is a demonstration system.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        <Suspense fallback={<header className="app-header" style={{ height: '4rem' }} />}>
          <AppHeader />
        </Suspense>

        <main style={{ flex: 1 }}>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </main>

        <AppFooter />
      </body>
    </html>
  )
}
