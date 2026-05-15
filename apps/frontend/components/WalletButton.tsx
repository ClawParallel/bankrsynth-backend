'use client'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export default function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  const short = address ? `${address.slice(0,6)}...${address.slice(-4)}` : null

  if (isConnected && short) {
    return (
      <button
        className="wallet-btn connected"
        onClick={() => disconnect()}
        title="Click to disconnect"
      >
        ◈ {short}
      </button>
    )
  }

  return (
    <button
      className="wallet-btn"
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
    >
      {isPending ? '◈ CONNECTING...' : '◈ CONNECT WALLET'}
    </button>
  )
}
