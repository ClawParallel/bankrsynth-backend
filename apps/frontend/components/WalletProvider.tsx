'use client'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base, mainnet, optimism, arbitrum, polygon, bsc } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme, connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet, coinbaseWallet, injectedWallet,
  walletConnectWallet, rainbowWallet, trustWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { useState } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import WalletAuthGate from './WalletAuthGate'

// WalletConnect-based wallets (Rainbow, Trust, the WC QR option) require a free
// projectId from cloud.reown.com. MetaMask + Coinbase + injected work without it.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ''
const hasWc = projectId.length > 0

const connectors = connectorsForWallets(
  [
    { groupName: 'Popular', wallets: [metaMaskWallet, coinbaseWallet, injectedWallet] },
    ...(hasWc ? [{ groupName: 'More', wallets: [walletConnectWallet, rainbowWallet, trustWallet] }] : []),
  ],
  { appName: 'SynthTerminal', projectId: projectId || 'synthterminal' },
)

const config = createConfig({
  connectors,
  chains: [base, mainnet, optimism, arbitrum, polygon, bsc],
  transports: {
    [base.id]:     http('https://mainnet.base.org'),
    [mainnet.id]:  http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]:  http(),
    [bsc.id]:      http(),
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
