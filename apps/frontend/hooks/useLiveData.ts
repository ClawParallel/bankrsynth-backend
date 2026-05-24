'use client'
import { useState, useEffect } from 'react'

export function useLiveBlockNumber() {
  const [blockNumber, setBlockNumber] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBlock() {
      try {
        const res = await fetch('https://mainnet.base.org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        })
        const d = (await res.json()) as { result?: string }
        if (d.result) {
          setBlockNumber(parseInt(d.result, 16))
          setLoading(false)
        }
      } catch {
        // silently ignore RPC errors
      }
    }
    fetchBlock()
    const interval = setInterval(fetchBlock, 2000)
    return () => clearInterval(interval)
  }, [])

  return { blockNumber, loading }
}

type MarketGlobal = {
  totalMcap?: number
  vol24h?: number
  btcDominance?: number
  ethDominance?: number
  mcapChange24h?: number
  activeCryptos?: number
}

export function useLiveMarket() {
  const [data, setData] = useState<MarketGlobal | null>(null)

  useEffect(() => {
    async function fetchMarket() {
      try {
        const r = await fetch('/api/intel')
        const d = (await r.json()) as { global?: MarketGlobal }
        if (d.global) setData(d.global)
      } catch {
        // silently ignore fetch errors
      }
    }
    fetchMarket()
    const interval = setInterval(fetchMarket, 30000)
    return () => clearInterval(interval)
  }, [])

  return data
}
