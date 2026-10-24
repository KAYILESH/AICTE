import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'AICTE Official Portal — RB & PGRC',
  description:
    'SIH Prototype — Secure portal for Regulation Bureau and Public Grievance Redressal Cell officials to manage and resolve student complaints.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
