'use client'
import { useEffect, useState } from 'react'

function randHex(n: number) { return [...Array(n)].map(() => Math.floor(Math.random()*16).toString(16)).join('') }
function randHash() { return '0x' + randHex(8) + '...' }
function randAddr() { return '0x' + randHex(4) + '…' + randHex(4) }

interface TxEntry { hash: string; amount: string; to: string; pos: boolean }

export default function TxStream({ maxItems = 6 }: { maxItems?: number }) {
  const [items, setItems] = useState<TxEntry[]>([])

  useEffect(() => {
    const add = () => {
      const pos = Math.random() > 0.5
      const amount = (Math.random() * 9 + 0.01).toFixed(4)
      setItems(prev => [{ hash: randHash(), amount, to: randAddr(), pos }, ...prev].slice(0, maxItems))
    }
    add()
    const t = setInterval(add, 900)
    return () => clearInterval(t)
  }, [maxItems])

  return (
    <div style={{ height: '80px', overflow: 'hidden' }}>
      {items.map((tx, i) => (
        <div key={i} className="tx-item">
          <span className="tx-hash">{tx.hash}</span>
          <span className={`tx-amount ${tx.pos ? '' : 'neg'}`}>{tx.pos ? '+' : '-'}{tx.amount} ETH</span>
          <span className="tx-to">→ {tx.to}</span>
        </div>
      ))}
    </div>
  )
}
