'use client'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base, mainnet, optimism, arbitrum, polygon, bsc } from 'wagmi/chains'
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { useState } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import WalletAuthGate from './WalletAuthGate'
import { skaleBase } from '@/lib/chains'

// Native wagmi v3 connectors (RainbowKit's connectorsForWallets targets wagmi v2
// and silently fails to connect on v3). These actually fire the wallet prompt.
// WalletConnect (covers MetaMask mobile, Rainbow, Trust + hundreds of mobile
// wallets via QR/deep-link) requires NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: 'SynthTerminal' }),
  ...(projectId ? [walletConnect({ projectId, showQrModal: true })] : []),
]

const config = createConfig({
  chains: [base, skaleBase, mainnet, optimism, arbitrum, polygon, bsc],
  connectors,
  transports: {
    [base.id]:      http('https://mainnet.base.org'),
    [skaleBase.id]: http('https://skale-base.skalenodes.com/v1/base'),
    [mainnet.id]:   http(),
    [optimism.id]:  http(),
    [arbitrum.id]:  http(),
    [polygon.id]:   http(),
    [bsc.id]:       http(),
  },
  ssr: true,
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
          <WalletAuthGate />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
