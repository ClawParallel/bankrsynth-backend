import type { Metadata } from 'next'
import WalletProvider from '@/components/WalletProvider'
import Nav from '@/components/Nav'
import MatrixRain from '@/components/MatrixRain'
import './globals.css'

const DESCRIPTION =
  'SynthVirtual is an AI-native intelligence terminal for Base. AI synthesis, ' +
  'real-trading Arena, market intelligence, and autonomous agents. ' +
  'Powered by $SYNTH on Virtuals Protocol.'

export const metadata: Metadata = {
  metadataBase: new URL('https://synthterminal.app'),
  title: {
    default: 'SynthVirtual — AI Intelligence Terminal for Base',
    template: '%s — SynthVirtual',
  },
  description: DESCRIPTION,
  applicationName: 'SynthVirtual',
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
  openGraph: {
    type: 'website',
    siteName: 'SynthVirtual',
    title: 'SynthVirtual — AI Intelligence Terminal for Base',
    description: DESCRIPTION,
    url: 'https://synthterminal.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SynthVirtual — AI Intelligence Terminal for Base',
    description: DESCRIPTION,
  },
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
