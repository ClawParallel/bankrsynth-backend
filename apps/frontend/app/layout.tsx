import type { Metadata } from 'next'
import WalletProvider from '@/components/WalletProvider'
import Nav from '@/components/Nav'
import MatrixRain from '@/components/MatrixRain'
import './globals.css'

export const metadata: Metadata = {
  title: 'BankrSynth Terminal',
  description: 'Autonomous token deployment and AI market analysis on Base',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <div className="scanlines" />
          <div className="vignette" />
          <MatrixRain />
          <Nav />
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
