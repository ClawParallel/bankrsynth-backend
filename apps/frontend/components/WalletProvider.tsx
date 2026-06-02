'use client'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base, mainnet, optimism, arbitrum, polygon, bsc } from 'wagmi/chains'
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { useState } from 'react'
import '@rainbow-me/rainbowkit/styles.css'

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

// MetaMask + any injected wallet, Coinbase Wallet, and WalletConnect (if projectId set).
// Defaults to Base but supports all major EVM chains.
const connectors = [
  injected(),
  coinbaseWallet({ appName: 'SynthTerminal' }),
  ...(wcProjectId ? [walletConnect({ projectId: wcProjectId })] : []),
]

const config = createConfig({
  chains: [base, mainnet, optimism, arbitrum, polygon, bsc],
  connectors,
  transports: {
    [base.id]:     http('https://mainnet.base.org'),
    [mainnet.id]:  http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]:  http(),
    [bsc.id]:      http(),
  },
})

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={base}
          theme={darkTheme({
            accentColor: '#00ff41',
            accentColorForeground: '#010a04',
            borderRadius: 'none',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
